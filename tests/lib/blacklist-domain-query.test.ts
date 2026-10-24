/**
 * D-16 — Domain-indexed blacklist query regression test.
 *
 * Verifies that checkUrlAgainstBlacklist queries by extracted_domain via
 * `{ $in: [hostname, rootDomain] }` instead of loading all active entries.
 * Covers: exact domain match, subdomain wildcard match, safe domain,
 * inactive entry not returned, and empty input guard.
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel } from '@/lib/db/models';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function seedBlacklist(
  domain: string,
  opts: { matchType?: 'domain' | 'exact_url'; status?: 'active' | 'inactive'; websiteUrl?: string } = {},
) {
  return BlacklistModel.create({
    website_url: opts.websiteUrl ?? `https://${domain}`,
    extracted_domain: domain,
    reason: 'test blacklist entry',
    match_type: opts.matchType ?? 'domain',
    status: opts.status ?? 'active',
  });
}

const blacklistSrc = readFileSync(
  resolve(process.cwd(), 'src/lib/blacklist.ts'),
  'utf-8',
);

describe('checkUrlAgainstBlacklist — domain-indexed query (D-16)', () => {
  it('returns isBlacklisted:true when URL domain matches an active entry', async () => {
    await connectToDatabase();
    await seedBlacklist('evil.com');

    const result = await checkUrlAgainstBlacklist('https://evil.com/offer');

    expect(result.isBlacklisted).toBe(true);
    expect(result.matchedDomain).toBe('evil.com');
  });

  it('matches wildcard subdomain (sub.evil.com matches blacklist for evil.com)', async () => {
    await connectToDatabase();
    await seedBlacklist('evil.com');

    const result = await checkUrlAgainstBlacklist('https://sub.evil.com/path');

    expect(result.isBlacklisted).toBe(true);
    expect(result.matchedDomain).toBe('evil.com');
  });

  it('returns isBlacklisted:false for a safe domain', async () => {
    await connectToDatabase();
    await seedBlacklist('evil.com');
    await seedBlacklist('scam-site.org');

    const result = await checkUrlAgainstBlacklist('https://safe-site.com/');

    expect(result.isBlacklisted).toBe(false);
  });

  it('does not match inactive blacklist entries', async () => {
    await connectToDatabase();
    await seedBlacklist('notreallyblocked.net', { status: 'inactive' });

    const result = await checkUrlAgainstBlacklist('https://notreallyblocked.net/');

    expect(result.isBlacklisted).toBe(false);
  });

  it('returns isBlacklisted:false for empty input without querying DB', async () => {
    const result = await checkUrlAgainstBlacklist('');
    expect(result.isBlacklisted).toBe(false);
  });

  // Source-level regression: confirms the indexed query pattern exists in the code
  it('blacklist.ts uses indexed extracted_domain $in query', () => {
    expect(blacklistSrc).toContain('$in: [hostname, rootDomain]');
    expect(blacklistSrc).toContain("extracted_domain: { $in: [hostname, rootDomain] },");
  });
});
