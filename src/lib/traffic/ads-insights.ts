// Pure computations for the Ads Transparency panel (mirrors whois-insights
// pattern): everything derived from the single 100-creative SerpApi sample.
//
// Rules (task spec):
// - Group ad_creatives by advertiser_id; empty advertiser_id groups by name.
// - newest_creative = creative with the max first_shown.
// - newest_run_days = floor((last_shown - first_shown) / 86400) + 1 on the
//   newest creative; creatives missing timestamps are skipped for day math but
//   still counted in creative_count.
// - last_run = max(last_shown); "Đang chạy" while within ACTIVE_WINDOW_DAYS.
// - owner_flag: "Chính chủ" only on a confident brand match with the domain,
//   otherwise "Bên ngoài" (never guessed).

import type {
  AdCreativeSample,
  AdsAdvertiserRow,
  AdsNewestCreative,
  AdsOwnerFlag,
} from "@/types/traffic";

export const ACTIVE_WINDOW_DAYS = 7;
export const DAY_SECONDS = 86_400;

const COMPANY_SUFFIXES = new Set([
  "llc",
  "inc",
  "ltd",
  "co",
  "corp",
  "oy",
  "gmbh",
  "pvt",
  "limited",
  "opc",
  "private",
]);

/** Lowercase, keep only letters/digits (unicode-aware), split into tokens. */
function normalizeTokens(value: string): string[] {
  const lowered = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!lowered) return [];
  return lowered.split(/\s+/).filter((token) => !COMPANY_SUFFIXES.has(token));
}

function normalizeText(value: string): string {
  return normalizeTokens(value).join(" ");
}

/** Domain name without the TLD (keeps subdomain off via last-label strip). */
export function domainBrandKey(domain: string): string {
  const host = domain.toLowerCase().replace(/^www\./, "");
  const labels = host.split(".").filter(Boolean);
  return labels.length > 1 ? normalizeText(labels.slice(0, -1).join(" ")) : normalizeText(host);
}

/**
 * "Chính chủ" only when the normalized advertiser name contains — or is
 * contained in — the normalized domain brand part (TLD stripped).
 * e.g. gohighlevel.com ↔ "HighLevel LLC" → owner. Unsure → external.
 */
export function resolveOwnerFlag(advertiserName: string, domain: string): AdsOwnerFlag {
  const brand = domainBrandKey(domain);
  if (!brand) return "external";
  const name = normalizeText(advertiserName);
  if (!name) return "external";
  if (name.includes(brand) || brand.includes(name)) return "owner";
  return "external";
}

function toDays(firstShown: number, lastShown: number): number {
  return Math.floor((lastShown - firstShown) / DAY_SECONDS) + 1;
}

function pickNewestCreative(creatives: AdCreativeSample[]): AdsNewestCreative | null {
  let newestSource: AdCreativeSample | null = null;
  let newestFirstShown: number | null = null;
  for (const creative of creatives) {
    if (creative.first_shown == null) continue;
    if (newestFirstShown == null || creative.first_shown > newestFirstShown) {
      newestSource = creative;
      newestFirstShown = creative.first_shown;
    }
  }
  return newestSource == null
    ? null
    : { first_shown: newestSource.first_shown, last_shown: newestSource.last_shown };
}

export function groupAdvertisers(
  creatives: AdCreativeSample[],
  domain: string,
  nowSeconds: number,
  activeWindowDays: number = ACTIVE_WINDOW_DAYS,
): AdsAdvertiserRow[] {
  const groups = new Map<string, AdsAdvertiserRow & { _creatives: AdCreativeSample[] }>();

  for (const creative of creatives) {
    // advertiser_id trống → gom theo tên advertiser.
    const key = creative.advertiser_id || creative.advertiser;
    let group = groups.get(key);
    if (!group) {
      group = {
        advertiser_id: creative.advertiser_id,
        name: creative.advertiser,
        creative_count: 0,
        newest_creative: null,
        newest_run_days: null,
        last_run: null,
        is_active: false,
        owner: "external",
        _creatives: [],
      };
      groups.set(key, group);
    }
    group.creative_count += 1;
    group._creatives.push(creative);
    if (creative.last_shown != null && (group.last_run == null || creative.last_shown > group.last_run)) {
      group.last_run = creative.last_shown;
    }
  }

  const rows: AdsAdvertiserRow[] = [];
  for (const group of groups.values()) {
    const newest = pickNewestCreative(group._creatives);
    rows.push({
      advertiser_id: group.advertiser_id,
      name: group.name,
      creative_count: group.creative_count,
      newest_creative: newest,
      newest_run_days: newest?.first_shown != null && newest.last_shown != null
        ? toDays(newest.first_shown, newest.last_shown)
        : null,
      last_run: group.last_run,
      is_active:
        group.last_run != null && group.last_run >= nowSeconds - activeWindowDays * DAY_SECONDS,
      owner: resolveOwnerFlag(group.name, domain),
    });
  }

  // Đang chạy lên trước, rồi last_run giảm dần; không mốc thời gian xuống cuối.
  return rows.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if (a.last_run == null && b.last_run == null) {
      return b.creative_count - a.creative_count || a.name.localeCompare(b.name);
    }
    if (a.last_run == null) return 1;
    if (b.last_run == null) return -1;
    return b.last_run - a.last_run;
  });
}

export interface AdsSummary {
  advertiser_total: number;
  advertiser_active: number;
  external_active: number;
  sample_size: number;
}

export function summarizeAdvertisers(
  rows: AdsAdvertiserRow[],
  sampleSize: number,
): AdsSummary {
  return {
    advertiser_total: rows.length,
    advertiser_active: rows.filter((row) => row.is_active).length,
    external_active: rows.filter((row) => row.is_active && row.owner === "external").length,
    sample_size: sampleSize,
  };
}

/**
 * Dev-only sanity check: the API is assumed to return creatives newest-first
 * (last_shown non-increasing). Log a warning when the order breaks — never
 * change labels/logic based on this, just surface it for review.
 */
export function warnIfCreativeOrderUnexpected(creatives: AdCreativeSample[]): void {
  if (process.env.NODE_ENV === "production") return;
  let previous: number | null = null;
  for (let index = 0; index < creatives.length; index += 1) {
    const lastShown = creatives[index]?.last_shown;
    if (lastShown == null) continue;
    if (previous != null && lastShown > previous) {
      console.warn(
        `[ads-transparency] ad_creatives thứ tự last_shown KHÔNG giảm dần tại index ${index} — giả định "gần đây nhất trước" có thể sai, cần báo lại.`,
      );
      return;
    }
    previous = lastShown;
  }
}
