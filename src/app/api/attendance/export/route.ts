import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/attendance/export?subjectId=xxx&classroomId=yyy&startDate=...&endDate=...
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const classroomId = searchParams.get('classroomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!subjectId || !classroomId) {
      return NextResponse.json(
        { success: false, error: 'subjectId and classroomId are required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the classroom
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        crId: true,
        grId: true,
        cr: { select: { id: true, name: true } },
        gr: { select: { id: true, name: true } },
      },
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

    // Verify subject belongs to the classroom
    const subject = await db.subject.findFirst({
      where: { id: subjectId, classroomId },
      select: { id: true, name: true, code: true },
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found in this classroom' },
        { status: 404 }
      );
    }

    // Build session filter
    const sessionWhere: Record<string, unknown> = {
      classroomId,
      subjectId,
      status: 'finalized',
    };

    if (startDate) {
      const dateFilter: Record<string, string> = { gte: startDate };
      if (endDate) dateFilter.lte = endDate;
      sessionWhere.conductedDate = dateFilter;
    } else if (endDate) {
      sessionWhere.conductedDate = { lte: endDate };
    }

    // Fetch all finalized sessions for the subject
    const sessions = await db.attendanceSession.findMany({
      where: sessionWhere,
      include: {
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
        },
      },
      orderBy: { conductedDate: 'asc' },
    });

    // Get all roster students sorted by roll number
    const rosterStudents = await db.rosterEntry.findMany({
      where: {
        classroomId,
        userId: { not: null },
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    // Build per-student attendance map
    const totalClasses = sessions.length;
    const statusMap: Record<string, string> = {
      present: 'P',
      absent: 'A',
      late: 'L',
      excused: 'E',
    };

    const students = rosterStudents.map((entry) => {
      const records: Record<string, string> = {};

      let presentCount = 0;

      for (const session of sessions) {
        const record = session.records.find(
          (r) => r.studentId === entry.userId
        );
        const status = record ? record.status : 'present'; // Default to present
        records[session.conductedDate] = statusMap[status] || 'P';

        if (status === 'present' || status === 'late') {
          presentCount++;
        }
      }

      const percentage =
        totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

      return {
        rollNumber: entry.rollNumber,
        name: entry.name || entry.user?.name,
        records,
        totalClasses,
        presentCount,
        percentage,
      };
    });

    // Determine generatedBy name
    const generatedBy =
      user.userId === classroom.crId
        ? classroom.cr.name || 'CR'
        : user.userId === classroom.grId
          ? classroom.gr?.name || 'GR'
          : user.email;

    return NextResponse.json({
      success: true,
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
      },
      classroom: {
        id: classroomId,
        name: classroom.name,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        conductedDate: s.conductedDate,
      })),
      generatedBy,
      students,
    });
  } catch (error) {
    console.error('GET /api/attendance/export error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
