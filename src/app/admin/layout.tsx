import type { Metadata } from 'next';

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
  return children;
}
