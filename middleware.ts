// ============================================================================
// MIDDLEWARE - SUBDOMAIN ROUTING & AUTH
// ============================================================================

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get subdomain for tenant context
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Development: localhost doesn't need subdomain
  const isDevelopment = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // Public routes that don't require auth
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // If no session and not public route, redirect to login
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If has session and on auth page, redirect to home
  if (session && isPublicRoute) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Add subdomain to headers for server components
  if (subdomain && !isDevelopment) {
    res.headers.set('x-tenant-slug', subdomain);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
