import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// POST /api/classrooms/[id]/roster/upload — upload roster from Excel/CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const { id: classroomId } = await params;

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
        { success: false, error: 'Only the CR or GR can upload the roster' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
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
    const nameKey =
      headerKeys.find((k) => k.toLowerCase().includes('name')) ||
      headerKeys[1];

    if (!rollKey || !nameKey) {
      return NextResponse.json(
        { success: false, error: 'Could not find "Roll Number" and "Name" columns in the file.' },
        { status: 400 }
      );
    }

    // Process rows
    let added = 0;
    let updated = 0;
    const existingEntries = await db.rosterEntry.findMany({
      where: { classroomId },
      select: { rollNumber: true, id: true },
    });
    const existingByRoll = new Map(existingEntries.map((e) => [e.rollNumber, e.id]));

    for (const row of jsonData) {
      const rawRoll = String(row[rollKey] ?? '').trim();
      const rawName = String(row[nameKey] ?? '').trim();

      if (!rawRoll || !rawName) continue;

      const normalizedRoll = rawRoll.padStart(3, '0');
      const normalizedName = rawName
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (existingByRoll.has(normalizedRoll)) {
        // Update existing entry
        await db.rosterEntry.update({
          where: { id: existingByRoll.get(normalizedRoll)! },
          data: {
            name: normalizedName,
            fullRollDisplay: rawRoll,
          },
        });
        updated++;
      } else {
        // Create new entry
        await db.rosterEntry.create({
          data: {
            classroomId,
            rollNumber: normalizedRoll,
            fullRollDisplay: rawRoll,
            name: normalizedName,
          },
        });
        added++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      message: `Roster uploaded: ${added} added, ${updated} updated.`,
    });
  } catch (error) {
    console.error('POST /api/classrooms/[id]/roster/upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
