/**
 * Next.js 16 Proxy (formerly Middleware)
 *
 * Protects routes based on user role.
 * Reads JWT from cookies (set at login time).
 */

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/domain',
  '/milestones',
  '/documents',
  '/presentations',
  '/about',
  '/contact',
  '/farmer/landing',
]);

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

function isPublicRoute(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow all public assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Public marketing/project routes — render regardless of auth state
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('asi_access_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode token to extract roles
  const payload = decodeJWT(token);
  if (!payload) {
    // Invalid token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const roles = (payload.roles as string[]) || [];

  // Route protection logic
  if (pathname.startsWith('/farmer')) {
    if (!roles.some((r) => r.toLowerCase() === 'farmer')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } else if (
    pathname.startsWith('/operations') ||
    pathname.startsWith('/irrigation') ||
    pathname.startsWith('/crop-health') ||
    pathname.startsWith('/forecasting')
  ) {
    if (!roles.some((r) => ['officer', 'authority'].includes(r.toLowerCase()))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } else if (pathname.startsWith('/authority') || pathname.startsWith('/optimization')) {
    if (!roles.some((r) => r.toLowerCase() === 'authority')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
