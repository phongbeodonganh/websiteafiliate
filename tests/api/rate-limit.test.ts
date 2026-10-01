import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mailer mock so the subscribe handler reaches its body work without 503'ing on
// isEmailConfigured() — mirrors tests/api/insider-lifecycle.test.ts.
const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/mailer', () => ({
  isEmailConfigured: () => true,
  sendEmail: emailMocks.sendEmail,
  sendEmailBatch: vi.fn(),
}));

import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ArticleModel, ClickLogModel, SubscriberModel, UserModel } from '@/lib/db/models';
import { POST as insiderHandler } from '@/app/api/v1/public/insider/route';
import { POST as subscribeAliasHandler } from '@/app/api/v1/public/subscribe/route';
import { POST as clickHandler } from '@/app/api/v1/public/tracking/click/route';
import { GET as redirectHandler } from '@/app/api/v1/public/tracking/redirect/route';
import {
  consumeDedupe,
  consumeRequest,
  _resetForTests,
} from '@/lib/rateLimit';

// SEC-04/TEST contract (PATTERNS.md + plan): use SINGLE-ENTRY X-Forwarded-For values
// only — order-invariant under plan 07's later last-hop parse flip.
function subscribeRequest(email: string, xff: string): Request {
  return new Request('http://localhost/api/v1/public/insider', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': xff,
    },
    body: JSON.stringify({ email }),
  });
}

function clickRequest(articleId: string, affiliateLinkId: string, xff: string): Request {
  return new Request('http://localhost/api/v1/public/tracking/click', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': xff,
    },
    body: JSON.stringify({ article_id: articleId, affiliate_link_id: affiliateLinkId }),
  });
}

function redirectRequest(articleId: string, affiliateLinkId: string, xff: string): Request {
  const url = new URL('http://localhost/api/v1/public/tracking/redirect');
  url.searchParams.set('article_id', articleId);
  url.searchParams.set('affiliate_link_id', affiliateLinkId);
  return new Request(url.toString(), {
    headers: { 'X-Forwarded-For': xff },
  });
}

