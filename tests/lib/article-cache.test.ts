/**
 * PERF-01 / D-04/D-05/D-06/D-07 — article page fetch caching.
 *
 * Verifies that fetchArticlePageData exists, returns data for a published
 * article, returns null for a missing slug, and that calling it twice
 * (simulating generateMetadata + page body sharing a request) does not throw.
 *
 * Since unstable_cache does not activate in vitest (no Next.js runtime), the
 * React.cache() per-request dedup and the unstable_cache cross-request cache
 * are not exercised here — the inner loadArticlePageData runs directly.
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';

// Import the module under test — fetchArticlePageData is exported from the
// article page module. It wraps React.cache() + unstable_cache() around the
// inner loadArticlePageData function.
import { fetchArticlePageData } from '@/app/article/[slug]/page';

async function seedArticle() {
  await connectToDatabase();

  const author = await UserModel.create({
    username: `cache-author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });

  const article = await ArticleModel.create({
    author_id: author._id,
    title: 'Cache Test Article',
    slug: `cache-test-${Date.now()}-${Math.random()}`,
    content: '<p>content for caching</p>',
    status: 'published',
  });

  return article;
}

describe('fetchArticlePageData — React.cache() + unstable_cache() wrapper (D-04, D-07)', () => {
  it('returns article page data for a valid published slug', async () => {
    const article = await seedArticle();

    const data = await fetchArticlePageData(article.slug);

    expect(data).not.toBeNull();
    expect(data!.doc).toBeTruthy();
    expect((data!.doc as Record<string, unknown>).title as string).toBe('Cache Test Article');
  });

  it('returns null for a slug that does not exist', async () => {
    const data = await fetchArticlePageData('nonexistent-slug-xyz');
    expect(data).toBeNull();
  });

  it('can be called twice without throwing (per-request dedup pattern)', async () => {
    const article = await seedArticle();

    const first = await fetchArticlePageData(article.slug);
    const second = await fetchArticlePageData(article.slug);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Both calls return the article data.
    expect((first!.doc as Record<string, unknown>).title as string).toBe('Cache Test Article');
    expect((second!.doc as Record<string, unknown>).title as string).toBe('Cache Test Article');
  });
});
