import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Matcher to protect all role-based routes
const protectedRoutes = ['/admin', '/jobmaster', '/accountant', '/freelancer'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    // For now, we simulate checking a role cookie. 
    // In production Firebase setup, we verify a session cookie or a custom JWT.
    // E.g., const session = request.cookies.get('session');
    // For rapid integration, let's keep it simple: if no simulated role, re-route to login.
    const userRole = request.cookies.get('user_role')?.value;

    if (!userRole) {
      // Redirect to login if unauthenticated
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based matching
    // If the path is /admin/... and the user is not admin
    if (path.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (path.startsWith('/jobmaster') && userRole !== 'jobmaster') {
       return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (path.startsWith('/accountant') && userRole !== 'accountant') {
       return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (path.startsWith('/freelancer') && userRole !== 'freelancer') {
       return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
  }

  // Prevent logged in users from seeing login/register pages
  if (path === '/login' || path === '/register') {
     const userRole = request.cookies.get('user_role')?.value;
     if (userRole) {
        return NextResponse.redirect(new URL(`/${userRole}`, request.url));
     }
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to:
  matcher: [
    '/admin/:path*', 
    '/jobmaster/:path*', 
    '/accountant/:path*', 
    '/freelancer/:path*',
    '/login',
    '/register'
  ],
};
