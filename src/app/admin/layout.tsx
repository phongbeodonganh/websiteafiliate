import type { Metadata } from 'next';
import { Suspense } from 'react';

// All /admin/* pages are client components ('use client'), so they can't export
// their own `metadata`. This server layout wraps every admin route and keeps it
// out of search engines even if a URL ever gets discovered/linked externally.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Client-side query parameters need a boundary when the root can prerender.
  return <div lang="en"><Suspense fallback={<p role="status">Loading admin…</p>}>{children}</Suspense></div>;
}
