import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateUniversityEmail, generateOTP } from '@/lib/normalization';
import { sendOTP } from '@/lib/email';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const validation = validateUniversityEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          emailPatternExtracted: JSON.stringify(validation.data),
        },
      });
    }

    // Rate limit: allow re-sending after 30 seconds since last OTP
    const recentOTP = await db.emailVerification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 30 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOTP) {
      const waitSeconds = Math.ceil(
        (30 * 1000 - (Date.now() - recentOTP.createdAt.getTime())) / 1000
      );
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting another code.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }

    // Generate and store OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.emailVerification.create({
      data: {
        userId: user.id,
        otpCode: otp,
        expiresAt,
      },
    });

    // Send OTP via email
    await sendOTP(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('POST /api/auth/send-otp error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
