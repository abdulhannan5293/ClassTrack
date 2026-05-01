import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/results/assessments?classroomId=xxx
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

    if (isCRorGR) {
      // CR/GR: return all assessments (published + unpublished) with result counts
      const assessments = await db.assessment.findMany({
        where: { classroomId },
        include: {
          subject: {
            select: { id: true, name: true, code: true },
          },
          uploadedBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { results: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        assessments,
      });
    }

    // Students: return only published assessments with student's own result
    const assessments = await db.assessment.findMany({
      where: { classroomId, isPublished: true },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        results: {
          where: { studentId: user.userId },
          select: {
            id: true,
            marksObtained: true,
            grade: true,
            remarks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      assessments,
    });
  } catch (error) {
    console.error('GET /api/results/assessments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/results/assessments — create a new assessment (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, subjectId, type, name, totalMarks, dateConducted } = body;

    if (!classroomId || !subjectId || !type || !name || totalMarks === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'classroomId, subjectId, type, name, and totalMarks are required',
        },
        { status: 400 }
      );
    }

    const validTypes = ['mid_term', 'quiz', 'assignment', 'sessional'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (totalMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalMarks must be a positive number' },
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
        { success: false, error: 'Only the CR or GR can create assessments' },
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

    const uploaderRole = classroom.crId === user.userId ? 'cr' : 'gr';

    const assessment = await db.assessment.create({
      data: {
        classroomId,
        subjectId,
        type,
        name,
        totalMarks,
        dateConducted: dateConducted || null,
        uploadedById: user.userId,
        uploaderRole,
        isPublished: false,
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, assessment },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/results/assessments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
