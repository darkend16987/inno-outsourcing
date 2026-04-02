import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable is required in production!');
  }
  return new TextEncoder().encode(
    secret || 'vaa-job-dev-only-session-secret-not-for-production!'
  );
}
const SESSION_SECRET = getSessionSecret();
const COOKIE_NAME = 'vaa_session';

// Firebase Auth REST API verification endpoint
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

/**
 * Verify Firebase ID token server-side using Google's public keys.
 * This prevents users from fabricating tokens with arbitrary roles.
 */
async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  try {
    // Use Firebase Auth REST API to verify the token
    // This calls Google's tokeninfo endpoint which validates signature + expiry
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const user = data.users?.[0];

    if (!user?.localId) return null;

    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Fetch user role from Firestore REST API (server-side, no Admin SDK needed).
 * This ensures the role comes from the database, NOT from the client.
 */
async function getUserRoleFromFirestore(uid: string, idToken: string): Promise<string | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!response.ok) return null;

    const doc = await response.json();
    return doc.fields?.role?.stringValue || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken, uid, displayName } = await request.json();

    if (!idToken || !uid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 1: Verify the Firebase ID token is genuine
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser || verifiedUser.uid !== uid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Step 2: Read actual role from Firestore (don't trust client-sent role)
    const role = await getUserRoleFromFirestore(uid, idToken);
    if (!role) {
      // User may be new — default to freelancer
      // This is safe because Firestore rules enforce role='freelancer' on create
      const fallbackRole = 'freelancer';
      
      // Create signed session JWT with verified data
      const sessionToken = await new SignJWT({
        uid: verifiedUser.uid,
        role: fallbackRole,
        displayName: displayName || '',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(SESSION_SECRET);

      const response = NextResponse.json({ success: true, role: fallbackRole });
      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
      return response;
    }

    // Step 3: Validate the role
    const validRoles = ['freelancer', 'admin', 'jobmaster', 'accountant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Step 4: Create signed session JWT with SERVER-VERIFIED data
    const sessionToken = await new SignJWT({
      uid: verifiedUser.uid,
      role, // Role comes from Firestore, NOT from client
      displayName: displayName || '',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(SESSION_SECRET);

    const response = NextResponse.json({ success: true, role });
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
