/**
 * D-04 / D-09 — CMS cache bust wiring verification.
 *
 * Verifies that revalidateArticle and revalidateSitemap are callable without
 * throwing (the vitest guard catches the revalidateTag invariant error), and
 * that both function names appear in the CMS article route source files.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { revalidateArticle, revalidateSitemap } from '@/lib/cache-revalidation';

const cmsArticlesRoute = readFileSync(
  resolve(process.cwd(), 'src/app/api/v1/cms/articles/route.ts'),
  'utf-8',
);
const cmsArticlesIdRoute = readFileSync(
  resolve(process.cwd(), 'src/app/api/v1/cms/articles/[id]/route.ts'),
  'utf-8',
);

describe('CMS cache bust wiring (D-04, D-09)', () => {
  it('revalidateArticle does not throw under vitest guard', () => {
    expect(() => revalidateArticle('test-slug')).not.toThrow();
  });

  it('revalidateSitemap does not throw under vitest guard', () => {
    expect(() => revalidateSitemap()).not.toThrow();
  });

  it('POST route (cms/articles/route.ts) wires revalidateArticle', () => {
    expect(cmsArticlesRoute).toContain('revalidateArticle');
  });

  it('POST route (cms/articles/route.ts) wires revalidateSitemap', () => {
    expect(cmsArticlesRoute).toContain('revalidateSitemap');
  });

  it('PUT/DELETE route (cms/articles/[id]/route.ts) wires revalidateArticle', () => {
    expect(cmsArticlesIdRoute).toContain('revalidateArticle');
  });

  it('PUT/DELETE route (cms/articles/[id]/route.ts) wires revalidateSitemap', () => {
    expect(cmsArticlesIdRoute).toContain('revalidateSitemap');
  });
});
