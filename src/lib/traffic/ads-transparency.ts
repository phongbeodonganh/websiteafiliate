import { createCachedStore } from "@/lib/traffic/cached-store";
import { getAdsCacheDays } from "@/lib/traffic/config";
import {
  groupAdvertisers,
  summarizeAdvertisers,
  warnIfCreativeOrderUnexpected,
} from "@/lib/traffic/ads-insights";
import type { AdCreativeSample, AdsResponse } from "@/types/traffic";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

// Đúng 1 lượt SerpApi cho mỗi domain: num=100, KHÔNG phân trang
// (next_page_token), KHÔNG ad_details, KHÔNG get_advertiser. Với
// advertiser_id thì tham số text bị bỏ qua nên không thể đếm creative theo
// domain cho từng advertiser — do đó không gọi lại theo từng advertiser.
const MAX_CREATIVES = 100;
const NO_RESULTS = /hasn't returned any results/i;
const DAY_MS = 24 * 60 * 60 * 1000;

export class AdsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AdsApiError";
  }
}

interface SerpApiCreative {
  advertiser_id?: string;
  advertiser?: string;
  first_shown?: number;
  last_shown?: number;
}

interface SerpApiResponse {
  error?: string;
  search_information?: {
    total_results?: number;
  };
  ad_creatives?: SerpApiCreative[];
}

function vietnameseError(status: number, apiMessage?: string): string {
  if (status === 401 || status === 403) return "SERPAPI_KEY không hợp lệ hoặc đã hết hạn.";
  if (status === 429) return "SerpApi đang giới hạn lượt gọi hoặc đã hết quota.";
  if (apiMessage && /run out of searches|out of searches/i.test(apiMessage)) {
    return "Tài khoản SerpApi đã hết lượt tìm kiếm.";
  }
  return "Không thể lấy dữ liệu quảng cáo lúc này.";
}

function failure(status: number, apiMessage?: string): AdsApiError {
  const mapped = [401, 403, 429].includes(status) ? status : 502;
  return new AdsApiError(mapped, "serpapi_error", vietnameseError(status, apiMessage));
}

function toSample(raw: SerpApiCreative): AdCreativeSample {
  return {
    advertiser_id: raw.advertiser_id ?? "",
    advertiser: raw.advertiser ?? "",
    first_shown: typeof raw.first_shown === "number" ? raw.first_shown : null,
    last_shown: typeof raw.last_shown === "number" ? raw.last_shown : null,
  };
}

function warnIfSampleTruncated(creatives: AdCreativeSample[]): void {
  if (process.env.NODE_ENV === "production") return;
  if (creatives.length < MAX_CREATIVES) {
    console.warn(
      `[ads-transparency] nhận ${creatives.length}/${MAX_CREATIVES} creative — ít hơn num yêu cầu (giới hạn thực tế của num), cần báo lại.`,
    );
  }
}

export interface GetAdsOptions {
  /** Mã region SerpApi (vd 2840 = US) — hệ thống chưa có cấu hình thị trường nên không truyền. */
  region?: string | null;
  /** Bỏ qua cache và gọi lại SerpApi (nút "Làm mới" — tốn 1 lượt). */
  noCache?: boolean;
  fetchImpl?: typeof fetch;
}

async function fetchAdsFromSerpApi(
  domain: string,
  apiKey: string,
  region: string | null,
  fetchImpl: typeof fetch,
): Promise<AdsResponse> {
  const params: Record<string, string> = {
    engine: "google_ads_transparency_center",
    text: domain,
    num: String(MAX_CREATIVES),
  };
  if (region) params.region = region;

  const query = new URLSearchParams({ ...params, api_key: apiKey });

  let response: Response;
  try {
    response = await fetchImpl(`${SERPAPI_BASE_URL}?${query}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new AdsApiError(502, "network_error", "Không thể kết nối đến SerpApi.");
  }

  let body: SerpApiResponse | null = null;
  try {
    body = (await response.json()) as SerpApiResponse;
  } catch {
    body = null;
  }

  if (body?.error && NO_RESULTS.test(body.error)) {
    return {
      domain,
      total_results: 0,
      sample_size: 0,
      advertiser_total: 0,
      advertiser_active: 0,
      external_active: 0,
      advertisers: [],
    };
  }
  if (!(response.ok && !body?.error)) throw failure(response.status, body?.error);

  const creatives = (body?.ad_creatives ?? []).map(toSample);
  warnIfCreativeOrderUnexpected(creatives);
  warnIfSampleTruncated(creatives);

  const advertisers = groupAdvertisers(creatives, domain, Math.floor(Date.now() / 1000));
  const summary = summarizeAdvertisers(advertisers, creatives.length);

  return {
    domain,
    total_results: body?.search_information?.total_results ?? null,
    sample_size: summary.sample_size,
    advertiser_total: summary.advertiser_total,
    advertiser_active: summary.advertiser_active,
    external_active: summary.external_active,
    advertisers,
  };
}

// Cache phía hệ thống theo khóa "domain + region"; TTL 3–7 ngày (ADS_CACHE_DAYS).
const adsStore = createCachedStore<AdsResponse>({
  ttlMs: getAdsCacheDays(process.env.ADS_CACHE_DAYS) * DAY_MS,
});

export function getAds(
  domain: string,
  apiKey: string,
  options: GetAdsOptions = {},
): Promise<AdsResponse> {
  const { region = null, noCache = false, fetchImpl = fetch } = options;
  const key = `${domain}:${region ?? ""}`;
  const load = () => fetchAdsFromSerpApi(domain, apiKey, region, fetchImpl);
  // Lỗi ném ra từ load() không được ghi vào cache (CachedStore chỉ lưu .then).
  return noCache ? adsStore.refresh(key, load) : adsStore.get(key, load);
}

export function clearAdsCache(): void {
  adsStore.clear();
}
