import type { Metadata } from 'next';

export const DEFAULT_SITE_URL = 'https://aidealsuk.com';
export const DEFAULT_SITE_NAME = 'AIDEALSUK';
export const DEFAULT_DESCRIPTION =
  'Discover high-paying AI affiliate programs, comprehensive AI tool reviews, and expert monetization strategies.';
export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

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
  return (value?.trim() || 'en-US').replace('-', '_');
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
