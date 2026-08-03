import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// Server-side gate for everything under /admin/dashboard and all admin API
// routes. Hiding the link is not enough — this rejects unauthenticated
// requests before any protected handler or page runs.
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const isAdminApi = pathname.startsWith('/api/admin');
  const isDashboard = pathname.startsWith('/admin/dashboard');

  if (session) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
};
