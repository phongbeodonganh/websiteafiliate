// Pure computations for the Traffic Intelligence screening table (TRF-02/04
// rework). Everything derives from data already stored in the system — no
// upstream calls, no fabricated values: missing inputs surface as null and the
// UI renders an explicit empty state.

import type { MonthlyVisit, TrafficResponse, TrafficSources } from "@/types/traffic";

// ---------------------------------------------------------------------------
// A5 — domain without data
// ---------------------------------------------------------------------------

function hasPositive(values: Array<number | null | undefined>): boolean {
  return values.some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
}

/**
 * A row counts as "no data" when visits are 0/null AND there is no
 * traffic-source and no country data — those zeros (0 / 0.0% / 0.00) must not
 * render as real metrics.
 */
export function isEmptyTrafficReport(report: TrafficResponse | null | undefined): boolean {
  if (!report) return true;
  const visits = report.overview?.visits;
  const hasVisits = typeof visits === "number" && Number.isFinite(visits) && visits > 0;
  if (hasVisits) return false;
  const sources = report.traffic_sources;
  const hasSources =
    sources != null &&
    hasPositive([
      sources.direct,
      sources.search,
      sources.search_organic,
      sources.search_paid,
      sources.social,
      sources.social_organic,
      sources.social_paid,
      sources.referrals,
      sources.paid_referrals,
      sources.mail,
      sources.gen_ai,
      sources.affiliate,
      sources.other,
    ]);
  if (hasSources) return false;
  const hasRegions = (report.top_regions ?? []).some((region) => region.share > 0);
  return !hasRegions;
}

// ---------------------------------------------------------------------------
// A3 — traffic mix (4 groups, no parent/child double counting)
// ---------------------------------------------------------------------------
//
// Raw TabAPI channel fields (verified against the stored fixture):
//   direct                              → standalone
//   search = search_organic + search_paid
//   social = social_organic + social_paid
//   referrals ⊃ paid_referrals (top-level sum without paid_referrals ≈ 100%)
//   mail, gen_ai, affiliate, other      → standalone
//
// Exclusive grouping (sums to the top-level total, never above 100%):
//   Trực tiếp = direct
//   Tự nhiên  = search_organic
//   Trả phí   = search_paid + social_paid + paid_referrals
//   Khác      = social_organic + (referrals − paid_referrals) + mail + gen_ai
//               + affiliate + other

export interface TrafficMix {
  direct: number;
  organic: number;
  paid: number;
  other: number;
  /** True when values were normalized because the raw total exceeded 1. */
  normalized: boolean;
}

export type TrafficMixKey = Exclude<keyof TrafficMix, 'normalized'>;

const MIX_KEYS: Array<keyof TrafficSources> = [
  "direct",
  "search",
  "search_organic",
  "search_paid",
  "social",
  "social_organic",
  "social_paid",
  "referrals",
  "paid_referrals",
  "mail",
  "gen_ai",
  "affiliate",
  "other",
];

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeTrafficMix(sources: TrafficSources | null | undefined): TrafficMix | null {
  if (!sources) return null;
  if (!MIX_KEYS.some((key) => nonNegative(sources[key]) > 0)) return null;

  const direct = nonNegative(sources.direct);
  const organic = nonNegative(sources.search_organic);
  const paid =
    nonNegative(sources.search_paid) + nonNegative(sources.social_paid) + nonNegative(sources.paid_referrals);
  const other =
    nonNegative(sources.social_organic) +
    Math.max(0, nonNegative(sources.referrals) - nonNegative(sources.paid_referrals)) +
    nonNegative(sources.mail) +
    nonNegative(sources.gen_ai) +
    nonNegative(sources.affiliate) +
    nonNegative(sources.other);

  const total = direct + organic + paid + other;
  if (total <= 0) return null;
  if (total <= 1.0001) return { direct, organic, paid, other, normalized: false };
  return {
    direct: direct / total,
    organic: organic / total,
    paid: paid / total,
    other: other / total,
    normalized: true,
  };
}

// ---------------------------------------------------------------------------
// A2.4 — primary market share (configurable target country)
// ---------------------------------------------------------------------------

export const TARGET_MARKET_COUNTRY = "US";

export function getMarketShare(
  report: TrafficResponse | null | undefined,
  country: string = TARGET_MARKET_COUNTRY,
): number | null {
  const regions = report?.top_regions;
  if (!regions || regions.length === 0) return null;
  const match = regions.find((region) => region.country === country);
  // The market country is absent from a real region list → share is truly 0.
  return match ? match.share : 0;
}

// ---------------------------------------------------------------------------
// Trend (identical semantics to the modal's momTrend helper)
// ---------------------------------------------------------------------------

export function trendFromMonthly(monthly: MonthlyVisit[] | null | undefined): number | null {
  if (!monthly || monthly.length < 2) return null;
  const prev = monthly[monthly.length - 2]?.visits;
  const last = monthly[monthly.length - 1]?.visits;
  if (typeof prev !== "number" || typeof last !== "number" || prev <= 0) return null;
  return (last - prev) / prev;
}

