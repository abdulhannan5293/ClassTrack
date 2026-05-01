import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/attendance/mark — mark attendance (CR or GR only)
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { sessionId, records, isFinalized } = body;

    if (!sessionId || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'sessionId and records array are required' },
        { status: 400 }
      );
    }

    // Validate record entries (accept both studentId and userId fields)
    // Filter out records without a valid studentId (e.g., unclaimed roster entries)
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    const validRecords = records.filter((record: Record<string, unknown>) => {
      const studentId = record.studentId || record.userId;
      if (!studentId) {
        console.warn('Skipping record without studentId/userId:', record.rosterEntryId ?? 'unknown');
        return false;
      }
      if (!record.status || !validStatuses.includes(record.status as string)) {
        console.warn('Skipping record with invalid status:', record.status);
        return false;
      }
      return true;
    });

    // Only block if no valid records and NOT finalizing.
    // When finalizing, the transaction below will create records for all claimed
    // roster students automatically, so we allow proceeding with zero upfront records.
    if (validRecords.length === 0 && records.length > 0 && !isFinalized) {
      return NextResponse.json(
        { success: false, error: 'No valid records to save. Each record must have a studentId (or userId) and valid status.' },
        { status: 400 }
      );
    }

    // Fetch session with classroom info
    const session = await db.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        classroom: {
          select: { id: true, crId: true, grId: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Attendance session not found' },
        { status: 404 }
      );
    }

    // Verify user is CR or GR of the session's classroom
    const isCRorGR =
      session.classroom.crId === user.userId ||
      session.classroom.grId === user.userId;

    if (!isCRorGR) {
      return NextResponse.json(
        { success: false, error: 'Only the CR or GR can mark attendance' },
        { status: 403 }
      );
    }

    // Verify session is not already finalized
    if (session.status === 'finalized') {
      return NextResponse.json(
        { success: false, error: 'This attendance session has already been finalized and cannot be modified' },
        { status: 400 }
      );
    }

    if (isFinalized) {
      // When finalizing, run everything in a single transaction for atomicity.
      // This ensures records are upserted AND the session status is updated together.
      await db.$transaction(async (tx) => {
        // 1. Upsert the records sent from the frontend (claimed students only)
        for (const record of validRecords) {
          const studentId = (record as Record<string, unknown>).studentId || (record as Record<string, unknown>).userId;
          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId,
                studentId: studentId as string,
              },
            },
            update: {
              status: (record as Record<string, unknown>).status as string,
            },
            create: {
              sessionId,
              studentId: studentId as string,
              status: (record as Record<string, unknown>).status as string,
            },
          });
        }

        // 2. Ensure all roster students with a claimed userId have records
        const rosterStudents = await tx.rosterEntry.findMany({
          where: {
            classroomId: session.classroomId,
            userId: { not: null },
          },
          select: { userId: true },
        });

        // Get existing record student IDs (includes the ones just upserted above)
        const existingRecords = await tx.attendanceRecord.findMany({
          where: { sessionId },
          select: { studentId: true },
        });

        const existingStudentIds = new Set(existingRecords.map((r) => r.studentId));

        // Create missing records as "present"
        const missingStudents = rosterStudents.filter(
          (entry) => !existingStudentIds.has(entry.userId!)
        );

        if (missingStudents.length > 0) {
          await tx.attendanceRecord.createMany({
            data: missingStudents.map((entry) => ({
              sessionId,
              studentId: entry.userId!,
              status: 'present',
            })),
          });
        }

        // 3. Update session status to finalized
        await tx.attendanceSession.update({
          where: { id: sessionId },
          data: { status: 'finalized' },
        });
      });
    } else {
      // Non-finalize: upsert records without a transaction (simple draft save)
      for (const record of validRecords) {
        const studentId = (record as Record<string, unknown>).studentId || (record as Record<string, unknown>).userId;
        await db.attendanceRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId,
              studentId: studentId as string,
            },
          },
          update: {
            status: (record as Record<string, unknown>).status as string,
          },
          create: {
            sessionId,
            studentId: studentId as string,
            status: (record as Record<string, unknown>).status as string,
          },
        });
      }
    }

    // Return updated session with all records
    const updatedSession = await db.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        markedBy: {
          select: { id: true, name: true },
        },
        subject: {
          select: { id: true, name: true, code: true },
        },
        records: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                rosterEntries: {
                  where: { classroomId: session.classroomId },
                  select: { rollNumber: true, fullRollDisplay: true },
                },
              },
            },
          },
          orderBy: { student: { name: 'asc' } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('POST /api/attendance/mark error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