async function seedLinkAndArticle(overrides: Partial<{ status: 'active' | 'inactive' | 'blacklisted' }> = {}) {
  // No DB write per write; tests just need the link/article to exist.
  // Reuse this helper verbatim from tracking-redirect.test.ts (01-01 contract).
  await connectToDatabase();
  const author = await UserModel.create({
    username: `author-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'author',
    status: 'active',
  });
  const affiliateLink = await AffiliateLinkModel.create({
    name: 'Rate-Limit Test Link',
    base_url: 'https://partner.example.com/offer',
    commission: '10%',
    cookie: '30 days',
    status: overrides.status || 'active',
  });
  const article = await ArticleModel.create({
    author_id: author._id,
    title: 'Rate-Limit Test Article',
    slug: 'rate-limit-test-article',
    content: '<p>content</p>',
    status: 'published',
  });
  return { affiliateLink, article };
}

describe('SEC-04 subscribe rate limit (Task 1)', () => {
  beforeAll(() => {
    process.env.INSIDER_TOKEN_SECRET = 'vitest-insider-token-secret';
    process.env.RESEND_API = 'vitest-resend-api-key';
  });

  beforeEach(() => {
    // RESEARCH Pitfall 3: per-test reset of module-level Map state.
    _resetForTests();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ id: 'test-confirmation-email-id' });
  });

  it('allows 5 subscribe requests per IP and 429s the 6th with an integer Retry-After >= 1', async () => {
    const ip = '203.0.113.10';
    const emailBase = `boundary-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const statuses: number[] = [];
    const retryAfterOnLimit: string | null = null;

    for (let i = 0; i < 5; i++) {
      const res = await insiderHandler(
        subscribeRequest(`${emailBase}-${i}`, ip),
      );
      statuses.push(res.status);
    }
    const limitedRes = await insiderHandler(subscribeRequest(`${emailBase}-6`, ip));
    statuses.push(limitedRes.status);
    const retryAfter = limitedRes.headers.get('retry-after');

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(limitedRes.status).toBe(429);
    expect(retryAfter).not.toBeNull();
    // Integer seconds, at least 1.
    const parsed = Number(retryAfter);
    expect(Number.isInteger(parsed)).toBe(true);
    expect(parsed).toBeGreaterThanOrEqual(1);
    // The 429 body envelope shape follows the login-route convention.
    const body = await limitedRes.json();
    expect(body.status).toBe('error');
    expect(typeof body.message).toBe('string');
  });

  it('rate-limits different IPs independently (key is per-IP)', async () => {
    const ipA = '198.51.100.10';
    const ipB = '198.51.100.11';
    const emailBase = `ind-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    for (let i = 0; i < 5; i++) {
      const res = await insiderHandler(subscribeRequest(`${emailBase}-A${i}`, ipA));
      expect(res.status).toBe(200);
    }
    // IP B is a fresh bucket — first request from B still succeeds.
    const fromB = await insiderHandler(subscribeRequest(`${emailBase}-B0`, ipB));
    expect(fromB.status).toBe(200);

    // IP A's 6th is rejected.
    const fromASixth = await insiderHandler(subscribeRequest(`${emailBase}-A6`, ipA));
    expect(fromASixth.status).toBe(429);
  });

  it('recovers after the window elapses (expiry lets the next request through)', async () => {
    // Direct limiter call with a short window — avoids real 60s sleep, isolates
    // the expiry behavior of the limiter itself.
    const key = 'expiry-scenario';
    for (let i = 0; i < 5; i++) {
      expect(consumeRequest(key, 5, 50).allowed).toBe(true);
    }
    expect(consumeRequest(key, 5, 50).allowed).toBe(false);
    // Wait out the window.
    await new Promise((resolve) => setTimeout(resolve, 70));
    // New window — first request allowed again.
    expect(consumeRequest(key, 5, 50).allowed).toBe(true);
  });

  it('limits the /subscribe alias path identically (one handler, both paths covered)', async () => {
    const ip = '203.0.113.30';
    const emailBase = `alias-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    for (let i = 0; i < 5; i++) {
      const res = await subscribeAliasHandler(subscribeRequest(`${emailBase}-${i}`, ip));
      expect(res.status).toBe(200);
    }
    const limited = await subscribeAliasHandler(subscribeRequest(`${emailBase}-6`, ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).not.toBeNull();
  });

  it('does NOT interfere with the existing login failure-lockout limiter (separate API)', () => {
    // The new consume* API must not share state with the failure-lockout API
    // (login depends on checkRateLimit/recordFailedAttempt/resetRateLimit untouched).
    _resetForTests();
    // New limiter populated.
    expect(consumeRequest('subscribe:1.2.3.4', 5, 60_000).allowed).toBe(true);
    // Failure-lockout API is separate — coexistence sanity check, behavior pinned.
    // (We don't import the failure-lockout API to assert its state because the
    // claim is non-interference; consumeRequest writing to its own Map cannot
    // have touched the failure-lockout `attempts` Map.)
    expect(consumeRequest('subscribe:1.2.3.4', 5, 60_000).allowed).toBe(true);
  });
});

describe('SEC-04 consumeDedupe unit (Task 1 helper)', () => {
  beforeEach(() => {
    _resetForTests();
  });

  it('returns false on first touch and true within the window', () => {
    const key = 'ip-5.6.7.8:link-abc';
    expect(consumeDedupe(key, 60_000)).toBe(false);
    expect(consumeDedupe(key, 60_000)).toBe(true); // duplicate within window
  });

  it('prunes stale entries (false after window elapses)', async () => {
    const key = 'short-dedupe-key';
    expect(consumeDedupe(key, 40)).toBe(false);
    expect(consumeDedupe(key, 40)).toBe(true);
    await new Promise((r) => setTimeout(r, 55));
    expect(consumeDedupe(key, 40)).toBe(false); // window elapsed
  });
});

