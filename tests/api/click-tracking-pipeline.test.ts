/**
 * D-15 / AFF-02 — Affiliate click tracking pipeline regression test.
 *
 * Locks the full redirect → ClickLog → 302 + sub_id pipeline:
 *   - ClickLog captures ip_address, affiliate_link_id, clicked_at
 *   - Redirect returns 302 (not 307/301)
 *   - Location header contains base_url with sub_id = article slug
 *   - Location header contains utm_source and utm_medium
 *   - Affiliate CTA components carry rel="nofollow sponsored" + target="_blank"
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ArticleModel, ClickLogModel, UserModel } from '@/lib/db/models';
import { GET } from '@/app/api/v1/public/tracking/redirect/route';
import { _resetForTests } from '@/lib/rateLimit';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function seedLinkAndArticle() {
  await connectToDatabase();

  const author = await UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });

  const affiliateLink = await AffiliateLinkModel.create({
    name: 'Pipeline Test Affiliate',
    base_url: 'https://partner.test.com/offer',
    commission: '10%',
    cookie: '30 days',
    status: 'active',
  });

  const article = await ArticleModel.create({
    author_id: author._id,
    title: 'Pipeline Test Article',
    slug: 'my-article',
    content: '<p>content</p>',
    status: 'published',
  });

  return { affiliateLink, article };
}

function redirectRequest(articleId: string, affiliateLinkId: string) {
  const url = new URL('http://localhost/api/v1/public/tracking/redirect');
  url.searchParams.set('article_id', articleId);
  url.searchParams.set('affiliate_link_id', affiliateLinkId);
  return new Request(url.toString());
}

function readComponentSrc(filename: string) {
  return readFileSync(resolve(process.cwd(), `src/components/${filename}`), 'utf-8');
}

describe('Affiliate click tracking pipeline (D-15, AFF-02)', () => {
  beforeEach(() => {
    _resetForTests();
  });

  it('ClickLog captures ip_address (truthy, not null)', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    await GET(redirectRequest(article._id.toString(), affiliateLink._id.toString()));

    const logs = await ClickLogModel.find({ affiliate_link_id: affiliateLink._id }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].ip_address).toBeTruthy();
  });

  it('ClickLog captures clicked_at as a valid Date', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    await GET(redirectRequest(article._id.toString(), affiliateLink._id.toString()));

    const logs = await ClickLogModel.find({ affiliate_link_id: affiliateLink._id }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].clicked_at).toBeInstanceOf(Date);
    expect(logs[0].clicked_at).toBeTruthy();
  });

  it('redirect Location header contains base_url with sub_id set to article slug', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const res = await GET(redirectRequest(article._id.toString(), affiliateLink._id.toString()));
    const location = res.headers.get('location')!;

    expect(location).toContain('partner.test.com/offer');
    expect(location).toContain('sub_id=my-article');
  });

  it('redirect Location header contains utm_source=affiliate_news and utm_medium=content_cta', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const res = await GET(redirectRequest(article._id.toString(), affiliateLink._id.toString()));
    const location = res.headers.get('location')!;

    expect(location).toContain('utm_source=affiliate_news');
    expect(location).toContain('utm_medium=content_cta');
  });

  it('redirect returns HTTP 302', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const res = await GET(redirectRequest(article._id.toString(), affiliateLink._id.toString()));

    expect(res.status).toBe(302);
  });

  // Source-grep: CTA rel-attribute contract
  it('AffiliateCtaBlock.tsx carries rel="nofollow sponsored" and target="_blank"', () => {
    const src = readComponentSrc('AffiliateCtaBlock.tsx');
    expect(src).toContain('rel="nofollow sponsored"');
    expect(src).toContain('target="_blank"');
  });

  it('EditorVerdict.tsx carries rel="nofollow sponsored"', () => {
    const src = readComponentSrc('EditorVerdict.tsx');
    expect(src).toContain('rel="nofollow sponsored"');
  });

  it('StickyMobileBar.tsx carries rel="nofollow sponsored"', () => {
    const src = readComponentSrc('StickyMobileBar.tsx');
    expect(src).toContain('nofollow sponsored');
  });
});
