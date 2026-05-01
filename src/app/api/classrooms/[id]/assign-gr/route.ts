import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/classrooms/[id]/assign-gr — assign GR (CR only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: classroomId } = await params;

    // Verify classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify requester is CR
    if (classroom.crId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the Class Representative can assign a GR' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentUserId } = body;

    if (!studentUserId || typeof studentUserId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'studentUserId is required' },
        { status: 400 }
      );
    }

    // Verify CR is not assigning themselves
    if (studentUserId === user.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot assign yourself as GR' },
        { status: 400 }
      );
    }

    // Verify target is a claimed roster member of this classroom
    const rosterEntry = await db.rosterEntry.findFirst({
      where: {
        classroomId,
        userId: studentUserId,
      },
    });

    if (!rosterEntry) {
      return NextResponse.json(
        { success: false, error: 'This user is not a claimed member of this classroom' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Demote existing GR back to student (only if not CR of another classroom)
    if (classroom.grId && classroom.grId !== studentUserId) {
      const otherCrCount = await db.classroom.count({
        where: { crId: classroom.grId },
      });
      if (otherCrCount === 0) {
        await db.user.update({
          where: { id: classroom.grId },
          data: { role: 'student' },
        });
      }
    }

    // Update classroom grId
    await db.classroom.update({
      where: { id: classroomId },
      data: { grId: studentUserId },
    });

    // Update target user role to GR
    await db.user.update({
      where: { id: studentUserId },
      data: { role: 'gr' },
    });

    return NextResponse.json({
      success: true,
      message: 'GR assigned successfully',
      gr: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (error) {
    console.error('POST /api/classrooms/[id]/assign-gr error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/classrooms/[id]/assign-gr — remove GR (CR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: classroomId } = await params;

    // Verify classroom exists
    const classroom = await db.classroom.findUnique({
      where: { id: classroomId },
      select: { crId: true, grId: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Classroom not found' },
        { status: 404 }
      );
    }

    // Verify requester is CR
    if (classroom.crId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the Class Representative can remove the GR' },
        { status: 403 }
      );
    }

    if (!classroom.grId) {
      return NextResponse.json(
        { success: false, error: 'This classroom has no GR assigned' },
        { status: 400 }
      );
    }

    const formerGrId = classroom.grId;

    // Remove GR from classroom
    await db.classroom.update({
      where: { id: classroomId },
      data: { grId: null },
    });

    // Update former GR's role back to "student"
    // unless they are also CR of another classroom
    const otherCrCount = await db.classroom.count({
      where: {
        crId: formerGrId,
      },
    });

    if (otherCrCount === 0) {
      await db.user.update({
        where: { id: formerGrId },
        data: { role: 'student' },
      });
    }

    const formerGr = await db.user.findUnique({
      where: { id: formerGrId },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: 'GR removed successfully',
      formerGr: formerGr
        ? {
            id: formerGr.id,
            name: formerGr.name,
            email: formerGr.email,
            newRole: formerGr.role,
          }
        : null,
    });
  } catch (error) {
    console.error('DELETE /api/classrooms/[id]/assign-gr error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
