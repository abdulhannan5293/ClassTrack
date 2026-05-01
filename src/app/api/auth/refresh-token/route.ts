import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, signToken, signRefreshToken } from '@/lib/jwt';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken: incomingRefreshToken } = body;

    if (!incomingRefreshToken || typeof incomingRefreshToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify the refresh token
    const payload = await verifyToken(incomingRefreshToken);

    if (!payload || payload.type !== 'refresh' || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if token exists in database and is not expired
    const storedToken = await db.refreshToken.findUnique({
      where: { userId: payload.userId },
    });

    if (!storedToken || storedToken.token !== incomingRefreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token not recognized' },
        { status: 401 }
      );
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await db.refreshToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { success: false, error: 'Refresh token has expired. Please log in again.' },
        { status: 401 }
      );
    }

    // Fetch user to build new access token payload
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      await db.refreshToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Issue new token pair
    const emailPatternExtracted = JSON.parse(
      user.emailPatternExtracted
    ) as { session: string; department: string; rollNumber: string };

    const accessToken = await signToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        emailPatternExtracted,
      },
      ACCESS_TOKEN_EXPIRY
    );

    const newRefreshToken = await signRefreshToken(
      user.id,
      REFRESH_TOKEN_EXPIRY
    );

    const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Delete old refresh token and store new one
    await db.refreshToken.delete({ where: { id: storedToken.id } });
    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: newRefreshExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
