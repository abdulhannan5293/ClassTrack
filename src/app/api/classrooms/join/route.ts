import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';
import { normalizeRollNumber } from '@/lib/normalization';

// POST /api/classrooms/join — join a classroom via invite code
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'inviteCode is required' },
        { status: 400 }
      );
    }

    // Find classroom by invite code
    const classroom = await db.classroom.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code. No classroom found.' },
        { status: 404 }
      );
    }

    // Get user's emailPatternExtracted from JWT
    // The token payload has emailPatternExtracted as a parsed object
    const emailPattern = user.emailPatternExtracted;
    const userDepartment = emailPattern.department.toLowerCase();
    const userRollNumber = emailPattern.rollNumber;

    if (!userRollNumber) {
      return NextResponse.json(
        { success: false, error: 'Could not extract roll number from your email pattern' },
        { status: 400 }
      );
    }

    // Verify classroom department matches user's department
    if (classroom.department.toLowerCase() !== userDepartment) {
      return NextResponse.json(
        {
          success: false,
          error: `This classroom is for department "${classroom.department}" but you belong to "${userDepartment}"`,
        },
        { status: 403 }
      );
    }

    // Normalize the roll number from the user's email pattern
    const { normalized: normalizedRoll } = normalizeRollNumber(userRollNumber);

    // Find matching roster entry (unclaimed) — try normalized first, then original
    let rosterEntry = await db.rosterEntry.findFirst({
      where: {
        classroomId: classroom.id,
        rollNumber: normalizedRoll,
        userId: null,
      },
    });

    // If not found with normalized, try the raw roll number from email
    if (!rosterEntry && normalizedRoll !== userRollNumber) {
      rosterEntry = await db.rosterEntry.findFirst({
        where: {
          classroomId: classroom.id,
          rollNumber: userRollNumber,
          userId: null,
        },
      });
    }

    // Also try padded versions (e.g., "41" → "041", "0041")
    if (!rosterEntry) {
      const paddedVariants = [
        userRollNumber.padStart(2, '0'),
        userRollNumber.padStart(3, '0'),
        normalizedRoll.padStart(2, '0'),
        normalizedRoll.padStart(3, '0'),
      ];
      for (const variant of paddedVariants) {
        if (variant === normalizedRoll || variant === userRollNumber) continue;
        rosterEntry = await db.rosterEntry.findFirst({
          where: {
            classroomId: classroom.id,
            rollNumber: variant,
            userId: null,
          },
        });
        if (rosterEntry) break;
      }
    }

    if (!rosterEntry) {
      // Check if there's a claimed entry for this user (user already joined)
      // Try ALL roll number variants to handle padded/unpadded mismatches
      const allRollVariants = [
        normalizedRoll,
        userRollNumber,
        userRollNumber.padStart(2, '0'),
        userRollNumber.padStart(3, '0'),
        normalizedRoll.padStart(2, '0'),
        normalizedRoll.padStart(3, '0'),
      ];
      // Deduplicate
      const uniqueVariants = [...new Set(allRollVariants)];

      let existingClaimed = null;
      for (const variant of uniqueVariants) {
        existingClaimed = await db.rosterEntry.findFirst({
          where: {
            classroomId: classroom.id,
            rollNumber: variant,
            userId: user.userId,
          },
        });
        if (existingClaimed) break;
      }

      if (existingClaimed) {
        return NextResponse.json(
          { success: false, error: 'You have already joined this classroom.' },
          { status: 409 }
        );
      }

      // Also check: is there a claimed entry matching roll number but with a DIFFERENT userId?
      // This happens if the user's account was recreated (data reset) while the roster
      // entry still points to the old user ID.
      let orphanedEntry = null;
      for (const variant of uniqueVariants) {
        orphanedEntry = await db.rosterEntry.findFirst({
          where: {
            classroomId: classroom.id,
            rollNumber: variant,
            userId: { not: null },
          },
        });
        if (orphanedEntry) break;
      }

      if (orphanedEntry) {
        // Reclaim the orphaned entry for the current user
        await db.rosterEntry.update({
          where: { id: orphanedEntry.id },
          data: {
            userId: user.userId,
            claimedAt: new Date(),
            name: user.name || orphanedEntry.name || 'Unknown',
          },
        });

        return NextResponse.json({
          success: true,
          message: `Reclaimed your seat in "${classroom.name}"`,
          classroom: {
            id: classroom.id,
            name: classroom.name,
            department: classroom.department,
            sessionYear: classroom.sessionYear,
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `No roster entry found for roll number "${normalizedRoll}" in this classroom. Contact your CR to ensure your name is on the roster.`,
        },
        { status: 404 }
      );
    }

    // Claim the roster entry
    await db.rosterEntry.update({
      where: { id: rosterEntry.id },
      data: {
        userId: user.userId,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully joined "${classroom.name}"`,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        department: classroom.department,
        sessionYear: classroom.sessionYear,
      },
    });
  } catch (error) {
    console.error('POST /api/classrooms/join error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
