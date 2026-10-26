import { NextRequest, NextResponse } from 'next/server';

// Next.js's App Router injects its own inline bootstrap/streaming <script> tags
// (RSC hydration payload, Suspense reveal helpers) with no way to disable them, so a
// static `script-src 'self'` CSP blocks the whole app from hydrating. The documented
// fix is a per-request nonce: we generate one here, hand it to Next.js via the
// `x-nonce` request header (which it automatically stamps onto its own inline
// scripts), and allow only that nonce (+ 'strict-dynamic') in script-src.
export function proxy(request: NextRequest) {
  // TEMP LOAD TEST: uncomment the nonce and original policy/header below
  // when restoring headers() in src/app/layout.tsx.
  // const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    "default-src 'self'",
    // TEMP LOAD TEST: original per-request nonce policy (restore after testing).
    // `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Temporary static-compatible policy; unsafe-inline weakens XSS protection.
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com${isDev ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  // TEMP LOAD TEST: restore with the nonce generation/policy above.
  // requestHeaders.set('x-nonce', nonce);
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
