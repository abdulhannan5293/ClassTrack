import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type JWTPayload } from '@/lib/jwt';

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the decoded JWTPayload if valid, or a 401 NextResponse if invalid.
 *
 * Usage in route handlers:
 *   const user = await authenticate(request);
 *   if (user instanceof NextResponse) return user; // 401 error
 *   // user is now JWTPayload
 */
export async function authenticate(
  request: NextRequest
): Promise<JWTPayload | NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header with Bearer token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return payload;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
