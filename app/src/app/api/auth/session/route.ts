import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'vaa-job-session-secret-change-in-production-min-32-chars!'
);
const COOKIE_NAME = 'vaa_session';

export async function POST(request: NextRequest) {
  try {
    const { idToken, role, uid, displayName } = await request.json();

    if (!idToken || !role || !uid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role is a known value
    const validRoles = ['freelancer', 'admin', 'jobmaster', 'accountant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create signed session JWT (1 day expiry)
    const sessionToken = await new SignJWT({ uid, role, displayName: displayName || '' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(SESSION_SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 1 day
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

// Helper to verify session (exported for use in other API routes)
export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as { uid: string; role: string; displayName: string };
  } catch {
    return null;
  }
}
