import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/results/[assessmentId] — get assessment details with results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { assessmentId } = await params;

    // Fetch assessment with classroom info
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        classroom: {
          select: { id: true, crId: true, grId: true },
        },
        subject: {
          select: { id: true, name: true, code: true, creditHours: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const isCRorGR =
      assessment.classroom.crId === user.userId ||
      assessment.classroom.grId === user.userId;

    if (!isCRorGR) {
      // Verify student is a member of the classroom
      const rosterEntry = await db.rosterEntry.findFirst({
        where: {
          classroomId: assessment.classroomId,
          userId: user.userId,
        },
      });

      if (!rosterEntry) {
        return NextResponse.json(
          { success: false, error: 'You are not a member of this classroom' },
          { status: 403 }
        );
      }

      // Students can only view published assessments
      if (!assessment.isPublished) {
        return NextResponse.json(
          { success: false, error: 'This assessment has not been published yet' },
          { status: 403 }
        );
      }

      // Return only the student's own result
      const studentResult = await db.result.findUnique({
        where: {
          assessmentId_studentId: {
            assessmentId,
            studentId: user.userId,
          },
        },
        select: {
          id: true,
          marksObtained: true,
          grade: true,
          remarks: true,
        },
      });

      // Get student's roster info for roll number
      const studentRoster = await db.rosterEntry.findFirst({
        where: {
          classroomId: assessment.classroomId,
          userId: user.userId,
        },
        select: {
          rollNumber: true,
          fullRollDisplay: true,
          name: true,
        },
      });

      return NextResponse.json({
        success: true,
        assessment: {
          id: assessment.id,
          type: assessment.type,
          name: assessment.name,
          totalMarks: assessment.totalMarks,
          dateConducted: assessment.dateConducted,
          isPublished: assessment.isPublished,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          subject: assessment.subject,
          uploadedBy: assessment.uploadedBy,
        },
        results: studentResult
          ? [
              {
                ...studentResult,
                student: {
                  name: studentRoster?.name || null,
                  rollNumber: studentRoster?.rollNumber || null,
                  fullRollDisplay: studentRoster?.fullRollDisplay || null,
                },
              },
            ]
          : [],
      });
    }

    // CR/GR: return all student results with student name and roll number
    const results = await db.result.findMany({
      where: { assessmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich results with roster roll numbers
    const classroomId = assessment.classroomId;
    const allRosterEntries = await db.rosterEntry.findMany({
      where: { classroomId },
      select: {
        userId: true,
        rollNumber: true,
        fullRollDisplay: true,
        name: true,
      },
    });

    const rosterByUser = new Map<string, (typeof allRosterEntries)[number]>();
    for (const entry of allRosterEntries) {
      if (entry.userId) {
        rosterByUser.set(entry.userId, entry);
      }
    }

    const enrichedResults = results.map((r) => {
      const roster = rosterByUser.get(r.studentId);
      return {
        id: r.id,
        marksObtained: r.marksObtained,
        grade: r.grade,
        remarks: r.remarks,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        student: {
          id: r.student.id,
          name: r.student.name,
          rollNumber: roster?.rollNumber || null,
          fullRollDisplay: roster?.fullRollDisplay || null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      assessment,
      results: enrichedResults,
    });
  } catch (error) {
    console.error('GET /api/results/[assessmentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/results/[assessmentId] — delete an unpublished assessment (CR or GR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { assessmentId } = await params;

    // Verify assessment exists and user is CR or GR
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        classroom: {
          select: { id: true, crId: true, grId: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const isCRorGR =
      assessment.classroom.crId === user.userId ||
      assessment.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can delete assessments' },
        { status: 403 }
      );
    }

    if (assessment.isPublished) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete a published assessment',
        },
        { status: 409 }
      );
    }

    // Delete the assessment and all associated results (cascade)
    await db.assessment.delete({
      where: { id: assessmentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/results/[assessmentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
