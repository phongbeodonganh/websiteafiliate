import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel, ClickLogModel } from '@/lib/db/models';
import { proxy } from '@/proxy';
import BlockedPage from '@/app/blocked/page';

type SearchParams = { ref?: string | string[] };

/**
 * Seed the full click→blacklist chain in memory Mongo: an active blacklist row
 * matching the link domain, a blacklisted affiliate link, and a ClickLog whose
 * id is the `ref` the page resolves.
 */
async function seedBlockedClick() {
  await connectToDatabase();

  // Imported-sheet data: project name and reason arrive carrying markup-shaped
  // characters — exactly the attacker-influenced strings this page must render inert.
  const blacklist = await BlacklistModel.create({
    project_name: '<script>alert("xss")</script>Scam Signals Pro',
    website_url: 'https://scam-example.com',
    extracted_domain: 'scam-example.com',
    match_type: 'domain',
    reason: '<script>alert("reason")</script>Flagged for unpaid commissions',
    blocked_countries: ['VN', 'US'],
    status: 'active',
  });

  const affiliateLink = await AffiliateLinkModel.create({
    name: 'Scam Signals Offer',
    base_url: 'https://scam-example.com/offer',
    commission: '10%',
    cookie: '30 days',
    status: 'blacklisted',
  });

  const clickLog = await ClickLogModel.create({
    affiliate_link_id: affiliateLink._id,
    ip_address: '127.0.0.1',
  });

  return { blacklist, affiliateLink, clickLog };
}

/**
 * The page is a pure async RSC with zero hooks — safe to invoke directly in a
 * unit test. redirect() from next/navigation throws a NEXT_REDIRECT error,
 * which the state-matrix tests observe.
 */
async function renderBlockedPage(searchParams: SearchParams): Promise<string> {
  const element = await BlockedPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(element as ReactElement);
}

describe('/blocked page (SEC-03 / AFF-03)', () => {
  it('renders blacklist data as inert text for a blocked click', async () => {
    const { clickLog } = await seedBlockedClick();

    const html = await renderBlockedPage({ ref: clickLog._id.toString() });

    expect(html).toContain('We blocked this link to protect you');
    expect(html).toContain('Link blocked');
    expect(html).toContain('Scam Signals Pro');
    expect(html).toContain('Flagged for unpaid commissions');
    // Countries joined ', ' under the fixed label, in stored array order.
    expect(html).toContain('Blocked countries');
    expect(html).toContain('VN, US');
    expect(html).toContain('Return to the safe homepage');
    expect(html).toContain('AIDEALSUK / SECURITY');
    expect(html).toContain('Link disabled');
  });

  it('entity-encodes markup-shaped blacklist strings; raw tag sequences from data never render', async () => {
    const { clickLog } = await seedBlockedClick();

    const html = await renderBlockedPage({ ref: clickLog._id.toString() });

    // Data renders as React text children: markup characters are entity-encoded...
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Scam Signals Pro');
    // ...and the raw opening-bracket tag sequence derived from data never appears.
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it('carries the site CSP on /blocked via proxy() with zero proxy changes', () => {
    const request = new NextRequest('http://localhost:3000/blocked?ref=507f1f77bcf86cd799439011');
    const response = proxy(request);

    const csp = response.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });
});
