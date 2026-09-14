import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel, ClickLogModel } from '@/lib/db/models';
import { proxy } from '@/proxy';
import BlockedPage from '@/app/blocked/page';

// DB-failure simulation for the fail-closed state: the mock passes through to
// the real connection unless the test flips the flag.
const dbState = vi.hoisted(() => ({ failConnections: false }));
vi.mock('@/lib/db/mongodb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/mongodb')>();
  return {
    ...actual,
    connectToDatabase: async () => {
      if (dbState.failConnections) {
        throw new Error('Simulated DB outage (test)');
      }
      return actual.connectToDatabase();
    },
  };
});

type SearchParams = { ref?: string | string[] };

// Source contract target — read once (T-1-01 enforcement below).
const pageSource = readFileSync(join(process.cwd(), 'src', 'app', 'blocked', 'page.tsx'), 'utf8');

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

type RenderResult = { html?: string; redirectDigest?: string };

/**
 * The page is a pure async RSC with zero hooks — safe to invoke directly in a
 * unit test. redirect() from next/navigation throws a NEXT_REDIRECT error whose
 * digest is `NEXT_REDIRECT;<type>;<url>;<status>;` — surfaced for state assertions.
 */
async function renderBlockedPageResult(searchParams: SearchParams): Promise<RenderResult> {
  try {
    const element = await BlockedPage({ searchParams: Promise.resolve(searchParams) });
    return { html: renderToStaticMarkup(element as ReactElement) };
  } catch (error) {
    const digest = (error as { digest?: unknown })?.digest;
    return { redirectDigest: digest === undefined ? undefined : String(digest) };
  }
}

async function renderBlockedPage(searchParams: SearchParams): Promise<string> {
  const { html } = await renderBlockedPageResult(searchParams);
  if (html === undefined) {
    throw new Error('Expected the blocked page to render, but it redirected instead');
  }
  return html;
}

function expectHomeRedirect(result: RenderResult): void {
  expect(result.redirectDigest).toMatch(/^NEXT_REDIRECT;/);
  // digest shape: NEXT_REDIRECT;<type>;<url>;<status>; — url must be exactly '/'
  expect(result.redirectDigest!.split(';')[2]).toBe('/');
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

describe('/blocked state matrix (UI-SPEC Interaction & Security Contract)', () => {
  it('redirects a repeated (array-valued) ref home before any DB call', async () => {
    const findByIdSpy = vi.spyOn(ClickLogModel, 'findById');
    try {
      const result = await renderBlockedPageResult({
        ref: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      });
      expectHomeRedirect(result);
      expect(findByIdSpy).not.toHaveBeenCalled();
    } finally {
      findByIdSpy.mockRestore();
    }
  });

  it('redirects an unknown ref (valid 24-hex, no ClickLog row) home', async () => {
    const result = await renderBlockedPageResult({ ref: '507f1f77bcf86cd799439099' });
    expectHomeRedirect(result);
  });

  it('redirects home when the link is no longer blacklisted (race-tolerant re-resolution)', async () => {
    await connectToDatabase();
    const affiliateLink = await AffiliateLinkModel.create({
      name: 'Recovered Offer',
      base_url: 'https://recovered-example.com/offer',
      status: 'active',
    });
    const clickLog = await ClickLogModel.create({ affiliate_link_id: affiliateLink._id });

    const result = await renderBlockedPageResult({ ref: clickLog._id.toString() });
    expectHomeRedirect(result);
  });

  it('applies the default block reason when the DB reason is empty and omits the countries row when the list is empty', async () => {
    await connectToDatabase();
    const blacklist = await BlacklistModel.create({
      project_name: 'Minimal Signals',
      website_url: 'https://minimal-example.com',
      extracted_domain: 'minimal-example.com',
      match_type: 'domain',
      reason: 'seed-reason-to-be-cleared',
      blocked_countries: [],
      status: 'active',
    });
    // Imported sheet delivered an empty reason — bypass validators to store ''.
    await BlacklistModel.updateOne({ _id: blacklist._id }, { $set: { reason: '' } });

    const affiliateLink = await AffiliateLinkModel.create({
      name: 'Minimal Signals Offer',
      base_url: 'https://minimal-example.com/offer',
      status: 'blacklisted',
    });
    const clickLog = await ClickLogModel.create({ affiliate_link_id: affiliateLink._id });

    const html = await renderBlockedPage({ ref: clickLog._id.toString() });

    expect(html).toContain('Flagged by the AIDEALSUK safety review');
    expect(html).not.toContain('seed-reason-to-be-cleared');
    // Empty country list → the whole row is omitted (no empty "Blocked countries" row).
    expect(html).not.toContain('Blocked countries');
  });

  it('renders fail-closed copy on DB failure — never a redirect, never a crash screen', async () => {
    const { clickLog } = await seedBlockedClick();
    dbState.failConnections = true;
    try {
      const { html, redirectDigest } = await renderBlockedPageResult({
        ref: clickLog._id.toString(),
      });

      // No NEXT_REDIRECT bounce (in particular, never to an offer URL).
      expect(redirectDigest).toBeUndefined();
      expect(html).toBeTruthy();
      expect(html).toContain('verify this destination');
      expect(html).toContain('blocked as a precaution');
      // Fail-closed receipt: Project row shows Unavailable + default reason.
      expect(html).toContain('Unavailable');
      expect(html).toContain('Flagged by the AIDEALSUK safety review');
      // No internal data leaks through the failure path.
      expect(html).not.toContain('Scam Signals Pro');
    } finally {
      dbState.failConnections = false;
    }
  });
});

describe('/blocked accessibility contract (UI-SPEC rule 8)', () => {
  it('wraps content in <main>, labels the H1, and hides decoration from assistive tech', async () => {
    const { clickLog } = await seedBlockedClick();

    const html = await renderBlockedPage({ ref: clickLog._id.toString() });

    expect(html).toContain('<main');
    expect(html).toContain('aria-labelledby="blocked-title"');
    expect(html).toContain('id="blocked-title"');
    // Status mark + backdrop grid are aria-hidden.
    expect(html).toContain('aria-hidden="true"');
  });

  it('carries the accent focus-visible ring and reduced-motion hover disable', () => {
    // 3px solid #B91C1C with 3px offset (matching result.module.css convention)
    expect(pageSource).toContain('[outline:3px_solid_#B91C1C]');
    expect(pageSource).toContain('[outline-offset:3px]');
    // Hover lift disabled under prefers-reduced-motion (inherited convention)
    expect(pageSource).toContain('motion-reduce:hover:translate-y-0');
  });
});

describe('/blocked security source contract (T-1-01)', () => {
  it('never renders data through a raw-HTML mechanism (dangerouslySetInnerHTML banned)', () => {
    expect(pageSource).not.toContain('dangerouslySetInnerHTML');
  });

  it('introduces no third-party origin (no absolute http(s) URL in the page source)', () => {
    // Only relative hrefs and the inline SVG status mark are allowed.
    expect(pageSource).not.toMatch(/https?:\/\//);
  });

  it('stays non-indexable (robots noindex metadata)', () => {
    expect(pageSource).toContain('robots: { index: false, follow: false }');
  });
});
