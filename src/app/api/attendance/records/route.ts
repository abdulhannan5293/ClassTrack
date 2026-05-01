import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/attendance/records?sessionId=xxx
// Returns attendance records for a session with roster entry info
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Fetch session with classroom info
    const session = await db.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        classroom: {
          select: { id: true, crId: true, grId: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of the classroom
    const isCRorGR =
      session.classroom.crId === user.userId ||
      session.classroom.grId === user.userId;

    if (!isCRorGR) {
      const rosterEntry = await db.rosterEntry.findFirst({
        where: {
          classroomId: session.classroomId,
          userId: user.userId,
        },
      });

      if (!rosterEntry) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }
    }

    // Only CR/GR can view records for marking
    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only CR or GR can view attendance records' },
        { status: 403 }
      );
    }

    // Fetch all roster entries for the classroom
    const rosterEntries = await db.rosterEntry.findMany({
      where: { classroomId: session.classroomId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Fetch existing records for this session
    const existingRecords = await db.attendanceRecord.findMany({
      where: { sessionId },
    });

    const recordMap = new Map(
      existingRecords.map((r) => [r.studentId, r])
    );

    // Combine roster entries with attendance records
    const records = rosterEntries
      .filter((entry) => entry.userId !== null)
      .map((entry) => {
        const record = recordMap.get(entry.userId!);
        return {
          rosterEntryId: entry.id,
          userId: entry.userId,
          rollNumber: entry.rollNumber,
          name: entry.name || entry.user?.name || 'Unknown',
          status: record?.status ?? 'present',
          recordId: record?.id ?? undefined,
        };
      });

    return NextResponse.json({
      success: true,
      records,
      sessionStatus: session.status,
    });
  } catch (error) {
    console.error('GET /api/attendance/records error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
