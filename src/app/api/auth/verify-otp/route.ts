import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, signRefreshToken } from '@/lib/jwt';

const MAX_OTP_ATTEMPTS = 3;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'OTP is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { otpVerifications: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find latest non-expired OTP
    const verification = await db.emailVerification.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json(
        { success: false, error: 'No valid OTP found. Please request a new one.' },
        { status: 401 }
      );
    }

    // Check attempts
    if (verification.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: 'Maximum OTP attempts exceeded. Please request a new one.' },
        { status: 401 }
      );
    }

    // Verify OTP
    if (verification.otpCode !== otp) {
      await db.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = MAX_OTP_ATTEMPTS - verification.attempts - 1;

      return NextResponse.json(
        {
          success: false,
          error: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        },
        { status: 401 }
      );
    }

    // OTP is valid — update user
    let updateData: Record<string, unknown> = {
      isEmailVerified: true,
    };

    // Set name from email pattern if no name exists
    if (!user.name) {
      const pattern = JSON.parse(user.emailPatternExtracted) as {
        session: string;
        department: string;
        rollNumber: string;
      };
      updateData.name = `${pattern.department.toUpperCase()}-${pattern.rollNumber}`;
    }

    await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Build JWT payload
    const emailPatternExtracted = JSON.parse(
      user.emailPatternExtracted
    ) as { session: string; department: string; rollNumber: string };

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      emailPatternExtracted,
    };

    // Sign tokens
    const accessToken = await signToken(tokenPayload, ACCESS_TOKEN_EXPIRY);
    const refreshToken = await signRefreshToken(user.id, REFRESH_TOKEN_EXPIRY);

    // Calculate refresh token expiry
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store refresh token (upsert to replace any existing)
    await db.refreshToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
      update: {
        token: refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailPatternExtracted,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
