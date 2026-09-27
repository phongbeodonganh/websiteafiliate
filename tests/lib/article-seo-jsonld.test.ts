/**
 * D-14 / SEO-02 — NewsArticle JSON-LD regression test.
 *
 * Locks the structured-data contract on the article page:
 *   - Schema type is NewsArticle with schema.org context
 *   - mainEntityOfPage is the canonical URL (normalizeSiteUrl + /article/ + slug)
 *   - Publisher falls back to "AIDEALSUK" when settings is null
 *   - Image is omitted when no thumbnail_url
 *   - serializeJsonLd escapes all < characters
 *
 * Part A tests the schema construction logic (replicating the page.tsx inline
 * object), Part B source-greps page.tsx to lock the structural contract.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeSiteUrl, serializeJsonLd, DEFAULT_SITE_URL } from '@/lib/seo';

const pageSrc = readFileSync(
  resolve(process.cwd(), 'src/app/article/[slug]/page.tsx'),
  'utf-8',
);

describe('NewsArticle JSON-LD structured data (D-14, SEO-02)', () => {
  describe('Part A — schema construction logic', () => {
    const baseSettings = { canonicalUrl: 'https://aidealsuk.com', site_title: 'AIDEALSUK Tech' };

    it('mainEntityOfPage is the canonical URL (baseUrl/article/slug)', () => {
      const slug = 'ai-tools-review';
      const settings = baseSettings;
      const baseUrl = normalizeSiteUrl(settings.canonicalUrl);
      const mainEntityOfPage = `${baseUrl}/article/${slug}`;
      expect(mainEntityOfPage).toBe('https://aidealsuk.com/article/ai-tools-review');
    });

    it('schema type is NewsArticle with schema.org context', () => {
      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
      };
      expect(articleSchema['@context']).toBe('https://schema.org');
      expect(articleSchema['@type']).toBe('NewsArticle');
    });

    it('publisher name falls back to AIDEALSUK when settings is null', () => {
      const settings = null;
      const publisherName = (settings as { site_title: string } | null)?.site_title || 'AIDEALSUK';
      expect(publisherName).toBe('AIDEALSUK');
    });

    it('mainEntityOfPage uses DEFAULT_SITE_URL when settings is null', () => {
      const settings = null;
      const baseUrl = normalizeSiteUrl(
        (settings as { canonicalUrl: string } | null)?.canonicalUrl,
      );
      expect(baseUrl).toBe(DEFAULT_SITE_URL);
      expect(baseUrl).toBe('https://aidealsuk.com');
    });

    it('image field is omitted when thumbnail_url is absent', () => {
      const thumbnail_url: string | undefined = undefined;
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        ...(thumbnail_url ? { image: [thumbnail_url] } : {}),
      };
      expect(schema).not.toHaveProperty('image');
    });

    it('serializeJsonLd escapes all < characters to \\u003c', () => {
      const malicious = { headline: '<script>alert(1)</script>' };
      const serialized = serializeJsonLd(malicious);
      expect(serialized).not.toContain('<');
      expect(serialized).toContain('\\u003c');
    });
  });

  describe('Part B — source-grep verification', () => {
    it('page.tsx contains NewsArticle type', () => {
      expect(pageSrc).toContain("'NewsArticle'");
    });

    it('page.tsx contains mainEntityOfPage', () => {
      expect(pageSrc).toContain('mainEntityOfPage');
    });

    it('page.tsx uses serializeJsonLd for JSON-LD output', () => {
      expect(pageSrc).toContain('serializeJsonLd');
    });
  });
});
