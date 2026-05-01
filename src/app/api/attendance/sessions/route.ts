import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/attendance/sessions?classroomId=xxx&subjectId=yyy
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');
    const subjectId = searchParams.get('subjectId');

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
        where: {
          classroomId,
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

    // Build the where clause
    const where: Record<string, unknown> = { classroomId };
    if (subjectId) {
      where.subjectId = subjectId;
    }

    // Fetch sessions with record counts and marker name
    const sessions = await db.attendanceSession.findMany({
      where,
      include: {
        markedBy: {
          select: { id: true, name: true, email: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { records: true },
        },
      },
      orderBy: { conductedDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        ...s,
        markedBy: {
          ...s.markedBy,
          name: s.markedBy.name ?? s.markedBy.email ?? 'Unknown',
        },
      })),
    });
  } catch (error) {
    console.error('GET /api/attendance/sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/attendance/sessions — create a new attendance session (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, subjectId, conductedDate } = body;

    if (!classroomId || !subjectId || !conductedDate) {
      return NextResponse.json(
        { success: false, error: 'classroomId, subjectId, and conductedDate are required' },
        { status: 400 }
      );
    }

    // Verify classroom exists and user is CR or GR
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
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can create attendance sessions' },
        { status: 403 }
      );
    }

    // Verify subject belongs to the classroom
    const subject = await db.subject.findFirst({
      where: { id: subjectId, classroomId },
      select: { id: true },
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found in this classroom' },
        { status: 404 }
      );
    }

    // Check for existing session on same subject + date (UNIQUE constraint)
    const existingSession = await db.attendanceSession.findUnique({
      where: {
        subjectId_conductedDate: {
          subjectId,
          conductedDate,
        },
      },
    });

    if (existingSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'An attendance session already exists for this subject on this date',
        },
        { status: 409 }
      );
    }

    // Determine marker role
    const markerRole = classroom.crId === user.userId ? 'cr' : 'gr';

    // Get all roster students (claimed entries with userId) for this classroom
    const rosterStudents = await db.rosterEntry.findMany({
      where: {
        classroomId,
        userId: { not: null },
      },
      select: { userId: true },
    });

    // Create session with "present" records for all roster students
    const session = await db.attendanceSession.create({
      data: {
        classroomId,
        subjectId,
        conductedDate,
        markedById: user.userId,
        markerRole,
        status: 'draft',
        records: {
          create: rosterStudents.map((entry) => ({
            studentId: entry.userId!,
            status: 'present',
          })),
        },
      },
      include: {
        markedBy: {
          select: { id: true, name: true, email: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        records: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rosterEntries: {
                  where: { classroomId },
                  select: { rollNumber: true, fullRollDisplay: true },
                },
              },
            },
          },
          orderBy: { student: { name: 'asc' } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('POST /api/attendance/sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
