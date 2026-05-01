import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { generateInviteCode } from '@/lib/normalization';

// GET /api/classrooms — list all classrooms the user belongs to
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const userId = user.userId;

    // 1. Classrooms where user is CR
    const crClassrooms = await db.classroom.findMany({
      where: { crId: userId },
      include: {
        _count: { select: { rosterEntries: true } },
      },
    });

    // 2. Classrooms where user is GR
    const grClassrooms = await db.classroom.findMany({
      where: { grId: userId },
      include: {
        _count: { select: { rosterEntries: true } },
      },
    });

    // 3. Classrooms where user is a member via roster entry
    const memberClassrooms = await db.classroom.findMany({
      where: {
        rosterEntries: {
          some: { userId },
        },
        AND: [
          { crId: { not: userId } },
          { grId: { not: userId } },
        ],
      },
      include: {
        _count: { select: { rosterEntries: true } },
      },
    });

    // Build response with userRole for each
    const mapClassroom = (
      classroom: typeof crClassrooms[number],
      role: string
    ) => ({
      id: classroom.id,
      name: classroom.name,
      department: classroom.department,
      sessionYear: classroom.sessionYear,
      semester: classroom.semester,
      semesterOrder: classroom.semesterOrder,
      inviteCode: classroom.inviteCode,
      crId: classroom.crId,
      grId: classroom.grId,
      gradeConfig: classroom.gradeConfig,
      userRole: role,
      studentCount: classroom._count.rosterEntries,
      claimedCount: 0, // filled in below
    });

    const results = [
      ...crClassrooms.map((c) => mapClassroom(c, 'cr')),
      ...grClassrooms.map((c) => mapClassroom(c, 'gr')),
      ...memberClassrooms.map((c) => mapClassroom(c, 'member')),
    ];

    // Deduplicate by classroom ID, keeping the entry with the highest role priority (cr > gr > member)
    const deduped = new Map<string, (typeof results)[number]>();
    for (const entry of results) {
      if (!deduped.has(entry.id)) {
        deduped.set(entry.id, entry);
      }
    }
    const uniqueResults = Array.from(deduped.values());

    // Fetch claimed counts for all classroom ids at once
    if (uniqueResults.length > 0) {
      const classroomIds = uniqueResults.map((r) => r.id);
      const claimedCounts = await db.rosterEntry.groupBy({
        by: ['classroomId'],
        where: {
          classroomId: { in: classroomIds },
          userId: { not: null },
        },
        _count: { id: true },
      });

      const countMap = new Map(
        claimedCounts.map((c) => [c.classroomId, c._count.id])
      );
      for (const result of uniqueResults) {
        result.claimedCount = countMap.get(result.id) || 0;
      }
    }

    return NextResponse.json({ success: true, classrooms: uniqueResults });
  } catch (error) {
    console.error('GET /api/classrooms error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/classrooms — create a new classroom (verified student only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    // Verify the user is a verified student
    const existingUser = await db.user.findUnique({
      where: { id: user.userId },
      select: { isEmailVerified: true },
    });

    if (!existingUser || !existingUser.isEmailVerified) {
      return NextResponse.json(
        { success: false, error: 'Only verified students can create classrooms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, department, sessionYear } = body;

    if (!name || !department || !sessionYear) {
      return NextResponse.json(
        { success: false, error: 'name, department, and sessionYear are required' },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode(department, sessionYear);

    // Create classroom with user as CR and update user role
    const classroom = await db.classroom.create({
      data: {
        name,
        department: department,
        sessionYear,
        inviteCode,
        crId: user.userId,
      },
    });

    // Update user role to CR
    await db.user.update({
      where: { id: user.userId },
      data: { role: 'cr' },
    });

    // Auto-add CR to roster so they appear as claimed
    try {
      const crEmail = user.email || '';
      const crName = user.name || crEmail.split('@')[0] || 'CR';
      // Extract roll number from email pattern if available
      const emailPattern = user.emailPatternExtracted ? JSON.parse(user.emailPatternExtracted) : {};
      const crRollNumber = emailPattern.rollNumber
        ? String(emailPattern.rollNumber).padStart(3, '0')
        : '001';

      // Check if a roster entry with this roll number already exists
      const existingEntry = await db.rosterEntry.findUnique({
        where: {
          classroomId_rollNumber: { classroomId: classroom.id, rollNumber: crRollNumber },
        },
      });

      if (existingEntry) {
        // Claim the existing entry
        await db.rosterEntry.update({
          where: { id: existingEntry.id },
          data: {
            userId: user.userId,
            claimedAt: new Date(),
            name: existingEntry.name || crName,
          },
        });
      } else {
        // Create a new roster entry for the CR
        await db.rosterEntry.create({
          data: {
            classroomId: classroom.id,
            rollNumber: crRollNumber,
            fullRollDisplay: crRollNumber,
            name: crName,
            userId: user.userId,
            claimedAt: new Date(),
          },
        });
      }
    } catch (rosterErr) {
      // Non-blocking: roster auto-add failure should not prevent classroom creation
      console.error('Warning: Could not auto-add CR to roster:', rosterErr);
    }

    return NextResponse.json(
      {
        success: true,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          department: classroom.department,
          sessionYear: classroom.sessionYear,
          inviteCode: classroom.inviteCode,
          crId: classroom.crId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/classrooms error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
