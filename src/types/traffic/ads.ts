// Google Ads Transparency (SerpApi) — single-call payload.
// One GET per domain (num=100, no pagination, no advertiser/detail calls).
// The server groups ad_creatives by advertiser before returning, so the client
// renders aggregates instead of raw creatives.

/** One raw creative sample entry from ad_creatives[] (Unix seconds, UTC). */
export interface AdCreativeSample {
  advertiser_id: string;
  advertiser: string;
  first_shown: number | null;
  last_shown: number | null;
}

/** Newest creative of an advertiser, used for the "creative mới nhất" line. */
export interface AdsNewestCreative {
  first_shown: number | null;
  last_shown: number | null;
}

export type AdsOwnerFlag = "owner" | "external";

/** One advertiser group — computed server-side from the 100-creative sample. */
export interface AdsAdvertiserRow {
  advertiser_id: string;
  name: string;
  creative_count: number;
  newest_creative: AdsNewestCreative | null;
  newest_run_days: number | null;
  last_run: number | null;
  is_active: boolean;
  owner: AdsOwnerFlag;
}

export interface AdsResponse {
  domain: string;
  /** Rounded total from search_information.total_results — display as "khoảng". */
  total_results: number | null;
  /** Number of creatives actually received (may be < num). */
  sample_size: number;
  advertiser_total: number;
  advertiser_active: number;
  external_active: number;
  /** Sorted: active first, then last_run desc. */
  advertisers: AdsAdvertiserRow[];
}
