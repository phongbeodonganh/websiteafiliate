/**
 * PERF-02 / D-01/D-02/D-03 — view counting via atomic $inc with IP+article dedupe.
 *
 * Pins the semantics that replace the old read-modify-write article.save():
 *   - First call for a given articleId+ip increments view_count by 1
 *   - Second call within the 60s dedupe window does NOT increment
 *   - Different IP for the same article increments independently
 *   - Invalid articleId does not throw (updateOne is a no-op on bad ObjectId)
 *
 * Called directly — no Next request context — so after() never enters this
 * path (RESEARCH Pitfall 1).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';
import { _resetForTests, recordView } from '@/lib/view-count';

async function seedArticle() {
  await connectToDatabase();

  const author = await UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });

  const article = await ArticleModel.create({
    author_id: author._id,
    title: 'View Count Test Article',
    slug: `view-count-test-${Date.now()}-${Math.random()}`,
    content: '<p>content</p>',
    status: 'published',
  });

  return { author, article };
}

describe('recordView — atomic $inc with IP+article dedupe (D-01, PERF-02)', () => {
  beforeEach(() => {
    _resetForTests();
  });

  it('increments view_count by exactly 1 on the first call', async () => {
    const { article } = await seedArticle();

    await recordView(article._id.toString(), '203.0.113.1');

    const after = await ArticleModel.findById(article._id).lean();
    expect(after?.view_count).toBe(1);
  });

  it('skips the increment on a duplicate call within the 60s dedupe window', async () => {
    const { article } = await seedArticle();
    const id = article._id.toString();

    await recordView(id, '203.0.113.2');
    await recordView(id, '203.0.113.2');
    await recordView(id, '203.0.113.2');
    await recordView(id, '203.0.113.2');
    await recordView(id, '203.0.113.2');

    const after = await ArticleModel.findById(article._id).lean();
    // Five rapid requests from the same IP within the window → exactly 1.
    expect(after?.view_count).toBe(1);
  });

  it('increments independently from a different IP', async () => {
    const { article } = await seedArticle();
    const id = article._id.toString();

    await recordView(id, '203.0.113.10');
    await recordView(id, '203.0.113.11');

    const after = await ArticleModel.findById(article._id).lean();
    expect(after?.view_count).toBe(2);
  });

  it('does not throw on an invalid articleId (updateOne no-op)', async () => {
    await expect(recordView('not-a-valid-objectid', '203.0.113.99')).resolves.toBeUndefined();
  });
});
