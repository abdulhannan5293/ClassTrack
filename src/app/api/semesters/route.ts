import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

// GET /api/semesters — list all unique semesters for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    // Get all classrooms where user is CR, GR, or member
    const classrooms = await db.classroom.findMany({
      where: {
        OR: [
          { crId: user.userId },
          { grId: user.userId },
          { rosterEntries: { some: { userId: user.userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        semester: true,
        semesterOrder: true,
        sessionYear: true,
        department: true,
      },
      orderBy: { semesterOrder: 'asc' },
    });

    // Group by semester
    const semesterMap = new Map<string, {
      label: string;
      order: number;
      sessionYear: string;
      classrooms: { id: string; name: string; department: string }[];
    }>();

    for (const c of classrooms) {
      const key = `${c.sessionYear}-${c.semester}`;
      if (!semesterMap.has(key)) {
        semesterMap.set(key, {
          label: c.semester,
          order: c.semesterOrder,
          sessionYear: c.sessionYear,
          classrooms: [],
        });
      }
      semesterMap.get(key)!.classrooms.push({
        id: c.id,
        name: c.name,
        department: c.department,
      });
    }

    const semesters = Array.from(semesterMap.entries())
      .map(([key, data]) => ({
        key,
        label: data.label,
        order: data.order,
        sessionYear: data.sessionYear,
        classroomCount: data.classrooms.length,
        classrooms: data.classrooms,
      }))
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({ success: true, semesters });
  } catch (error) {
    console.error('GET /api/semesters error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
