import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/notes?classroomId=xxx
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

    // Verify user is a member of the classroom
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

    const isCRorGR =
      classroom.crId === user.userId || classroom.grId === user.userId;

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

    // Fetch notes (pinned first, then by date desc)
    const notes = await db.note.findMany({
      where: { classroomId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      notes: notes.map((n) => ({
        ...n,
        createdBy: {
          ...n.createdBy,
          name: n.createdBy.name ?? n.createdBy.email ?? 'Unknown',
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notes — create note (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, title, content, colorTag, isPinned } = body;

    if (!classroomId || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'classroomId, title, and content are required' },
        { status: 400 }
      );
    }

    // Verify classroom exists and user is CR or GR
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    const isCRorGR =
      classroom.crId === user.userId || classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can create notes' },
        { status: 403 }
      );
    }

    // Validate colorTag
    const validColors = ['amber', 'teal', 'rose', 'emerald', 'violet'];
    const resolvedColor = validColors.includes(colorTag) ? colorTag : 'amber';

    const note = await db.note.create({
      data: {
        classroomId,
        title: title.trim(),
        content: content.trim(),
        colorTag: resolvedColor,
        isPinned: !!isPinned,
        createdById: user.userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      note: {
        ...note,
        createdBy: {
          ...note.createdBy,
          name: note.createdBy.name ?? note.createdBy.email ?? 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
