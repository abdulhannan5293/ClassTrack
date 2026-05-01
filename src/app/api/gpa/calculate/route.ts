import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/gpa/calculate — calculate weighted GPA from grades array
// Body: { classroomId, grades: [{ subjectId, grade, creditHours? }] }
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { classroomId, grades } = body;

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'classroomId is required' },
        { status: 400 }
      );
    }

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json(
        { success: false, error: 'grades must be a non-empty array of { subjectId, grade, creditHours? }' },
        { status: 400 }
      );
    }

    // Validate each grade entry
    for (let i = 0; i < grades.length; i++) {
      const entry = grades[i];

      if (!entry.subjectId || typeof entry.subjectId !== 'string') {
        return NextResponse.json(
          { success: false, error: `grades[${i}].subjectId is required` },
          { status: 400 }
        );
      }

      if (!entry.grade || typeof entry.grade !== 'string') {
        return NextResponse.json(
          { success: false, error: `grades[${i}].grade is required` },
          { status: 400 }
        );
      }

      if (
        entry.creditHours !== undefined &&
        (typeof entry.creditHours !== 'number' ||
          entry.creditHours < 0 ||
          !Number.isInteger(entry.creditHours))
      ) {
        return NextResponse.json(
          { success: false, error: `grades[${i}].creditHours must be a non-negative integer if provided` },
          { status: 400 }
        );
      }
    }

    // Verify classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        gradeConfig: true,
        crId: true,
        grId: true,
        subjects: {
          select: {
            id: true,
            name: true,
            code: true,
            creditHours: true,
          },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify user is a member (CR, GR, or roster student)
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

    // Parse the grade_config JSON
    let gradeConfig: Record<string, number>;
    try {
      gradeConfig = JSON.parse(classroom.gradeConfig);
    } catch {
      // Fallback to default scale if config is malformed
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

    // Build a subject lookup map for credit hours fallback
    const subjectMap = new Map<
      string,
      { id: string; name: string; code: string; creditHours: number }
    >();
    for (const subject of classroom.subjects) {
      subjectMap.set(subject.id, subject);
    }

    // Calculate weighted GPA
    let totalWeightedPoints = 0;
    let totalCreditHours = 0;
    const subjectResults: Array<{
      subjectId: string;
      subjectName: string | null;
      subjectCode: string | null;
      grade: string;
      gradePoint: number;
      creditHours: number;
      weightedPoints: number;
      isUnknownGrade: boolean;
    }> = [];
    const warnings: Array<{ subjectId: string; grade: string; message: string }> = [];

    for (const entry of grades) {
      const gradeStr = entry.grade.trim();
      const subjectInfo = subjectMap.get(entry.subjectId);

      // Warn if subject doesn't belong to this classroom
      if (!subjectInfo) {
        warnings.push({
          subjectId: entry.subjectId,
          grade: gradeStr,
          message: `Subject "${entry.subjectId}" not found in this classroom`,
        });
      }

      // Determine credit hours: prefer explicitly provided, fall back to subject record
      const creditHours =
        entry.creditHours !== undefined
          ? entry.creditHours
          : subjectInfo?.creditHours ?? 3;

      // Look up grade point (case-sensitive lookup, then case-insensitive fallback)
      let gradePoint = gradeConfig[gradeStr];
      let isUnknownGrade = gradePoint === undefined;

      if (gradePoint === undefined) {
        // Try case-insensitive lookup
        const lowerGrade = gradeStr.toLowerCase();
        const matchedKey = Object.keys(gradeConfig).find(
          (k) => k.toLowerCase() === lowerGrade
        );

        if (matchedKey !== undefined) {
          gradePoint = gradeConfig[matchedKey];
          isUnknownGrade = false;
        } else {
          gradePoint = 0;
          warnings.push({
            subjectId: entry.subjectId,
            grade: gradeStr,
            message: `Grade "${gradeStr}" not found in the grade configuration. Treated as 0.0.`,
          });
        }
      }

      const weightedPoints = gradePoint * creditHours;
      totalWeightedPoints += weightedPoints;
      totalCreditHours += creditHours;

      subjectResults.push({
        subjectId: entry.subjectId,
        subjectName: subjectInfo?.name ?? null,
        subjectCode: subjectInfo?.code ?? null,
        grade: gradeStr,
        gradePoint,
        creditHours,
        weightedPoints,
        isUnknownGrade,
      });
    }

    const gpa =
      totalCreditHours > 0
        ? Math.round((totalWeightedPoints / totalCreditHours) * 100) / 100
        : 0;

    return NextResponse.json({
      success: true,
      classroomId,
      classroomName: classroom.name,
      gpa,
      totalCreditHours,
      totalWeightedPoints: Math.round(totalWeightedPoints * 100) / 100,
      subjectCount: grades.length,
      gradeConfig,
      subjects: subjectResults,
      warnings,
    });
  } catch (error) {
    console.error('POST /api/gpa/calculate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
