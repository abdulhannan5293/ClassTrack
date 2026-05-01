import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/classrooms/[id]/roster/add — add a single student to roster
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: classroomId } = await params;
    const body = await request.json();
    const { rollNumber, name } = body;

    if (!rollNumber || !name) {
      return NextResponse.json(
        { success: false, error: 'rollNumber and name are required' },
        { status: 400 }
      );
    }

    // Verify classroom exists and user is CR or GR
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

    const isCRorGR =
      classroom.crId === user.userId || classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can add students to the roster' },
        { status: 403 }
      );
    }

    // Normalize the roll number
    const normalizedRoll = String(rollNumber).trim().padStart(3, '0');

    // Check for existing entry
    const existing = await db.rosterEntry.findUnique({
      where: {
        classroomId_rollNumber: {
          classroomId,
          rollNumber: normalizedRoll,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A student with roll number "${normalizedRoll}" already exists in this classroom` },
        { status: 409 }
      );
    }

    // Normalize name
    const normalizedName = name
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // Create roster entry
    const entry = await db.rosterEntry.create({
      data: {
        classroomId,
        rollNumber: normalizedRoll,
        fullRollDisplay: String(rollNumber).trim(),
        name: normalizedName,
      },
    });

    // Try to auto-claim: find an existing user matching this roll number
    try {
      const matchingUsers = await db.user.findMany({
        where: {
          OR: [
            { emailPatternExtracted: { contains: String(rollNumber).trim() } },
            { emailPatternExtracted: { contains: normalizedRoll } },
          ],
          role: { in: ['student', 'cr', 'gr'] },
        },
        select: { id: true, emailPatternExtracted: true, name: true },
      });

      for (const matchUser of matchingUsers) {
        const pattern = matchUser.emailPatternExtracted ? JSON.parse(matchUser.emailPatternExtracted) : {};
        const userRoll = pattern.rollNumber ? String(pattern.rollNumber).padStart(3, '0') : '';
        
        if (userRoll === normalizedRoll || String(pattern.rollNumber || '') === String(rollNumber).trim()) {
          // Found a matching user — auto-claim
          await db.rosterEntry.update({
            where: { id: entry.id },
            data: {
              userId: matchUser.id,
              claimedAt: new Date(),
              name: normalizedName,
            },
          });
          break;
        }
      }
    } catch (autoClaimErr) {
      // Non-blocking
      console.error('Warning: Auto-claim attempt failed:', autoClaimErr);
    }

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('POST /api/classrooms/[id]/roster/add error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
