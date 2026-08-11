import { NextRequest, NextResponse } from 'next/server';

// Next.js's App Router injects its own inline bootstrap/streaming <script> tags
// (RSC hydration payload, Suspense reveal helpers) with no way to disable them, so a
// static `script-src 'self'` CSP blocks the whole app from hydrating. The documented
// fix is a per-request nonce: we generate one here, hand it to Next.js via the
// `x-nonce` request header (which it automatically stamps onto its own inline
// scripts), and allow only that nonce (+ 'strict-dynamic') in script-src.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
