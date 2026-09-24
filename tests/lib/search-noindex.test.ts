/**
 * SEO-03 / D-13 — /?q= search URLs produce noindex metadata.
 *
 * generateMetadata in the homepage page module conditionally sets robots to
 * { index: false, follow: true } when the q param is a non-empty string.
 */
import { describe, expect, it } from 'vitest';
import { generateMetadata } from '@/app/page';

describe('Homepage generateMetadata noindex for search (D-13, SEO-03)', () => {
  it('returns noindex metadata when q is a non-empty string', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({ q: 'AI tools' }) });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('/');
  });

  it('returns normal indexable metadata when q is empty', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({ q: '' }) });
    expect(meta.robots).toBeUndefined();
  });

  it('returns normal indexable metadata when q is missing', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({}) });
    expect(meta.robots).toBeUndefined();
  });

  it('returns normal indexable metadata when q is whitespace-only', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({ q: '   ' }) });
    expect(meta.robots).toBeUndefined();
  });
});