/** Flat (±0.05%) renders gray per A7, not green/red. */
export const FLAT_TREND_EPSILON = 0.0005;

// ---------------------------------------------------------------------------
// A4 — preliminary score (0–100), component list for later extension
// ---------------------------------------------------------------------------

/**
 * MỌI trọng số/ngưỡng của Điểm sơ bộ nằm ở đây (một chỗ duy nhất). Thêm thành
 * phần mới (vd chất lượng hoa hồng — Phần B) = thêm 1 entry vào build().
 */
export const PRELIMINARY_SCORE = {
  weights: {
    trafficScale: 25,
    trend: 20,
    channelHeadroom: 35,
    market: 20,
  },
  // Log scale for traffic: 0 points at/below floor, full points at ceiling.
  trafficFloorVisits: 1_000,
  trafficCeilingVisits: 10_000_000,
  trendRiseThreshold: 0.1, // +10% MoM → full trend points
  trendFallThreshold: -0.1, // −10% MoM → zero trend points
  marketCountry: TARGET_MARKET_COUNTRY,
} as const;

export interface ScoreComponent {
  key: "traffic_scale" | "trend" | "channel_headroom" | "market";
  label: string;
  maxPoints: number;
  available: boolean;
  earned: number;
  /** Human-readable input summary for the score tooltip. */
  detail: string;
}

export interface PreliminaryScore {
  score: number | null;
  components: ScoreComponent[];
  /** Thành phần có dữ liệu / tổng thành phần. */
  missingCount: number;
  /** True khi thiếu quá 1 thành phần — hiển thị dấu hiệu "chưa đủ dữ liệu". */
  insufficient: boolean;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function formatCompactInput(visits: number): string {
  if (visits >= 1e9) return `${(visits / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} Tỷ`;
  if (visits >= 1e6) return `${(visits / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} Tr`;
  if (visits >= 1e3) return `${(visits / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} N`;
  return Math.round(visits).toLocaleString("vi-VN");
}

/**
 * Điểm sơ bộ = heuristic xếp hạng nhanh (không phải số liệu đo được). Thiếu
 * thành phần → tính trên phần còn lại rồi chuẩn hóa về 100; không có thành
 * phần nào → null (domain chưa có dữ liệu traffic).
 */
export function computePreliminaryScore(report: TrafficResponse | null | undefined): PreliminaryScore {
  const { weights } = PRELIMINARY_SCORE;
  const components: ScoreComponent[] = [];

  // 1. Quy mô traffic — thang log.
  const visits = report?.overview?.visits;
  if (typeof visits === "number" && Number.isFinite(visits) && visits > 0) {
    const floor = PRELIMINARY_SCORE.trafficFloorVisits;
    const ceiling = PRELIMINARY_SCORE.trafficCeilingVisits;
    const ratio = (Math.log(visits) - Math.log(floor)) / (Math.log(ceiling) - Math.log(floor));
    components.push({
      key: "traffic_scale",
      label: "Quy mô traffic",
      maxPoints: weights.trafficScale,
      available: true,
      earned: weights.trafficScale * clamp01(ratio),
      detail: `${formatCompactInput(visits)} lượt truy cập/tháng (thang log ${formatCompactInput(floor)} → ${formatCompactInput(ceiling)})`,
    });
  } else {
    components.push({
      key: "traffic_scale",
      label: "Quy mô traffic",
      maxPoints: weights.trafficScale,
      available: false,
      earned: 0,
      detail: "Không có dữ liệu lượt truy cập",
    });
  }

  // 2. Xu hướng — tăng cao, giảm thấp, đi ngang mức giữa.
  const trend = trendFromMonthly(report?.monthly_visits);
  if (trend != null) {
    const span = PRELIMINARY_SCORE.trendRiseThreshold - PRELIMINARY_SCORE.trendFallThreshold;
    components.push({
      key: "trend",
      label: "Xu hướng",
      maxPoints: weights.trend,
      available: true,
      earned:
        weights.trend *
        clamp01((trend - PRELIMINARY_SCORE.trendFallThreshold) / span),
      detail: `${trend >= 0 ? "+" : ""}${(trend * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với tháng trước`,
    });
  } else {
    components.push({
      key: "trend",
      label: "Xu hướng",
      maxPoints: weights.trend,
      available: false,
      earned: 0,
      detail: "Cần ít nhất 2 tháng dữ liệu",
    });
  }

  // 3. Dư địa kênh — càng ít phụ thuộc direct càng cao.
  const mix = computeTrafficMix(report?.traffic_sources);
  if (mix) {
    components.push({
      key: "channel_headroom",
      label: "Dư địa kênh",
      maxPoints: weights.channelHeadroom,
      available: true,
      earned: weights.channelHeadroom * (1 - clamp01(mix.direct)),
      detail: `Trực tiếp ${(mix.direct * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% — càng thấp càng tốt`,
    });
  } else {
    components.push({
      key: "channel_headroom",
      label: "Dư địa kênh",
      maxPoints: weights.channelHeadroom,
      available: false,
      earned: 0,
      detail: "Không có dữ liệu nguồn traffic",
    });
  }

  // 4. Thị trường — tỷ trọng quốc gia mục tiêu (US mặc định).
  const share = getMarketShare(report, PRELIMINARY_SCORE.marketCountry);
  if (share != null) {
    components.push({
      key: "market",
      label: "Thị trường",
      maxPoints: weights.market,
      available: true,
      earned: weights.market * clamp01(share),
      detail: `${PRELIMINARY_SCORE.marketCountry} chiếm ${(share * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% traffic`,
    });
  } else {
    components.push({
      key: "market",
      label: "Thị trường",
      maxPoints: weights.market,
      available: false,
      earned: 0,
      detail: "Không có dữ liệu quốc gia",
    });
  }

  const available = components.filter((component) => component.available);
  if (available.length === 0) {
    return { score: null, components, missingCount: components.length, insufficient: true };
  }

  const earned = available.reduce((sum, component) => sum + component.earned, 0);
  const max = available.reduce((sum, component) => sum + component.maxPoints, 0);
  const missingCount = components.length - available.length;
  return {
    score: Math.round((earned / max) * 100),
    components,
    missingCount,
    insufficient: missingCount > 1,
  };
}

// ---------------------------------------------------------------------------
// A8 — multi-domain paste parsing (client-safe; server still validates)
// ---------------------------------------------------------------------------

/**
 * Normalize a pasted entry: strip protocol, www. and paths. Does NOT
 * re-implement the server's strict validation — invalid entries are returned
 * in `invalid` so the UI can list them instead of silently dropping.
 */
export function parseDomainList(input: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of input.split(/[\n,;]+/)) {
    const entry = raw.trim();
    if (!entry) continue;
    const host = entry
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0]
      .trim()
      .toLowerCase();
    if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
      if (!seen.has(host)) {
        seen.add(host);
        valid.push(host);
      }
    } else {
      invalid.push(entry);
    }
  }

  return { valid, invalid };
}

