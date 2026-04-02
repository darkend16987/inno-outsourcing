import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'vaa-job-session-secret-change-in-production-min-32-chars!'
);

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
