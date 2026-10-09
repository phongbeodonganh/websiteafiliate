import type { Metadata } from 'next';

export const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://cecana.com.vn';
export const DEFAULT_SITE_NAME = 'GoodPick';
export const DEFAULT_DESCRIPTION =
  'Đánh giá độc lập, so sánh giá và hướng dẫn chọn mua đồ công nghệ, gia dụng, làm vườn và sản phẩm thiết thực.';
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop';

export function normalizeSiteUrl(value?: string | null) {
  const candidate = value?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(candidate);
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function normalizeLocale(value?: string | null) {
  return (value?.trim() || 'vi-VN').replace('-', '_');
}

export function normalizeHttpUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

// Strict (rejecting) variant of normalizeHttpUrl for security boundaries (AFF-01):
// parse with WHATWG URL (encoding tricks that bypass regex scheme checks throw here)
// and accept only http:/https: protocols. Deliberately NOT reusing normalizeHttpUrl —
// its silent fallback contract is correct for SEO display, wrong for an API write gate.
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function sanitizeStoredJsonLd(value?: string | null) {
  if (!value) return null;

  try {
    return serializeJsonLd(JSON.parse(value));
  } catch {
    return null;
  }
}
