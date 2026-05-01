import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { isClassroomMember, isClassroomManager } from '@/lib/classroom-helpers';

// GET /api/subjects?classroomId=xxx — list all subjects for a classroom
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId');

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'classroomId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify the classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify user is a member of this classroom
    const hasAccess = await isClassroomMember(db, user.userId, classroomId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    // Fetch all subjects for the classroom with attendance session count and assessment count
    const subjects = await db.subject.findMany({
      where: { classroomId },
      include: {
        _count: {
          select: {
            attendanceSessions: true,
            assessments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = subjects.map((subject) => ({
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
    }));

    return NextResponse.json({ success: true, subjects: result });
  } catch (error) {
    console.error('GET /api/subjects error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subjects — create a new subject (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, name, code, creditHours, type, teacherName, scheduleDays } = body;

    if (!classroomId || !name || !code) {
      return NextResponse.json(
        { success: false, error: 'classroomId, name, and code are required' },
        { status: 400 }
      );
    }

    // Verify the classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify requester is CR or GR
    const hasPermission = await isClassroomManager(db, user.userId, classroomId);
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Only the Class Representative or Girls' Representative can create subjects" },
        { status: 403 }
      );
    }

    // Validate & parse scheduleDays — accepts both strings ('Mon','Tue') and integers (1,2)
    const DAY_NAME_MAP: Record<string, number> = {
      mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
    };
    let parsedScheduleDays: number[] = [];
    if (scheduleDays !== undefined) {
      if (!Array.isArray(scheduleDays)) {
        return NextResponse.json(
          { success: false, error: 'scheduleDays must be an array of day names or numbers' },
          { status: 400 }
        );
      }
      for (const day of scheduleDays) {
        let numDay: number;
        if (typeof day === 'number') {
          numDay = day;
        } else if (typeof day === 'string') {
          numDay = DAY_NAME_MAP[day.toLowerCase().trim()];
        }
        if (!numDay || numDay < 1 || numDay > 7) {
          return NextResponse.json(
            { success: false, error: `Invalid scheduleDay "${day}". Use day names (Mon-Sun) or numbers (1-7).` },
            { status: 400 }
          );
        }
        parsedScheduleDays.push(numDay);
      }
    }

    const subject = await db.subject.create({
      data: {
        classroomId,
        name,
        code,
        creditHours: creditHours ?? 3,
        type: type ?? 'theory',
        teacherName: teacherName ?? null,
        scheduleDays: JSON.stringify(parsedScheduleDays),
      },
    });

    return NextResponse.json(
      {
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
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/subjects error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
