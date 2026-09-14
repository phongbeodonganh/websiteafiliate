import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ArticleModel, ClickLogModel, UserModel } from '@/lib/db/models';
import { GET as redirectHandler } from '@/app/api/v1/public/tracking/redirect/route';

async function seedLinkAndArticle(overrides: Partial<{ status: 'active' | 'inactive' | 'blacklisted' }> = {}) {
  await connectToDatabase();

  const author = await UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });

  const affiliateLink = await AffiliateLinkModel.create({
    name: 'Test Affiliate',
    base_url: 'https://partner.example.com/offer',
    commission: '10%',
    cookie: '30 days',
    status: overrides.status || 'active',
  });

  const article = await ArticleModel.create({
    author_id: author._id,
    title: 'Tracking Test Article',
    slug: 'tracking-test-article',
    content: '<p>content</p>',
    status: 'published',
  });

  return { affiliateLink, article };
}

function redirectRequest(articleId?: string, affiliateLinkId?: string) {
  const url = new URL('http://localhost/api/v1/public/tracking/redirect');
  if (articleId) url.searchParams.set('article_id', articleId);
  if (affiliateLinkId) url.searchParams.set('affiliate_link_id', affiliateLinkId);
  return new Request(url.toString());
}

describe('GET /api/v1/public/tracking/redirect', () => {
  it('creates a ClickLog and redirects to the affiliate base_url on a valid click', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const res = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString()));

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toContain('partner.example.com/offer');

    const logs = await ClickLogModel.find({ affiliate_link_id: affiliateLink._id });
    expect(logs).toHaveLength(1);
    expect(logs[0].article_id?.toString()).toBe(article._id.toString());
  });

  it('redirects to the homepage fallback and creates no ClickLog for a missing affiliate_link_id', async () => {
    const before = await ClickLogModel.countDocuments();

    const res = await redirectHandler(redirectRequest(undefined, undefined));

    expect(res.status).toBe(302); // explicit 302 — consistent with all other branches
    const location = res.headers.get('location');
    expect(location).toMatch(/\/$/);

    const after = await ClickLogModel.countDocuments();
    expect(after).toBe(before);
  });

  it('redirects to the homepage fallback and creates no ClickLog for a non-existent affiliate_link_id', async () => {
    const before = await ClickLogModel.countDocuments();
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await redirectHandler(redirectRequest(undefined, fakeId));

    const location = res.headers.get('location');
    expect(location).toMatch(/\/$/);

    const after = await ClickLogModel.countDocuments();
    expect(after).toBe(before);
  });

  it('redirects a blacklisted affiliate link to /blocked?ref=<24-hex> with no-store, never to the offer', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle({ status: 'blacklisted' });

    const res = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString()));

    // Blacklisted links 302 to the /blocked intermediate page (D-11), never to the real offer.
    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const locationUrl = new URL(location!);
    expect(locationUrl.pathname).toBe('/blocked');
    // Only a server-generated 24-hex ObjectId travels through the URL (D-10).
    expect(locationUrl.searchParams.get('ref')).toMatch(/^[0-9a-fA-F]{24}$/);
    expect(res.headers.get('cache-control')).toBe('no-store');

    // A blacklisted link still logs the click attempt (created before the blacklist check runs).
    const logs = await ClickLogModel.find({ affiliate_link_id: affiliateLink._id });
    expect(logs).toHaveLength(1);
  });
});
