import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { isClassroomMember, isClassroomManager } from '@/lib/classroom-helpers';

// GET /api/subjects/[id] — get subject details by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Fetch subject with classroom info
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceSessions: true,
            assessments: true,
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

    // Verify user is a member of the subject's classroom
    const hasAccess = await isClassroomMember(db, user.userId, subject.classroomId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      subject: {
        id: subject.id,
        classroomId: subject.classroomId,
        name: subject.name,
        code: subject.code,
        creditHours: subject.creditHours,
        type: subject.type,
        teacherName: subject.teacherName,
        scheduleDays: JSON.parse(subject.scheduleDays),
        attendanceSessionCount: subject._count.attendanceSessions,
        assessmentCount: subject._count.assessments,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
      },
    });
  } catch (error) {
    console.error('GET /api/subjects/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/subjects/[id] — update subject (CR or GR only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Fetch the subject with classroom info
    const subject = await db.subject.findUnique({
      where: { id },
      select: { id: true, classroomId: true },
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Verify requester is CR or GR
    const hasPermission = await isClassroomManager(db, user.userId, subject.classroomId);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Only the Class Representative or Girls' Representative can update subjects" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, creditHours, type, teacherName, scheduleDays } = body;

    // Validate scheduleDays if provided
    if (scheduleDays !== undefined) {
      if (!Array.isArray(scheduleDays)) {
        return NextResponse.json(
          { success: false, error: 'scheduleDays must be an array of day numbers (1=Mon through 7=Sun)' },
          { status: 400 }
        );
      }
      for (const day of scheduleDays) {
        if (typeof day !== 'number' || day < 1 || day > 7) {
          return NextResponse.json(
            { success: false, error: 'Each scheduleDay must be an integer between 1 (Mon) and 7 (Sun)' },
            { status: 400 }
          );
        }
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (creditHours !== undefined) updateData.creditHours = creditHours;
    if (type !== undefined) updateData.type = type;
    if (teacherName !== undefined) updateData.teacherName = teacherName;
    if (scheduleDays !== undefined) updateData.scheduleDays = JSON.stringify(scheduleDays);

    const updatedSubject = await db.subject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      subject: {
        id: updatedSubject.id,
        classroomId: updatedSubject.classroomId,
        name: updatedSubject.name,
        code: updatedSubject.code,
        creditHours: updatedSubject.creditHours,
        type: updatedSubject.type,
        teacherName: updatedSubject.teacherName,
        scheduleDays: JSON.parse(updatedSubject.scheduleDays),
        createdAt: updatedSubject.createdAt,
        updatedAt: updatedSubject.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /api/subjects/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/subjects/[id] — delete subject (CR or GR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Fetch the subject with related counts and classroom info
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendanceSessions: true,
            assessments: true,
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

    // Verify requester is CR or GR
    const hasPermission = await isClassroomManager(db, user.userId, subject.classroomId);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Only the Class Representative or Girls' Representative can delete subjects" },
        { status: 403 }
      );
    }

    // Check if subject has attendance sessions or assessments
    const hasAttendanceSessions = subject._count.attendanceSessions > 0;
    const hasAssessments = subject._count.assessments > 0;

    if (hasAttendanceSessions || hasAssessments) {
      const details: string[] = [];
      if (hasAttendanceSessions) {
        details.push(`${subject._count.attendanceSessions} attendance session(s)`);
      }
      if (hasAssessments) {
        details.push(`${subject._count.assessments} assessment(s)`);
      }
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete subject: it has associated ${details.join(' and ')}. Please remove them first.`,
        },
        { status: 400 }
      );
    }

    // Delete the subject
    await db.subject.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/subjects/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
