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

export const COOKIE_NAME = 'vaa_session';

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as { uid: string; role: string; displayName: string };
  } catch {
    return null;
  }
}

export async function createSessionToken(data: { uid: string; role: string; displayName: string }) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SESSION_SECRET);
}
