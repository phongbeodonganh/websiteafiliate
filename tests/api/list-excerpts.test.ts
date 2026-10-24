/**
 * PERF-01 / D-10 / D-11 — List API excerpt projection + content exclusion.
 *
 * Verifies that the public articles API:
 *   - Does NOT return the full `content` field in response data
 *   - Derives an excerpt fallback from stripped content when excerpt is empty
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';
import { GET } from '@/app/api/v1/public/articles/route';

async function seedArticle(title: string, excerpt: string, content: string) {
  const author = await UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });

  await ArticleModel.create({
    author_id: author._id,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    excerpt,
    content,
    status: 'published',
  });
}

function listRequest() {
  return new Request(new URL('http://localhost/api/v1/public/articles'));
}

describe('Public articles API — content exclusion + excerpt fallback (D-10, PERF-01)', () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it('excludes the content field from response data and uses seeded excerpt', async () => {
    await seedArticle('With Excerpt', 'Short summary', '<p>Full HTML content</p>');

    const res = await GET(listRequest());
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].content).toBeUndefined();
    expect(body.data[0].excerpt).toBe('Short summary');
  });

  it('derives excerpt from stripped content when excerpt is empty', async () => {
    await seedArticle('No Excerpt', '', '<p>Breaking news content here and more text follows.</p>');

    const res = await GET(listRequest());
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].content).toBeUndefined();
    expect(body.data[0].excerpt).toContain('Breaking news content here');
  });

  it('sets Cache-Control header to public s-maxage (not no-store)', async () => {
    await seedArticle('Cache Test', 'Summary', '<p>Content</p>');

    const res = await GET(listRequest());
    const cc = res.headers.get('cache-control');
    expect(cc).toContain('public');
    expect(cc).toContain('s-maxage=60');
    expect(cc).not.toContain('no-store');
  });
});
