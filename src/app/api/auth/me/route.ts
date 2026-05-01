import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (user instanceof NextResponse) return user;

    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailPatternExtracted: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    const emailPatternExtracted = JSON.parse(
      dbUser.emailPatternExtracted
    ) as { session: string; department: string; rollNumber: string };

    return NextResponse.json({
      success: true,
      user: {
        ...dbUser,
        emailPatternExtracted,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
