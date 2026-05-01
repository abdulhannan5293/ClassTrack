import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/attendance/my?classroomId=xxx&subjectId=yyy
// Returns the student's own attendance records for a subject
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

    // Fetch finalized sessions for the subject
    const sessionWhere: Record<string, unknown> = {
      classroomId,
      status: 'finalized',
    };
    if (subjectId) {
      sessionWhere.subjectId = subjectId;
    }

    const sessions = await db.attendanceSession.findMany({
      where: sessionWhere,
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        records: {
          where: { studentId: user.userId },
          select: { id: true, status: true },
        },
      },
      orderBy: { conductedDate: 'desc' },
    });

    // Map to student view format
    const records = sessions.map((session) => ({
      session: {
        id: session.id,
        conductedDate: session.conductedDate,
      },
      subject: {
        name: session.subject.name,
        code: session.subject.code,
      },
      status: session.records[0]?.status ?? 'present',
    }));

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('GET /api/attendance/my error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
