// Runs before every page request:
// 1. A per-request nonce and a strict Content-Security-Policy (scripts only from
//    this site with the nonce; no framing; no plugins).
// 2. An optimistic sign-in check for private areas: no session cookie means a
//    redirect to log in. This is only a fast path; every page and API route
//    still verifies the session and RBAC permission on the server.
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PRIVATE = ['/patients', '/dashboard', '/requests', '/schedule', '/kitchen', '/menu/manage', '/staff-access', '/my-meals', '/my-requests', '/my-profile', '/settings', '/access-pending'];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!getSessionCookie(request, { cookiePrefix: 'carebite' })) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