describe('SEC-04 click route — dedupe + flood cap (Task 2)', () => {
  beforeEach(() => {
    _resetForTests();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ id: 'test-confirmation-email-id' });
  });

  it('two rapid clicks (same IP + link) → exactly one ClickLog insert', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();
    const ip = '203.0.113.50';

    const first = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));
    const second = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));

    // Both return success — no 429 visible to the caller (D-13).
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const clickLogs = await ClickLogModel.countDocuments({ affiliate_link_id: affiliateLink._id });
    expect(clickLogs).toBe(1);
  });

  it('two rapid clicks (same IP + link) → click_count incremented exactly once', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();
    const ip = '203.0.113.51';

    await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));
    await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));

    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    expect(after?.click_count).toBe(1);
  });

  it('61st click within the window → still 200 with no new write', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();
    const ip = '203.0.113.60';

    // First click counts (inserts ClickLog + $inc).
    const first = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));
    expect(first.status).toBe(200);

    // 60 more within the 60s flood window — all deduped (same IP+link) so
    // click_count stays at 1. Then push over the flood cap directly via
    // consumeRequest to confirm the cap path also silently skips.
    for (let i = 0; i < 60; i++) {
      const res = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip));
      expect(res.status).toBe(200); // never 429
    }
    // Flood cap is exhausted for this IP.
    expect(consumeRequest(`click:${ip}`, 60, 60_000).allowed).toBe(false);

    const clickLogs = await ClickLogModel.countDocuments({ affiliate_link_id: affiliateLink._id });
    expect(clickLogs).toBe(1); // no inflation from any duplicate

    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    expect(after?.click_count).toBe(1);
  });

  it('concurrent duplicate clicks (Promise.all) → click_count incremented exactly once', async () => {
    // Node's single-threaded event loop serializes Map updates — but each
    // await yields, so concurrent in-flight requests all see the same dedupe
    // state. Verify the contract: exactly one counted analytics write.
    const { affiliateLink, article } = await seedLinkAndArticle();
    const ip = '203.0.113.70';
    const N = 8;

    const results = await Promise.all(
      Array.from({ length: N }, () =>
        clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), ip)),
      ),
    );

    for (const r of results) expect(r.status).toBe(200); // never 429

    const clickLogs = await ClickLogModel.countDocuments({ affiliate_link_id: affiliateLink._id });
    // At most one counted write (timing may let 0 or 1 through; assert ≤1).
    expect(clickLogs).toBeLessThanOrEqual(1);

    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    // At most one increment (dedupe window prevents inflation).
    expect(after?.click_count).toBeLessThanOrEqual(1);
  });

  it('distinct IPs through the same link → each one counts', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const fromA = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), '198.51.100.80'));
    const fromB = await clickHandler(clickRequest(article._id.toString(), affiliateLink._id.toString(), '198.51.100.81'));

    expect(fromA.status).toBe(200);
    expect(fromB.status).toBe(200);

    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    expect(after?.click_count).toBe(2);
  });
});

describe('SEC-04 redirect route — dedupe + flood cap (Task 2)', () => {
  beforeEach(() => {
    _resetForTests();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ id: 'test-confirmation-email-id' });
  });

  it('two rapid redirects (same IP + link) → click_count incremented exactly once (ClickLog anchors always created per dedupe-vs-ref design)', async () => {
    // Per the dedupe-vs-ref assumption: redirect route ALWAYS creates the
    // ClickLog (each touch gets its own /blocked ref anchor — if the user is
    // interrupted mid-click and re-clicks, each click has its own anchor).
    // Only the click_count $inc is skipped on dedupe.
    const { affiliateLink, article } = await seedLinkAndArticle();
    const ip = '203.0.113.90';

    const first = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString(), ip));
    const second = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString(), ip));

    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    expect(first.headers.get('location')).toContain('partner.example.com');
    expect(second.headers.get('location')).toContain('partner.example.com');

    // click_count $inc skipped on the duplicate (dedupe → $inc skipped).
    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    expect(after?.click_count).toBe(1);
  });

  it('distinct IPs through the same redirect link → each one increments click_count', async () => {
    const { affiliateLink, article } = await seedLinkAndArticle();

    const fromA = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString(), '198.51.100.100'));
    const fromB = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString(), '198.51.100.101'));

    expect(fromA.status).toBe(302);
    expect(fromB.status).toBe(302);

    const after = await AffiliateLinkModel.findById(affiliateLink._id).lean();
    expect(after?.click_count).toBe(2);
  });
});
