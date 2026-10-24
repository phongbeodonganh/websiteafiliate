/**
 * SEO-03 / PERF-01 / D-08 — Sitemap ISR correctness.
 *
 * Verifies that only published articles appear in the sitemap, not drafts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SettingModel, UserModel } from '@/lib/db/models';
import sitemap from '@/app/sitemap';

async function seedUser() {
  return UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });
}

async function seedArticle(authorId: string, slug: string, status: 'published' | 'draft' = 'published') {
  await ArticleModel.create({
    author_id: authorId,
    title: slug,
    slug,
    content: '<p>content</p>',
    status,
  });
}

describe('Sitemap ISR correctness (D-08, SEO-03)', () => {
  beforeEach(async () => {
    await connectToDatabase();
    await SettingModel.create({
      site_title: 'Test',
      canonicalUrl: 'https://test.example.com',
    });
  });

  it('includes only published articles in the sitemap', async () => {
    const author = await seedUser();
    await seedArticle(author._id.toString(), 'published-one');
    await seedArticle(author._id.toString(), 'published-two');
    await seedArticle(author._id.toString(), 'draft-one', 'draft');

    // CategoryModel may not have entries — sitemap aggregates, handle gracefully.
    const entries = await sitemap();

    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes('/article/published-one'))).toBe(true);
    expect(urls.some((u) => u.includes('/article/published-two'))).toBe(true);
    expect(urls.some((u) => u.includes('/article/draft-one'))).toBe(false);
  });
});
