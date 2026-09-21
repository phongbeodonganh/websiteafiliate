import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel, AffiliateLinkModel } from '@/lib/db/models';

/**
 * Extract root domain and hostname from any URL string or raw domain input.
 * Examples:
 *   "https://www.hubspot.com/partners/affiliates" -> { hostname: "hubspot.com", rootDomain: "hubspot.com" }
 *   "sub.badsite.co.uk/register?ref=123" -> { hostname: "sub.badsite.co.uk", rootDomain: "badsite.co.uk" }
 *   "nordvpn.com" -> { hostname: "nordvpn.com", rootDomain: "nordvpn.com" }
 */
export function extractDomainFromUrl(urlStr: string): { hostname: string; rootDomain: string; fullUrl: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { hostname: '', rootDomain: '', fullUrl: '' };
  }

  let cleaned = urlStr.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname.toLowerCase();
    
    // Remove www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Extract root domain (simple & effective tld split)
    const parts = hostname.split('.');
    let rootDomain = hostname;
    if (parts.length > 2) {
      // Check for 2-part TLDs like co.uk, com.vn, org.uk
      const secondLast = parts[parts.length - 2];
      if (['co', 'com', 'net', 'org', 'edu', 'gov'].includes(secondLast) && parts.length >= 3) {
        rootDomain = parts.slice(-3).join('.');
      } else {
        rootDomain = parts.slice(-2).join('.');
      }
    }

    return {
      hostname,
      rootDomain,
      fullUrl: parsed.href,
    };
  } catch (err) {
    const rawClean = urlStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return {
      hostname: rawClean,
      rootDomain: rawClean,
      fullUrl: urlStr,
    };
  }
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  projectName?: string;
  matchedDomain?: string;
  reason?: string;
  blockedCountries?: string[];
  matchType?: 'domain' | 'exact_url';
}

/**
 * Perform a real-time cross-check against active MongoDB Blacklist entries.
 */
export async function checkUrlAgainstBlacklist(urlStr: string): Promise<BlacklistCheckResult> {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isBlacklisted: false };
  }

  await connectToDatabase();

  const { hostname, rootDomain, fullUrl } = extractDomainFromUrl(urlStr);
  if (!hostname && !rootDomain) {
    return { isBlacklisted: false };
  }

  // Retrieve active blacklists
  const activeBlacklists = await BlacklistModel.find({ status: 'active' });

  for (const item of activeBlacklists) {
    const targetDomain = (item.extracted_domain || item.website_url || '').toLowerCase().trim();
    const itemFullUrl = (item.website_url || '').toLowerCase().trim();

    if (item.match_type === 'exact_url') {
      // Exact URL Match
      if (
        fullUrl.toLowerCase() === itemFullUrl ||
        urlStr.toLowerCase() === itemFullUrl ||
        fullUrl.toLowerCase().startsWith(itemFullUrl)
      ) {
        return {
          isBlacklisted: true,
          projectName: item.project_name || item.extracted_domain,
          matchedDomain: item.extracted_domain,
          reason: item.reason || 'Flagged by the AIDEALSUK safety review — fraud or unpaid commissions.',
          blockedCountries: item.blocked_countries || [],
          matchType: 'exact_url',
        };
      }
    } else {
      // Domain Wildcard Match (matches root domain or subdomains)
      const { hostname: itemHost, rootDomain: itemRoot } = extractDomainFromUrl(targetDomain);

      if (
        hostname === itemHost ||
        rootDomain === itemRoot ||
        hostname.endsWith('.' + itemRoot) ||
        hostname.endsWith('.' + itemHost) ||
        itemHost.endsWith('.' + hostname)
      ) {
        return {
          isBlacklisted: true,
          projectName: item.project_name || item.extracted_domain,
          matchedDomain: item.extracted_domain || itemRoot,
          reason: item.reason || 'Flagged by the AIDEALSUK safety review — fraud or unpaid commissions.',
          blockedCountries: item.blocked_countries || [],
          matchType: 'domain',
        };
      }
    }
  }

  return { isBlacklisted: false };
}

/**
 * Boundary-safe domain matcher (D-06 / T-02-14).
 *
 * Builds a predicate that matches a `base_url` against a blacklisted domain using
 * hostname equality / subdomain suffix semantics — the same discipline
 * `checkUrlAgainstBlacklist` already uses. A raw substring `$regex` on `base_url`
 * over-matches: `badsite.com` would also match `https://notbadsite.com/x` and
 * `https://badsite.com.evil.net/x`, which would deactivate legitimate, unrelated
 * campaigns (Pitfall 3). This matcher never compiles a RegExp from user-supplied
 * text, so it also closes the sheet-supplied-domain ReDoS path (T-02-13).
 */
