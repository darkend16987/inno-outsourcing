import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

async function getSessionPayload(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as { uid: string; role: string; displayName: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPrefixes = ['/admin', '/jobmaster', '/accountant', '/freelancer'];
  const isProtectedRoute = protectedPrefixes.some(prefix => path.startsWith(prefix));

  if (isProtectedRoute) {
    const session = await getSessionPayload(request);

    if (!session) {
      // Clear invalid cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
      return response;
    }

    const { role } = session;

    // Role-based access control
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (path.startsWith('/jobmaster') && role !== 'jobmaster') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (path.startsWith('/accountant') && role !== 'accountant') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (path.startsWith('/freelancer') && role !== 'freelancer') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
  }

  // Prevent logged-in users from seeing login/register
  if (path === '/login' || path === '/register') {
    const session = await getSessionPayload(request);
    if (session) {
      return NextResponse.redirect(new URL(`/${session.role}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/jobmaster/:path*',
    '/accountant/:path*',
    '/freelancer/:path*',
    '/login',
    '/register',
  ],
};
