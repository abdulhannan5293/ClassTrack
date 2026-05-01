import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/results/publish — publish an assessment (CR or GR only, one-way gate)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { success: false, error: 'assessmentId is required' },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Only the CR or GR can publish assessments' },
        { status: 403 }
      );
    }

    if (assessment.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Assessment is already published' },
        { status: 409 }
      );
    }

    // Publish the assessment (one-way gate: cannot unpublish)
    const published = await db.assessment.update({
      where: { id: assessmentId },
      data: { isPublished: true },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { results: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment published successfully',
      assessment: published,
    });
  } catch (error) {
    console.error('POST /api/results/publish error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
