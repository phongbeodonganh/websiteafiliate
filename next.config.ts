import type { NextConfig } from "next";

// Content-Security-Policy is set per-request in src/proxy.ts (needs a fresh
// nonce every time so Next.js's inline hydration scripts are allowed to run).
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  // Lets teammates on the same LAN load the dev server via the host machine's IP
  // and still get working HMR (hot-reload) over WebSocket. Dev-only; no effect on
  // production builds. Update this if the host machine's LAN IP changes.
  allowedDevOrigins: ['192.168.102.172'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
