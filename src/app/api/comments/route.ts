import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/comments — create comment
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, content, parentId } = body;

    if (!classroomId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'classroomId and content are required' },
        { status: 400 }
      );
    }

    // Verify user is a member
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    const isCRorGR = classroom.crId === user.userId || classroom.grId === user.userId;
    if (!isCRorGR) {
      const rosterEntry = await db.rosterEntry.findFirst({
        where: { classroomId, userId: user.userId },
      });
      if (!rosterEntry) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }
    }

    // If parentId, verify parent comment exists
    if (parentId) {
      const parent = await db.comment.findFirst({
        where: { id: parentId, classroomId },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    const comment = await db.comment.create({
      data: {
        classroomId,
        content: content.trim(),
        parentId: parentId || null,
        createdById: user.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        createdBy: {
          ...comment.createdBy,
          name: comment.createdBy.name ?? comment.createdBy.email ?? 'Unknown',
        },
        replyCount: comment._count.replies,
      },
    });
  } catch (error) {
    console.error('POST /api/comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/comments?classroomId=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'classroomId is required' },
        { status: 400 }
      );
    }

    // Verify classroom exists and user is a member
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    const isCRorGR = classroom.crId === user.userId || classroom.grId === user.userId;
    if (!isCRorGR) {
      const rosterEntry = await db.rosterEntry.findFirst({
        where: { classroomId, userId: user.userId },
      });
      if (!rosterEntry) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }
    }

    // Fetch all comments
    const comments = await db.comment.findMany({
      where: { classroomId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        replies: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Separate root comments and replies
    const rootComments = comments.filter((c) => !c.parentId);
    const totalComments = comments.length;

    return NextResponse.json({
      success: true,
      comments: rootComments.map((c) => ({
        ...c,
        createdBy: {
          ...c.createdBy,
          name: c.createdBy.name ?? c.createdBy.email ?? 'Unknown',
        },
        replies: c.replies.map((r) => ({
          ...r,
          createdBy: {
            ...r.createdBy,
            name: r.createdBy.name ?? r.createdBy.email ?? 'Unknown',
          },
        })),
      })),
      totalComments,
    });
  } catch (error) {
    console.error('GET /api/comments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
