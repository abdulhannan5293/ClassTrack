import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send OTP email to user for verification
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @throws Error if email sending fails
 */
export async function sendOTP(email: string, otp: string): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: 'Your ClassTrack OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>ClassTrack - Email Verification</h2>
          <p>Your one-time password is:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    throw new Error('Failed to send OTP email');
  }
}