export function buildDomainMatcher(targetDomainOrUrl: string): (baseUrl: string) => boolean {
  const { hostname: targetHost, rootDomain: targetRoot } = extractDomainFromUrl(targetDomainOrUrl);
  const targets = Array.from(new Set([targetHost, targetRoot].filter(Boolean)));

  return (baseUrl: string): boolean => {
    if (!baseUrl || typeof baseUrl !== 'string') return false;
    const { hostname } = extractDomainFromUrl(baseUrl);
    if (!hostname) return false;
    for (const target of targets) {
      if (hostname === target || hostname.endsWith('.' + target)) return true;
    }
    return false;
  };
}

/**
 * Batch retroactive sweep (D-05/D-06): for each unique domain, mark every currently
 * active affiliate link whose hostname matches it as `blacklisted` with exactly one
 * `updateMany` — never a per-link `save()` loop. Idempotent: a second run reports 0.
 * Errors are logged with a context prefix and never thrown to the caller, because
 * the sweep may run as post-response background work (Pitfall 2).
 */
export async function sweepDomains(domains: string[]): Promise<{ swept: number }> {
  const uniqueDomains = Array.from(
    new Set((domains || []).map((d) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean))
  );
  if (uniqueDomains.length === 0) return { swept: 0 };

  try {
    await connectToDatabase();

    // One candidate read for the whole batch; boundary filtering happens in JS so
    // no user-supplied text is ever compiled into a RegExp.
    const candidates = await AffiliateLinkModel.find({ status: 'active' }).select('_id base_url');

    let swept = 0;
    for (const domain of uniqueDomains) {
      const matches = buildDomainMatcher(domain);
      const ids = candidates.filter((link) => matches(link.base_url)).map((link) => link._id);
      if (ids.length === 0) continue;

      const result = await AffiliateLinkModel.updateMany(
        { _id: { $in: ids }, status: 'active' },
        { $set: { status: 'blacklisted' } }
      );
      swept += result.modifiedCount ?? 0;
    }

    return { swept };
  } catch (error) {
    console.error('Blacklist sweep error:', error);
    return { swept: 0 };
  }
}

/**
 * Restore sweep (D-07/D-08): flip every campaign currently `blacklisted` that no
 * longer matches any active blacklist entry back to `active`. The filter is exactly
 * `{ status: 'blacklisted', ... }` — `inactive` is a manual human decision and is
 * never included in any filter (T-02-15, Pitfall 4).
 */
export async function restoreSweep(): Promise<{ restored: number }> {
  try {
    await connectToDatabase();

    const activeBlacklists = await BlacklistModel.find({ status: 'active' }).select(
      'extracted_domain website_url'
    );
    const matchers = activeBlacklists
      .map((entry) => buildDomainMatcher(entry.extracted_domain || entry.website_url || ''))
      .filter(Boolean);

    const blacklisted = await AffiliateLinkModel.find({ status: 'blacklisted' }).select('_id base_url');
    const ids = blacklisted
      .filter((link) => !matchers.some((matches) => matches(link.base_url)))
      .map((link) => link._id);

    if (ids.length === 0) return { restored: 0 };

    const result = await AffiliateLinkModel.updateMany(
      { _id: { $in: ids }, status: 'blacklisted' },
      { $set: { status: 'active' } }
    );
    return { restored: result.modifiedCount ?? 0 };
  } catch (error) {
    console.error('Blacklist restore error:', error);
    return { restored: 0 };
  }
}

/**
 * Re-sweep action composite (D-08): run the forward sweep over every active
 * blacklist entry, then restore any no-longer-matching swept campaign.
 */
export async function sweepBlacklistAndRestore(): Promise<{ swept: number; restored: number }> {
  await connectToDatabase();

  const activeBlacklists = await BlacklistModel.find({ status: 'active' }).select(
    'extracted_domain website_url'
  );
  const domains = activeBlacklists
    .map((entry) => entry.extracted_domain || entry.website_url || '')
    .filter(Boolean);

  const { swept } = await sweepDomains(domains);
  const { restored } = await restoreSweep();
  return { swept, restored };
}

/**
 * Legacy single-domain entry point. Kept as a thin wrapper delegating to the batched
 * `sweepDomains` so the existing callers in `blacklist/route.ts` and
 * `quick-blacklist/route.ts` keep their response contract (`totalUpdatedLinks`,
 * `updatedLinks`). `updatedLinks` stays an array for shape compatibility.
 */
export async function sweepRetroactiveBlacklist(
  targetDomainOrUrl: string
): Promise<{ totalUpdatedLinks: number; updatedLinks: any[] }> {
  const { hostname, rootDomain } = extractDomainFromUrl(targetDomainOrUrl);
  const domain = rootDomain || hostname || targetDomainOrUrl;
  const { swept } = await sweepDomains([domain]);
  return { totalUpdatedLinks: swept, updatedLinks: [] };
}