/**
 * Chú thích phương pháp tính Điểm sơ bộ hiển thị cho người dùng ngay trên
 * bảng — sinh từ PRELIMINARY_SCORE nên trọng số chỉnh ở config sẽ tự cập nhật.
 */
export function scoreMethodology(): string[] {
  const { weights } = PRELIMINARY_SCORE;
  return [
    `Quy mô traffic (tối đa ${weights.trafficScale}đ): thang log theo lượt truy cập/tháng — ${formatCompactInput(PRELIMINARY_SCORE.trafficFloorVisits)} lượt → 0đ, ${formatCompactInput(PRELIMINARY_SCORE.trafficCeilingVisits)} lượt trở lên → tối đa.`,
    `Xu hướng (tối đa ${weights.trend}đ): so với tháng trước — tăng từ +10% trở lên → tối đa, giảm từ −10% trở xuống → 0đ, đi ngang → mức giữa.`,
    `Dư địa kênh (tối đa ${weights.channelHeadroom}đ): ${weights.channelHeadroom} × (1 − tỷ trọng traffic trực tiếp) — càng ít phụ thuộc truy cập trực tiếp càng cao.`,
    `Thị trường (tối đa ${weights.market}đ): tỷ trọng ${PRELIMINARY_SCORE.marketCountry} trên traffic — càng cao càng tốt.`,
    "Thiếu thành phần: tính trên các thành phần còn lại rồi chuẩn hóa về thang 100; thiếu quá 1 thành phần hiện dấu * (chưa đủ dữ liệu); domain không có dữ liệu traffic không được chấm.",
    "Đây là điểm heuristic để xếp hạng nhanh khi sàng lọc — không phải số liệu đo được và không tính số đối thủ quảng cáo.",
  ];
}

// ---------------------------------------------------------------------------
// Phần B — affiliate program schema (placeholder: no data source yet)
// ---------------------------------------------------------------------------
//
// Một agent khác sẽ điền dữ liệu này sau. KHÔNG bịa giá trị: khi chưa có dữ
// liệu, mọi domain hiển thị "Chưa quét" (mờ).

export type AffiliateProgramState = 'co' | 'khong' | 'chua_quet';
export type AffiliateCommissionType = 'recurring' | 'mot_lan';

export interface AffiliateProgramInfo {
  co_chuong_trinh: AffiliateProgramState;
  kieu_hoa_hong: AffiliateCommissionType | null;
  ty_le_hoa_hong: number | null;
  nguon_url: string | null;
  do_tin_cay: number | null;
}

export function formatAffiliateCell(info: AffiliateProgramInfo | null | undefined): string {
  if (!info || info.co_chuong_trinh !== 'co') return 'Chưa quét';
  const rate =
    info.ty_le_hoa_hong != null
      ? ` · ${info.ty_le_hoa_hong.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`
      : '';
  const type =
    info.kieu_hoa_hong === 'recurring' ? ' recurring' : info.kieu_hoa_hong === 'mot_lan' ? ' một lần' : '';
  return `Có${rate}${type}`;
}

// ---------------------------------------------------------------------------
// A8 — CSV export of the currently visible columns
// ---------------------------------------------------------------------------

export function buildCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  return `\uFEFF${lines.join("\r\n")}`;
}
