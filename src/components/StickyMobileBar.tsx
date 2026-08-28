'use client';

import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface StickyMobileBarProps {
  toolName: string;
  trackingUrl: string;
}

/**
 * A thin 52 px sticky bar at the bottom of the viewport on mobile.
 * Shows the top affiliate tool name + a compact CTA.
 * Dismissible via the × button — once dismissed it stays hidden for the session.
 */
export default function StickyMobileBar({ toolName, trackingUrl }: StickyMobileBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="sticky-mobile-bar" role="complementary" aria-label="Quick deal">
      <span className="sticky-mobile-bar-name">{toolName}</span>
      <a href={trackingUrl} target="_blank" rel="nofollow sponsored">
        Try it <ArrowRight size={12} />
      </a>
      <button
        type="button"
        className="sticky-mobile-bar-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
