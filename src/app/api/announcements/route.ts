import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/announcements?classroomId=xxx
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

    // Fetch announcements (pinned first, then by date desc)
    const announcements = await db.announcement.findMany({
      where: { classroomId },
      include: {
        postedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      announcements: announcements.map((a) => ({
        ...a,
        postedBy: {
          ...a.postedBy,
          name: a.postedBy.name ?? a.postedBy.email ?? 'Unknown',
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/announcements error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements — create announcement (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, title, content, priority, isPinned, imageUrl } = body;

    // Reject oversized image payloads (>1MB base64 ≈ 1.3M characters)
    if (typeof imageUrl === 'string' && imageUrl.length > 1_300_000) {
      return NextResponse.json(
        { success: false, error: 'Image is too large. Please use an image under 1 MB or compress it before uploading.' },
        { status: 413 }
      );
    }

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
        { success: false, error: 'Only the CR or GR can post announcements' },
        { status: 403 }
      );
    }

    // Validate priority
    const validPriorities = ['normal', 'important', 'urgent'];
    const resolvedPriority = validPriorities.includes(priority) ? priority : 'normal';

    const markerRole = classroom.crId === user.userId ? 'cr' : 'gr';

    const announcement = await db.announcement.create({
      data: {
        classroomId,
        title: title.trim(),
        content: content.trim(),
        priority: resolvedPriority,
        isPinned: !!isPinned,
        postedById: user.userId,
        posterRole: markerRole,
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
      },
      include: {
        postedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      announcement: {
        ...announcement,
        postedBy: {
          ...announcement.postedBy,
          name: announcement.postedBy.name ?? announcement.postedBy.email ?? 'Unknown',
        },
      },
    });
  } catch (error) {
    console.error('POST /api/announcements error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('POST /api/announcements details:', { message, stack, body: { classroomId, title: title?.slice(0, 50), priority, isPinned, imageUrlLength: typeof imageUrl === 'string' ? imageUrl.length : 'none' } });
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
