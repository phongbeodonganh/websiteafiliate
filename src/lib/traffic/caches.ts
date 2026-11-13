import { clearAdsCache } from "@/lib/traffic/ads-transparency";
import { clearReferringSitesCache } from "@/lib/traffic/referring-sites";
import { clearSeRankingCache } from "@/lib/traffic/seranking";
import { clearTrafficCache } from "@/lib/traffic/tabapi";
import { clearTrustpilotCache } from "@/lib/traffic/trustpilot";
import { clearWhoisCache } from "@/lib/traffic/whois";

export function clearAllTrafficCaches(): void {
  clearTrafficCache();
  clearWhoisCache();
  clearTrustpilotCache();
  clearSeRankingCache();
  clearAdsCache();
  clearReferringSitesCache();
}
