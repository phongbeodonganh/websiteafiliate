"use client";

import { useEffect } from "react";

export default function StoreViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // Only mounted detail pages count: Next.js prefetches must not add views.
    void fetch("/api/v1/public/stores/view", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }), keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
