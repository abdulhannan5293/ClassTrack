import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { isClassroomMember } from '@/lib/classroom-helpers';
import { generateInviteCode } from '@/lib/normalization';

// GET /api/classrooms/[id] — classroom details with CR and GR names
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify user is a member of this classroom
    const hasAccess = await isClassroomMember(db, user.userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this classroom' },
        { status: 403 }
      );
    }

    const classroom = await db.classroom.findUnique({
      where: { id },
      include: {
        cr: {
          select: { id: true, name: true, email: true },
        },
        gr: {
          select: { id: true, name: true, email: true },
        },
        _count: { select: { rosterEntries: true, subjects: true } },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Count claimed entries
    const claimedCount = await db.rosterEntry.count({
      where: { classroomId: id, userId: { not: null } },
    });

    // Determine user role
    let userRole = 'member';
    if (classroom.crId === user.userId) userRole = 'cr';
    else if (classroom.grId === user.userId) userRole = 'gr';

    return NextResponse.json({
      success: true,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        department: classroom.department,
        sessionYear: classroom.sessionYear,
        semester: classroom.semester,
        semesterOrder: classroom.semesterOrder,
        inviteCode: classroom.inviteCode,
        gradeConfig: classroom.gradeConfig,
        crId: classroom.crId,
        crName: classroom.cr.name,
        grId: classroom.grId,
        grName: classroom.gr?.name ?? null,
        createdAt: classroom.createdAt,
        updatedAt: classroom.updatedAt,
        studentCount: classroom._count.rosterEntries,
        subjects: classroom._count.subjects,
        claimedCount,
        userRole,
      },
    });
  } catch (error) {
    console.error('GET /api/classrooms/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/classrooms/[id] — update classroom (name, invite code regeneration)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { name, regenerateInviteCode, semester, semesterOrder } = body;

    // Verify the classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { crId: true, grId: true, department: true, sessionYear: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Only CR can update classroom info
    if (classroom.crId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the Class Representative can update classroom settings' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // Update name
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Classroom name must be at least 1 character' },
          { status: 400 }
        );
      }
      updateData.name = trimmed;
    }

    // Update semester label
    if (semester !== undefined) {
      const trimmed = String(semester).trim();
      if (trimmed.length < 1) {
        return NextResponse.json(
          { success: false, error: 'Semester label must be at least 1 character' },
          { status: 400 }
        );
      }
      updateData.semester = trimmed;
    }

    // Update semester order
    if (semesterOrder !== undefined) {
      const order = Number(semesterOrder);
      if (!Number.isInteger(order) || order < 1) {
        return NextResponse.json(
          { success: false, error: 'Semester order must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.semesterOrder = order;
    }

    // Regenerate invite code
    if (regenerateInviteCode) {
      const newCode = generateInviteCode(classroom.department, classroom.sessionYear);
      updateData.inviteCode = newCode;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updated = await db.classroom.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      classroom: {
        id: updated.id,
        name: updated.name,
        inviteCode: updated.inviteCode,
        semester: updated.semester,
        semesterOrder: updated.semesterOrder,
      },
    });
  } catch (error) {
    console.error('PATCH /api/classrooms/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/[id] — delete classroom (CR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify the classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id },
      select: { crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Only the CR can delete
    if (classroom.crId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the Class Representative can delete this classroom' },
        { status: 403 }
      );
    }

    // If there's a GR, update their role back to student
    // (unless they are CR of another classroom)
    if (classroom.grId) {
      const grOtherCrCount = await db.classroom.count({
        where: {
          crId: classroom.grId,
          id: { not: id },
        },
      });

      if (grOtherCrCount === 0) {
        await db.user.update({
          where: { id: classroom.grId },
          data: { role: 'student' },
        });
      }
    }

    // Delete classroom (cascade will handle related data)
    await db.classroom.delete({ where: { id } });

    // Update CR's role back to student if not CR of other classrooms
    const crOtherClassroomCount = await db.classroom.count({
      where: { crId: user.userId },
    });

    if (crOtherClassroomCount === 0) {
      await db.user.update({
        where: { id: user.userId },
        data: { role: 'student' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Classroom deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/classrooms/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
