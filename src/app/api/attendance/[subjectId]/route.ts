import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/attendance/[subjectId] — view attendance for a subject
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { subjectId } = await params;

    // Fetch subject with classroom info
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            crId: true,
            grId: true,
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    const classroom = subject.classroom;

    // Verify user is a member of the classroom
    const isCRorGR =
      classroom.crId === user.userId || classroom.grId === user.userId;

    if (!isCRorGR) {
      const rosterEntry = await db.rosterEntry.findFirst({
        where: {
          classroomId: classroom.id,
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

    // Fetch all attendance sessions for this subject (finalized only for students, all for CR/GR)
    const sessionWhere: Record<string, unknown> = {
      subjectId,
    };

    if (!isCRorGR) {
      sessionWhere.status = 'finalized';
    }

    const sessions = await db.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        markedBy: {
          select: { id: true, name: true, email: true },
        },
        records: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rosterEntries: {
                  where: { classroomId: classroom.id },
                  select: { rollNumber: true, fullRollDisplay: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conductedDate: 'desc' },
    });

    if (isCRorGR) {
      // CR/GR sees all students' attendance for this subject
      const rosterStudents = await db.rosterEntry.findMany({
        where: {
          classroomId: classroom.id,
          userId: { not: null },
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { rollNumber: 'asc' },
      });

      const totalClasses = sessions.length;

      const studentSummaries = rosterStudents.map((entry) => {
        let presentCount = 0;

        const sessionRecords = sessions.map((session) => {
          const record = session.records.find(
            (r) => r.studentId === entry.userId
          );
          const status = record?.status || 'present';

          if (status === 'present' || status === 'late') {
            presentCount++;
          }

          return {
            sessionId: session.id,
            conductedDate: session.conductedDate,
            status,
            markedBy: session.markedBy.name ?? session.markedBy.email ?? 'Unknown',
            sessionStatus: session.status,
          };
        });

        const percentage =
          totalClasses > 0
            ? Math.round((presentCount / totalClasses) * 100)
            : 0;

        return {
          studentId: entry.userId,
          rollNumber: entry.rollNumber,
          name: entry.user.name ?? entry.name ?? 'Unknown',
          totalClasses,
          presentCount,
          percentage,
          sessions: sessionRecords,
        };
      });

      return NextResponse.json({
        success: true,
        subject: {
          id: subject.id,
          name: subject.name,
          code: subject.code,
        },
        classroom: {
          id: classroom.id,
          name: classroom.name,
        },
        totalSessions: sessions.length,
        role: 'cr_or_gr',
        students: studentSummaries,
      });
    }

    // Regular student sees only their own records
    let presentCount = 0;
    const totalClasses = sessions.length;

    const sessionRecords = sessions.map((session) => {
      const record = session.records.find((r) => r.studentId === user.userId);
      const status = record?.status || 'present';

      if (status === 'present' || status === 'late') {
        presentCount++;
      }

      return {
        sessionId: session.id,
        conductedDate: session.conductedDate,
        status,
        markedBy: session.markedBy.name ?? session.markedBy.email ?? 'Unknown',
        sessionStatus: session.status,
      };
    });

    const percentage =
      totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    return NextResponse.json({
      success: true,
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
      },
      classroom: {
        id: classroom.id,
        name: classroom.name,
      },
      totalSessions: sessions.length,
      role: 'student',
      attendance: {
        totalClasses,
        presentCount,
        absentCount: totalClasses - presentCount,
        percentage,
        sessions: sessionRecords,
      },
    });
  } catch (error) {
    console.error('GET /api/attendance/[subjectId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
