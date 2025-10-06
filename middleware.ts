import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only set CSP on HTML document navigations to avoid interfering with RSC/data responses
  const accept = request.headers.get('accept') || '';
  const isHtmlDocument = accept.includes('text/html');

  if (!isHtmlDocument) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Get allowed parent origins from env
  const parentOrigins = process.env.NEXT_PUBLIC_PARENT_ORIGINS || 'https://yourmain.site';
  const origins = parentOrigins.split(',').map(o => o.trim()).join(' ');

  // Set CSP with frame-ancestors only (do not set script-src here)
  const csp = `frame-ancestors 'self' ${origins};`;
  response.headers.set('Content-Security-Policy', csp);

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
