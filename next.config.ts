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
  // Allow development through the LAN and ephemeral ngrok hostnames, including
  // Next.js's WebSocket HMR requests. This option only affects the dev server.
  allowedDevOrigins: ['192.168.102.172', '*.ngrok-free.app'],
  images: {
    remotePatterns: [
      // Cloudflare R2 (uploaded thumbnails/content images). Using a wildcard
      // hostname pattern so this keeps working once a custom R2 domain replaces
      // the temporary pub-*.r2.dev one (see R2_IMAGE_STORAGE_TASKLIST.md).
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
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
