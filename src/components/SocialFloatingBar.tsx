'use client';

import React from 'react';

interface SocialItem {
  id: string;
  name: string;
  url: string;
  brandColor: string;
  icon: React.ReactNode;
}

const SOCIAL_LINKS: SocialItem[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    url: 'https://t.me/aidealsuk',
    brandColor: '#229ED9',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.38-.49 1.05-.75 4.12-1.79 6.87-2.97 8.25-3.55 3.93-1.64 4.75-1.93 5.28-1.94.12 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.28z" />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: 'https://x.com/aidealsuk',
    brandColor: '#ffffff',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://linkedin.com/company/aidealsuk',
    brandColor: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://facebook.com/aidealsuk',
    brandColor: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 fill-current" aria-hidden="true">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.65 13.75 5.65c1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.23 0-1.61.77-1.61 1.56V12h2.74l-.44 3h-2.3v6.8c4.56-.93 8-4.96 8-9.8z" />
      </svg>
    ),
  },
];

/**
 * Sticky floating social media bar positioned on the right edge of the viewport.
 * Perfectly aligned with the ScrollToTop button margin (right-6) and size (h-11 w-11).
 */
export default function SocialFloatingBar() {
  return (
    <aside
      aria-label="Social links"
      className="fixed right-6 top-1/2 -translate-y-1/2 z-[940] hidden md:flex flex-col gap-2.5 transition-all duration-300"
    >
      {SOCIAL_LINKS.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.name}
          title={item.name}
          className="group relative flex items-center justify-center h-11 w-11 border border-white/20 bg-black/90 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/50 hover:bg-black active:scale-95"
        >
          {/* Subtle colored glow on hover */}
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-200 pointer-events-none"
            style={{ backgroundColor: item.brandColor }}
          />

          <span className="relative z-10 transition-transform duration-200 group-hover:scale-110">
            {item.icon}
          </span>

          {/* Tooltip on left hover */}
          <span className="absolute right-full mr-3 px-2.5 py-1 bg-black text-white text-[11px] font-semibold whitespace-nowrap border border-white/20 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 pointer-events-none shadow-lg">
            {item.name}
          </span>
        </a>
      ))}
    </aside>
  );
}
