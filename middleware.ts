import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/auth';

// Routes that require authentication
const protectedRoutes = ['/admin'];
const publicAdminRoutes = ['/admin/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is a protected admin route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route) && !publicAdminRoutes.includes(pathname)
  );

  if (isProtectedRoute) {
    const session = await checkAuth(request);

    if (!session) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if (pathname === '/admin/login') {
    const session = await checkAuth(request);
    if (session) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
