import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/gpa/config/[classroomId] — return the grade_config for a classroom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { classroomId } = await params;

    // Verify classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        gradeConfig: true,
        crId: true,
        grId: true,
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify the user is a member (CR, GR, or roster student)
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

    // Parse the grade_config JSON string
    let gradeConfig: Record<string, number>;
    try {
      gradeConfig = JSON.parse(classroom.gradeConfig);
    } catch {
      gradeConfig = {
        A: 4.0,
        'A-': 3.7,
        'B+': 3.3,
        B: 3.0,
        'B-': 2.7,
        'C+': 2.3,
        C: 2.0,
        'C-': 1.7,
        D: 1.0,
        F: 0.0,
      };
    }

    return NextResponse.json({
      success: true,
      classroomId: classroom.id,
      classroomName: classroom.name,
      gradeConfig,
    });
  } catch (error) {
    console.error('GET /api/gpa/config/[classroomId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/gpa/config/[classroomId] — update the grade_config (CR or GR only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { classroomId } = await params;
    const body = await request.json();
    const { gradeConfig } = body;

    if (!gradeConfig || typeof gradeConfig !== 'object' || Array.isArray(gradeConfig)) {
      return NextResponse.json(
        { success: false, error: 'gradeConfig must be a valid JSON object mapping letter grades to grade points' },
        { status: 400 }
      );
    }

    // Validate that all values are non-negative numbers and keys are non-empty strings
    const entries = Object.entries(gradeConfig) as [string, unknown][];
    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'gradeConfig must contain at least one grade mapping' },
        { status: 400 }
      );
    }

    for (const [key, value] of entries) {
      if (typeof key !== 'string' || key.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `Invalid grade key: "${key}". Keys must be non-empty strings.` },
          { status: 400 }
        );
      }

      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: `Invalid grade point for "${key}". Values must be non-negative numbers.` },
          { status: 400 }
        );
      }
    }

    // Verify classroom exists and user is CR or GR
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        crId: true,
        grId: true,
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
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can update the grade configuration' },
        { status: 403 }
      );
    }

    // Store as sorted JSON string for consistency
    const sortedConfig: Record<string, number> = {};
    const sortedKeys = Object.keys(gradeConfig).sort();
    for (const key of sortedKeys) {
      sortedConfig[key] = gradeConfig[key] as number;
    }

    const updated = await db.classroom.update({
      where: { id: classroomId },
      data: {
        gradeConfig: JSON.stringify(sortedConfig),
      },
      select: {
        id: true,
        name: true,
        gradeConfig: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Grade configuration updated successfully',
      classroom: {
        id: updated.id,
        name: updated.name,
        gradeConfig: sortedConfig,
      },
    });
  } catch (error) {
    console.error('PUT /api/gpa/config/[classroomId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
