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
        borderTop: '4px solid #0056B3',
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
          {/* Social placeholders */}
          <div style={{ display: 'flex', gap: 12 }}>
            {(['X (Twitter)', 'LinkedIn', 'Facebook'] as const).map((label) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  border: '1px solid #333',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#888',
                  cursor: 'default',
                }}
                title={label}
              >
                {label[0]}
              </span>
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
