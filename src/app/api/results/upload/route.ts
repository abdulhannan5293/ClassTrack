import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/results/upload — upload marks from Excel/CSV for an assessment
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const assessmentId = formData.get('assessmentId');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!assessmentId || typeof assessmentId !== 'string') {
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
        { success: false, error: 'Only the CR or GR can upload results' },
        { status: 403 }
      );
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel or CSV file.' },
        { status: 400 }
      );
    }

    // Parse the file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (jsonData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'The uploaded file appears to be empty.' },
        { status: 400 }
      );
    }

    // Detect column headers
    const headerKeys = Object.keys(jsonData[0]);
    const rollKey =
      headerKeys.find((k) => k.toLowerCase().includes('roll')) ||
      headerKeys[0];
    const marksKey =
      headerKeys.find((k) =>
        k.toLowerCase().includes('marks') || k.toLowerCase().includes('obtained')
      ) ||
      headerKeys[1];

    if (!rollKey || !marksKey) {
      return NextResponse.json(
        { success: false, error: 'Could not find "Roll Number" and "Marks Obtained" columns in the file.' },
        { status: 400 }
      );
    }

    // Get roster entries for this classroom (only claimed ones with userId)
    const classroomId = assessment.classroomId;
    const rosterEntries = await db.rosterEntry.findMany({
      where: {
        classroomId,
        userId: { not: null },
      },
      select: {
        rollNumber: true,
        userId: true,
      },
    });

    const rosterByRoll = new Map<string, string>();
    for (const entry of rosterEntries) {
      if (entry.userId) {
        rosterByRoll.set(entry.rollNumber, entry.userId);
      }
    }

    // Get existing results for this assessment
    const existingResults = await db.result.findMany({
      where: { assessmentId },
      select: { studentId: true, id: true },
    });
    const existingByStudent = new Map(existingResults.map((r) => [r.studentId, r.id]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of jsonData) {
      const rawRoll = String(row[rollKey] ?? '').trim();
      const rawMarks = Number(row[marksKey]);

      if (!rawRoll || isNaN(rawMarks)) {
        skipped++;
        continue;
      }

      const normalizedRoll = rawRoll.padStart(3, '0');
      const studentId = rosterByRoll.get(normalizedRoll);

      if (!studentId) {
        skipped++;
        continue;
      }

      // Clamp marks to [0, totalMarks]
      const marksObtained = Math.max(0, Math.min(rawMarks, assessment.totalMarks));

      if (existingByStudent.has(studentId)) {
        // Update existing result
        await db.result.update({
          where: { id: existingByStudent.get(studentId)! },
          data: { marksObtained },
        });
        updated++;
      } else {
        // Create new result
        await db.result.create({
          data: {
            assessmentId,
            studentId,
            marksObtained,
          },
        });
        added++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      skipped,
      message: `Results uploaded: ${added} added, ${updated} updated, ${skipped} skipped (unclaimed or invalid).`,
    });
  } catch (error) {
    console.error('POST /api/results/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
