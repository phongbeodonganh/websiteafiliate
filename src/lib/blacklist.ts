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
          reason: item.reason || 'Sàn lừa đảo / Không trả hoa hồng',
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
          reason: item.reason || 'Sàn lừa đảo / Không trả hoa hồng',
          blockedCountries: item.blocked_countries || [],
          matchType: 'domain',
        };
      }
    }
  }

  return { isBlacklisted: false };
}

/**
 * Retroactive Cleaner Engine:
 * Batch updates any active affiliate link campaigns matching a newly blacklisted domain to 'blacklisted'.
 */
export async function sweepRetroactiveBlacklist(targetDomainOrUrl: string): Promise<{ totalUpdatedLinks: number; updatedLinks: any[] }> {
  await connectToDatabase();

  const { hostname, rootDomain } = extractDomainFromUrl(targetDomainOrUrl);
  const searchRegex = new RegExp(rootDomain || hostname || targetDomainOrUrl, 'i');

  const matchingLinks = await AffiliateLinkModel.find({
    base_url: { $regex: searchRegex },
    status: { $ne: 'blacklisted' },
  });

  const updatedIds: string[] = [];
  for (const link of matchingLinks) {
    link.status = 'blacklisted';
    await link.save();
    updatedIds.push(link._id.toString());
  }

  return {
    totalUpdatedLinks: updatedIds.length,
    updatedLinks: matchingLinks.map((l) => ({ id: l._id.toString(), name: l.name, base_url: l.base_url })),
  };
}
