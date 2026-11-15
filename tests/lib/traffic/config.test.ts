import { describe, expect, it } from "vitest";
import {
  clampAdsCacheDays,
  clampTrafficMonths,
  DEFAULT_ADS_CACHE_DAYS,
  DEFAULT_TRAFFIC_MONTHS,
  getAdsCacheDays,
  getTrafficMonths,
  MAX_ADS_CACHE_DAYS,
  MAX_TRAFFIC_MONTHS,
  MIN_ADS_CACHE_DAYS,
  MIN_TRAFFIC_MONTHS,
} from "@/lib/traffic/config";

describe("traffic months config", () => {
  it("dùng giá trị mặc định khi env chưa được cấu hình", () => {
    expect(getTrafficMonths(undefined)).toBe(DEFAULT_TRAFFIC_MONTHS);
    expect(getTrafficMonths("  ")).toBe(DEFAULT_TRAFFIC_MONTHS);
  });

  it("đọc số tháng hợp lệ từ env", () => {
    expect(getTrafficMonths("6")).toBe(6);
    expect(getTrafficMonths(` ${MAX_TRAFFIC_MONTHS} `)).toBe(MAX_TRAFFIC_MONTHS);
  });

  it.each(["2", "13", "3.5", "abc"])("từ chối giá trị không hợp lệ: %s", (value) => {
    expect(() => getTrafficMonths(value)).toThrow(
      new RegExp(`${MIN_TRAFFIC_MONTHS}.*${MAX_TRAFFIC_MONTHS}`),
    );
  });

  it("clamp giá trị tháng về khoảng 3–12 thay vì throw", () => {
    expect(clampTrafficMonths(3)).toBe(3);
    expect(clampTrafficMonths(6)).toBe(6);
    expect(clampTrafficMonths(12)).toBe(12);
    expect(clampTrafficMonths(1)).toBe(MIN_TRAFFIC_MONTHS);
    expect(clampTrafficMonths(99)).toBe(MAX_TRAFFIC_MONTHS);
    expect(clampTrafficMonths(null)).toBe(DEFAULT_TRAFFIC_MONTHS);
    expect(clampTrafficMonths(undefined)).toBe(DEFAULT_TRAFFIC_MONTHS);
    expect(clampTrafficMonths(Number.NaN)).toBe(DEFAULT_TRAFFIC_MONTHS);
  });
});

describe("ads cache days config", () => {
  it("dùng giá trị mặc định khi env chưa được cấu hình hoặc sai định dạng", () => {
    expect(getAdsCacheDays(undefined)).toBe(DEFAULT_ADS_CACHE_DAYS);
    expect(getAdsCacheDays("  ")).toBe(DEFAULT_ADS_CACHE_DAYS);
    expect(getAdsCacheDays("abc")).toBe(DEFAULT_ADS_CACHE_DAYS);
  });

  it("đọc số ngày hợp lệ từ env", () => {
    expect(getAdsCacheDays("3")).toBe(3);
    expect(getAdsCacheDays(` ${MAX_ADS_CACHE_DAYS} `)).toBe(MAX_ADS_CACHE_DAYS);
  });

  it("clamp TTL về khoảng 3–7 ngày", () => {
    expect(clampAdsCacheDays(1)).toBe(MIN_ADS_CACHE_DAYS);
    expect(clampAdsCacheDays(5)).toBe(5);
    expect(clampAdsCacheDays(30)).toBe(MAX_ADS_CACHE_DAYS);
    expect(clampAdsCacheDays(null)).toBe(DEFAULT_ADS_CACHE_DAYS);
    expect(clampAdsCacheDays(undefined)).toBe(DEFAULT_ADS_CACHE_DAYS);
  });
});
