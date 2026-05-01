import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/polls — create poll (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, question, options, type, deadline } = body;

    if (!classroomId || !question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { success: false, error: 'classroomId, question, and at least 2 options are required' },
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

    const isCRorGR = classroom.crId === user.userId || classroom.grId === user.userId;
    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can create polls' },
        { status: 403 }
      );
    }

    const creatorRole = classroom.crId === user.userId ? 'cr' : 'gr';
    const resolvedType = type === 'multiple' ? 'multiple' : 'single';
    const resolvedDeadline = deadline ? new Date(deadline) : null;

    const poll = await db.poll.create({
      data: {
        classroomId,
        question: question.trim(),
        options: JSON.stringify(options.map((o: string) => o.trim())),
        type: resolvedType,
        deadline: resolvedDeadline,
        createdById: user.userId,
        creatorRole,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true } },
      },
    });

    return NextResponse.json({
      success: true,
      poll: {
        ...poll,
        createdBy: {
          ...poll.createdBy,
          name: poll.createdBy.name ?? poll.createdBy.email ?? 'Unknown',
        },
        options: JSON.parse(poll.options),
      },
    });
  } catch (error) {
    console.error('POST /api/polls error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/polls?classroomId=xxx
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

    // Auto-close expired polls
    await db.poll.updateMany({
      where: {
        classroomId,
        isClosed: false,
        deadline: { lt: new Date() },
      },
      data: { isClosed: true },
    });

    const polls = await db.poll.findMany({
      where: { classroomId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true } },
      },
      orderBy: [{ isClosed: 'asc' }, { createdAt: 'desc' }],
    });

    // Check if current user has voted on each poll
    const userVotes = await db.pollVote.findMany({
      where: {
        pollId: { in: polls.map((p) => p.id) },
        userId: user.userId,
      },
      select: { pollId: true, selectedOption: true },
    });

    const voteMap = new Map(userVotes.map((v) => [v.pollId, v.selectedOption]));

    return NextResponse.json({
      success: true,
      polls: polls.map((p) => ({
        ...p,
        options: JSON.parse(p.options),
        createdBy: {
          ...p.createdBy,
          name: p.createdBy.name ?? p.createdBy.email ?? 'Unknown',
        },
        userVote: voteMap.get(p.id) ?? null,
      })),
    });
  } catch (error) {
    console.error('GET /api/polls error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
