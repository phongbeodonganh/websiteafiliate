'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CategorySelector from '@/components/CategorySelector';
import ScrollToTop from '@/components/ScrollToTop';

const BRAND = 'AIDEALSUK';
const YEAR = new Date().getFullYear();

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

let categoryRequest: Promise<CategoryOption[]> | null = null;

function loadCategories() {
  if (!categoryRequest) {
    categoryRequest = fetch('/api/v1/public/categories')
      .then((response) => response.json())
      .then((payload) => (payload.status === 'success' ? payload.data : []))
      .catch(() => []);
  }
  return categoryRequest;
}

/**
 * Unified editorial footer used across every public-facing route:
 *   - /  (home)
 *   - /latest | hottest | editorial-picks | affiliates | category/[slug]
 *   - /article/[slug]
 *
 * Provides trust signals (About / Privacy / Terms / Contact), category
 * navigation, social placeholders, and a copyright line.
 */
export default function EditorialFooter() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let active = true;
    loadCategories().then((items) => {
      if (active) setCategories(items);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t-[3px] border-t-[#0D766E] bg-[#0a0a0a] text-white w-full mt-auto mb-0" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Main grid ── */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 pt-12 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-7">

        {/* Col 1 — Brand */}
        <div>
          <Link
            href="/"
            className="text-white text-[26px] font-bold no-underline block mb-4 font-['Plus_Jakarta_Sans',sans-serif] hover:text-neutral-200 transition-colors duration-200"
          >
            {BRAND}
          </Link>
          <p className="text-[13px] leading-relaxed text-neutral-400 mb-5 max-w-[260px]">
            Your Trusted Source for AI Tool Reviews, Tech News &amp; Exclusive Affiliate Deals.
          </p>
          {/* Social links */}
          <div className="flex gap-2.5 flex-wrap">
            {[
              {
                name: 'Telegram',
                url: 'https://t.me/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-current" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.38-.49 1.05-.75 4.12-1.79 6.87-2.97 8.25-3.55 3.93-1.64 4.75-1.93 5.28-1.94.12 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.28z" />
                  </svg>
                ),
              },
              {
                name: 'X (Twitter)',
                url: 'https://x.com/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] fill-current" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                name: 'LinkedIn',
                url: 'https://linkedin.com/company/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-current" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                ),
              },
              {
                name: 'Facebook',
                url: 'https://facebook.com/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-current" aria-hidden="true">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.65 13.75 5.65c1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.23 0-1.61.77-1.61 1.56V12h2.74l-.44 3h-2.3v6.8c4.56-.93 8-4.96 8-9.8z" />
                  </svg>
                ),
              },
            ].map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                title={social.name}
                className="inline-flex items-center justify-center w-[34px] h-[34px] border border-white/[0.1] bg-white/[0.03] text-neutral-400 no-underline transition-all duration-200 hover:border-[#0D766E]/50 hover:bg-[#0D766E]/10 hover:text-[#0D766E] hover:scale-105"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Col 2 — Quick Links */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-4">Quick Links</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
            <li>
              <Link href="/latest" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Latest Articles
              </Link>
            </li>
            <li>
              <Link href="/hottest" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Hottest Articles
              </Link>
            </li>
            <li>
              <Link href="/editorial-picks" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Editorial Picks
              </Link>
            </li>
            <li>
              <Link href="/affiliates" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Affiliate Deals
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3 — Categories */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-4">Categories</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
            {categories.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/category/${cat.slug}`}
                  className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
            {categories.length === 0 && (
              <li>
                <CategorySelector placement="footer" />
              </li>
            )}
          </ul>
        </div>

        {/* Col 4 — Legal / Trust */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-4">Company</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
            <li>
              <Link href="/about" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/affiliate-disclosure" className="footer-link text-neutral-300 text-[13px] no-underline hover:text-white">
                Affiliate Disclosure
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Affiliate disclaimer ── */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 pt-6">
        <p className="text-[11px] leading-[1.55] text-neutral-600 border-t border-white/[0.06] pt-4 m-0">
          <strong className="text-neutral-400">Affiliate Disclosure:</strong>{' '}
          Some links on this site are affiliate links. If you click through and make a purchase, we may earn a commission at no additional cost to you. We only recommend products we genuinely believe in.
        </p>
      </div>

      {/* ── Copyright bar ── */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-5 flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] text-neutral-500 m-0 font-semibold">
          © {YEAR} {BRAND}. All Rights Reserved.
        </p>
        <p className="text-[11px] text-neutral-600 m-0">
          AIDEALSUK built with ❤️ for the AI community
        </p>
      </div>

      <ScrollToTop />
    </footer>
  );
}
