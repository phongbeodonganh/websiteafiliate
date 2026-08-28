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
    <footer
      style={{
        borderTop: '4px solid #111111',
        background: '#111111',
        color: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        width: '100%',
        marginTop: 'auto',
        marginBottom: 0,
      }}
    >
      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div
        className="editorial-footer-grid"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '48px 32px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '36px 28px',
        }}
      >
        {/* Col 1 — Brand */}
        <div style={{ gridColumn: 'span 1' }}>
          <Link
            href="/"
            style={{
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'block',
              marginBottom: 16,
            }}
          >
            {BRAND}
          </Link>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: '#a0a0a0',
              margin: '0 0 20px',
              maxWidth: 260,
            }}
          >
            Your Trusted Source for AI Tool Reviews, Tech News &amp; Exclusive Affiliate Deals.
          </p>
          {/* Social links */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              {
                name: 'Telegram',
                url: 'https://t.me/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor' }} aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.26-2.04-.48-.82-.27-1.47-.42-1.42-.88.03-.24.38-.49 1.05-.75 4.12-1.79 6.87-2.97 8.25-3.55 3.93-1.64 4.75-1.93 5.28-1.94.12 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.16-.04.28z" />
                  </svg>
                ),
              },
              {
                name: 'X (Twitter)',
                url: 'https://x.com/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'currentColor' }} aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                name: 'LinkedIn',
                url: 'https://linkedin.com/company/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor' }} aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                ),
              },
              {
                name: 'Facebook',
                url: 'https://facebook.com/aidealsuk',
                icon: (
                  <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor' }} aria-hidden="true">
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  border: '1px solid #333',
                  background: '#1a1a1a',
                  color: '#ccc',
                  transition: 'all 200ms ease',
                  textDecoration: 'none',
                }}
                className="hover:border-white hover:bg-black hover:text-white hover:scale-105"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Col 2 — Quick Links */}
        <div>
          <h4 style={colHeadingStyle}>Quick Links</h4>
          <ul style={listStyle}>
            <li>
              <Link href="/latest" style={linkStyle}>
                Latest Articles
              </Link>
            </li>
            <li>
              <Link href="/hottest" style={linkStyle}>
                Hottest Articles
              </Link>
            </li>
            <li>
              <Link href="/editorial-picks" style={linkStyle}>
                Editorial Picks
              </Link>
            </li>
            <li>
              <Link href="/affiliates" style={linkStyle}>
                Affiliate Deals
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3 — Categories */}
        <div>
          <h4 style={colHeadingStyle}>Categories</h4>
          <ul style={listStyle}>
            {categories.slice(0, 5).map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/category/${cat.slug}`}
                  style={linkStyle}
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
          <h4 style={colHeadingStyle}>Company</h4>
          <ul style={listStyle}>
            <li>
              <Link href="/about" style={linkStyle}>
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" style={linkStyle}>
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" style={linkStyle}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" style={linkStyle}>
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/affiliate-disclosure" style={linkStyle}>
                Affiliate Disclosure
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Affiliate disclaimer ──────────────────────────────────── */}
      <div
        className="editorial-footer-disclosure"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '24px 32px 0',
        }}
      >
        <p
          style={{
            fontSize: 11,
            lineHeight: 1.55,
            color: '#666',
            borderTop: '1px solid #222',
            paddingTop: 16,
            margin: 0,
          }}
        >
          <strong style={{ color: '#888' }}>Affiliate Disclosure:</strong>{' '}
          Some links on this site are affiliate links. If you click through and make a purchase, we may earn a commission at no additional cost to you. We only recommend products we genuinely believe in.
        </p>
      </div>

      {/* ── Copyright bar ─────────────────────────────────────────── */}
      <div
        className="editorial-footer-copyright"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '20px 32px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <p style={{ fontSize: 11, color: '#555', margin: 0, fontWeight: 600 }}>
          © {YEAR} {BRAND}. All Rights Reserved.
        </p>
        <p style={{ fontSize: 11, color: '#444', margin: 0 }}>
          AIDEALSUK built with ❤️ for the AI community
        </p>
      </div>

      {/* ── Responsive overrides ──────────────────────────────────── */}
      <style>{`
        @media (max-width: 900px) {
          .editorial-footer-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            padding: 40px 24px 0 !important;
          }
          .editorial-footer-disclosure,
          .editorial-footer-copyright {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
        @media (max-width: 560px) {
          .editorial-footer-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
            padding: 36px 16px 0 !important;
          }
          .editorial-footer-disclosure,
          .editorial-footer-copyright {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
          .editorial-footer-copyright {
            align-items: flex-start !important;
            flex-direction: column !important;
          }
        }
      `}</style>
      <ScrollToTop />
    </footer>
  );
}

/* ── Shared inline styles ─────────────────────────────────────────── */
const colHeadingStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#666',
  margin: '0 0 16px',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const linkStyle: React.CSSProperties = {
  color: '#ccc',
  fontSize: 13,
  textDecoration: 'none',
  transition: 'color 160ms ease',
};
