export const DEFAULT_TRAFFIC_MONTHS = 3;
export const MIN_TRAFFIC_MONTHS = 3;
export const MAX_TRAFFIC_MONTHS = 12;

export function getTrafficMonths(value?: string | null): number {
  if (value == null || value.trim() === "") return DEFAULT_TRAFFIC_MONTHS;

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      `TRAFFIC_MONTHS phải là số nguyên từ ${MIN_TRAFFIC_MONTHS} đến ${MAX_TRAFFIC_MONTHS}.`,
    );
  }

  const months = Number(normalized);
  if (months < MIN_TRAFFIC_MONTHS || months > MAX_TRAFFIC_MONTHS) {
    throw new Error(
      `TRAFFIC_MONTHS phải nằm trong khoảng ${MIN_TRAFFIC_MONTHS}–${MAX_TRAFFIC_MONTHS}.`,
    );
  }

  return months;
}

export function clampTrafficMonths(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_TRAFFIC_MONTHS;
  return Math.min(MAX_TRAFFIC_MONTHS, Math.max(MIN_TRAFFIC_MONTHS, Math.round(value)));
}

export const DEFAULT_ADS_CACHE_DAYS = 5;
export const MIN_ADS_CACHE_DAYS = 3;
export const MAX_ADS_CACHE_DAYS = 7;

export function clampAdsCacheDays(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_ADS_CACHE_DAYS;
  return Math.min(MAX_ADS_CACHE_DAYS, Math.max(MIN_ADS_CACHE_DAYS, Math.round(value)));
}

/** TTL (days, 3–7) cho cache Ads Transparency theo khóa domain + region. */
export function getAdsCacheDays(value?: string | null): number {
  if (value == null || value.trim() === "") return DEFAULT_ADS_CACHE_DAYS;
  if (!/^\d+$/.test(value.trim())) return DEFAULT_ADS_CACHE_DAYS;
  return clampAdsCacheDays(Number.parseInt(value.trim(), 10));
}
