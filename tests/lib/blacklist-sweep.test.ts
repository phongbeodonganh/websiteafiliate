/**
 * AFF-04 / D-05/D-06/D-07 — batch sweep + restore sweep (pure lib functions).
 *
 * Pins the sweep semantics that replace the old per-link `save()` loop:
 *   - `sweepDomains(['badsite.com'])` marks `badsite.com` and `sub.badsite.com`
 *     blacklisted, and leaves the substring look-alikes (`notbadsite.com`,
 *     `badsite.com.evil.net`) and a manually-`inactive` link untouched
 *     (boundary-safe matching, Pitfall 3 / T-02-14).
 *   - A second run reports 0 modified — the sweep is idempotent.
 *   - `restoreSweep()` flips only a `blacklisted` link that no longer matches any
 *     active blacklist entry back to `active`, and never touches an `inactive` link
 *     (Pitfall 4 / T-02-15).
 *
 * These are called directly — no Next request context — so `after()` never enters
 * this path (RESEARCH Pitfall 1).
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel } from '@/lib/db/models';
import { sweepDomains, restoreSweep, sweepBlacklistAndRestore } from '@/lib/blacklist';

async function seedLink(name: string, baseUrl: string, status: 'active' | 'inactive' | 'blacklisted' = 'active') {
  return AffiliateLinkModel.create({ name, base_url: baseUrl, status });
}

async function seedBlacklist(domain: string) {
  return BlacklistModel.create({
    website_url: `https://${domain}`,
    extracted_domain: domain,
    reason: 'test',
    match_type: 'domain',
    status: 'active',
  });
}

describe('sweepDomains — boundary-safe batch sweep (D-06, T-02-14)', () => {
  it('marks exact + subdomain matches blacklisted, leaves substring look-alikes and inactive untouched', async () => {
    await connectToDatabase();

    const exact = await seedLink('exact', 'https://badsite.com/x');
    const sub = await seedLink('sub', 'https://sub.badsite.com/x');
    const substring = await seedLink('substring', 'https://notbadsite.com/x');
    const suffixEvil = await seedLink('suffix-evil', 'https://badsite.com.evil.net/x');
    const inactive = await seedLink('inactive', 'https://badsite.com/promo', 'inactive');

    const result = await sweepDomains(['badsite.com']);

    expect(result.swept).toBe(2);
    expect((await AffiliateLinkModel.findById(exact._id))?.status).toBe('blacklisted');
    expect((await AffiliateLinkModel.findById(sub._id))?.status).toBe('blacklisted');
    expect((await AffiliateLinkModel.findById(substring._id))?.status).toBe('active');
    expect((await AffiliateLinkModel.findById(suffixEvil._id))?.status).toBe('active');
    // `inactive` is a manual decision — never swept.
    expect((await AffiliateLinkModel.findById(inactive._id))?.status).toBe('inactive');
  });

  it('is idempotent — a second run reports 0 modified', async () => {
    await connectToDatabase();
    await seedLink('exact', 'https://badsite.com/x');

    const first = await sweepDomains(['badsite.com']);
    const second = await sweepDomains(['badsite.com']);

    expect(first.swept).toBe(1);
    expect(second.swept).toBe(0);
  });

  it('no-ops on an empty domain list and never throws', async () => {
    await connectToDatabase();
    await seedLink('active', 'https://badsite.com/x');

    const result = await sweepDomains([]);
    expect(result.swept).toBe(0);
    expect((await AffiliateLinkModel.findOne({ name: 'active' }))?.status).toBe('active');
  });
});

describe('restoreSweep — reversible, never resurrects inactive (D-07, T-02-15)', () => {
  it('flips a no-longer-matching blacklisted link to active and leaves inactive alone', async () => {
    await connectToDatabase();

    // active blacklist entry still matches `blocked.com`
    await seedBlacklist('blocked.com');

    const stillBlocked = await seedLink('still-blocked', 'https://blocked.com/x', 'blacklisted');
    const noLongerMatching = await seedLink('orphan', 'https://orphan.com/x', 'blacklisted');
    const manuallyInactive = await seedLink('inactive', 'https://blocked.com/promo', 'inactive');

    const result = await restoreSweep();

    expect(result.restored).toBe(1);
    expect((await AffiliateLinkModel.findById(stillBlocked._id))?.status).toBe('blacklisted');
    expect((await AffiliateLinkModel.findById(noLongerMatching._id))?.status).toBe('active');
    // Never resurrect a manually-deactivated campaign.
    expect((await AffiliateLinkModel.findById(manuallyInactive._id))?.status).toBe('inactive');
  });

  it('sweepBlacklistAndRestore sweeps matches and restores orphans in one action', async () => {
    await connectToDatabase();
    await seedBlacklist('badsite.com');

    const match = await seedLink('match', 'https://badsite.com/x');
    const orphan = await seedLink('orphan', 'https://orphan.com/x', 'blacklisted');
    const manuallyInactive = await seedLink('inactive', 'https://badsite.com/promo', 'inactive');

    const result = await sweepBlacklistAndRestore();

    expect(result.swept).toBe(1);
    expect(result.restored).toBe(1);
    expect((await AffiliateLinkModel.findById(match._id))?.status).toBe('blacklisted');
    expect((await AffiliateLinkModel.findById(orphan._id))?.status).toBe('active');
    expect((await AffiliateLinkModel.findById(manuallyInactive._id))?.status).toBe('inactive');
  });
});
