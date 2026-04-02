import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// =====================
// CSRF TOKEN GENERATOR
// =====================
function generateCsrfToken(): string {
  // Use crypto.randomUUID (available in Edge Runtime)
  return crypto.randomUUID();
}

// =====================
// SESSION SECRET
// =====================
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

// =====================
// RATE LIMITING (In-memory, Edge-compatible)
// Protects against DDoS / brute-force on API + auth routes
// =====================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_CONFIG = {
  api: { window: 60_000, maxRequests: 60 },      // 60 req/min for API
  auth: { window: 300_000, maxRequests: 10 },     // 10 req/5min for login/register
  general: { window: 60_000, maxRequests: 120 },  // 120 req/min general
} as const;

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(key: string, config: { window: number; maxRequests: number }): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.window });
    return false;
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return true;
  }
  return false;
}

// Periodic cleanup to prevent memory leak (every 5 minutes max 10000 entries)
function cleanupRateLimitMap() {
  if (rateLimitMap.size > 10000) {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }
}

// =====================
// SESSION VERIFICATION
// =====================
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

// =====================
// MAIN MIDDLEWARE
// =====================
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const ip = getClientIP(request);

  // --- Rate Limiting ---
  cleanupRateLimitMap();

  // Strict rate limit on auth endpoints (anti brute-force)
  if (path === '/login' || path === '/register' || path.startsWith('/api/auth')) {
    if (isRateLimited(`auth:${ip}`, RATE_LIMIT_CONFIG.auth)) {
      return new NextResponse(
        JSON.stringify({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '300' } }
      );
    }
  }

  // Rate limit API routes
  if (path.startsWith('/api/')) {
    if (isRateLimited(`api:${ip}`, RATE_LIMIT_CONFIG.api)) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
  }

  // General rate limit for all routes
  if (isRateLimited(`gen:${ip}`, RATE_LIMIT_CONFIG.general)) {
    return new NextResponse(
      '<html><body><h1>429 — Too Many Requests</h1><p>Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi và thử lại.</p></body></html>',
      { status: 429, headers: { 'Content-Type': 'text/html', 'Retry-After': '60' } }
    );
  }

  // --- Protected Routes (RBAC) ---
  const protectedPrefixes = ['/admin', '/jobmaster', '/accountant', '/freelancer'];
  const isProtectedRoute = protectedPrefixes.some(prefix => path.startsWith(prefix));

  if (isProtectedRoute) {
    const session = await getSessionPayload(request);

    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
      return response;
    }

    const { role } = session;

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

  // --- CSRF Protection (S6) ---
  // For API mutating requests, validate CSRF token
  if (path.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfCookie = request.cookies.get('csrf_token')?.value;
    const csrfHeader = request.headers.get('x-csrf-token');

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // --- Prevent logged-in users from seeing login/register ---
  if (path === '/login' || path === '/register') {
    const session = await getSessionPayload(request);
    if (session) {
      return NextResponse.redirect(new URL(`/${session.role}`, request.url));
    }
  }

  const response = NextResponse.next();

  // Set CSRF token cookie on GET requests (if not already set)
  if (request.method === 'GET' && !request.cookies.get('csrf_token')?.value) {
    const csrfToken = generateCsrfToken();
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Must be readable by JS to send in header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/jobmaster/:path*',
    '/accountant/:path*',
    '/freelancer/:path*',
    '/login',
    '/register',
    '/api/:path*',
    '/jobs/:path*',
    '/viec-lam/:path*',
  ],
};
