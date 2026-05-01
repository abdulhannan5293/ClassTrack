import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/classrooms/[id]/roster — fetch roster for a classroom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: classroomId } = await params;

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

    // Fetch roster entries
    const roster = await db.rosterEntry.findMany({
      where: { classroomId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      roster: roster.map((entry) => ({
        id: entry.id,
        rollNumber: entry.rollNumber,
        fullRollDisplay: entry.fullRollDisplay,
        name: entry.name,
        userId: entry.userId,
        user: entry.user,
        claimedAt: entry.claimedAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/classrooms/[id]/roster error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
