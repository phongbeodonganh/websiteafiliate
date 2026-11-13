import { afterEach, describe, expect, it, vi } from "vitest";
import {
  maskKey,
  missingEnvNames,
  resolveTrafficCredentials,
} from "@/lib/traffic/credentials";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveTrafficCredentials", () => {
  it("giá trị DB thắng env", () => {
    vi.stubEnv("TABAPI_KEY", "env-tabapi-key");
    const resolved = resolveTrafficCredentials({ traffic_tabapi_key: "db-tabapi-key" });

    expect(resolved.tabapi).toEqual({ value: "db-tabapi-key", source: "db" });
  });

  it("dùng env khi DB null", () => {
    vi.stubEnv("SERPAPI_KEY", "env-serpapi-key");
    const resolved = resolveTrafficCredentials({ traffic_serpapi_key: null });

    expect(resolved.serpapi).toEqual({ value: "env-serpapi-key", source: "env" });
  });

  it("cả hai null → value null và source null", () => {
    vi.stubEnv("WHOIS_API_KEY", undefined);
    const resolved = resolveTrafficCredentials({});

    expect(resolved.whois).toEqual({ value: null, source: null });
    expect(missingEnvNames(resolved)).toContain("WHOIS_API_KEY");
  });

  it("months lấy từ DB và được clamp về 3–12", () => {
    expect(resolveTrafficCredentials({ traffic_months: 7 }).months).toBe(7);
    expect(resolveTrafficCredentials({ traffic_months: 1 }).months).toBe(3);
    expect(resolveTrafficCredentials({ traffic_months: 99 }).months).toBe(12);
  });

  it("months fallback về env rồi về 3", () => {
    vi.stubEnv("TRAFFIC_MONTHS", "5");
    expect(resolveTrafficCredentials({}).months).toBe(5);

    vi.stubEnv("TRAFFIC_MONTHS", "50");
    expect(resolveTrafficCredentials({}).months).toBe(12);

    vi.stubEnv("TRAFFIC_MONTHS", undefined);
    expect(resolveTrafficCredentials({}).months).toBe(3);
  });

  it("months env không phải số → bỏ qua", () => {
    vi.stubEnv("TRAFFIC_MONTHS", "abc");
    expect(resolveTrafficCredentials({}).months).toBe(3);
  });
});

describe("maskKey", () => {
  it("không bao giờ trả về giá trị đầy đủ cho input ≥ 5 ký tự", () => {
    for (const value of ["12345", "sk-abcdef123456", "https://scraper.example.com/api", "abcdefgh"]) {
      const masked = maskKey(value)!;
      expect(masked).not.toBe(value);
      expect(masked.startsWith("••••••")).toBe(true);
      expect(masked.endsWith(value.slice(-4))).toBe(true);
    }
  });

  it("input ngắn → chỉ bullet, không lộ ký tự nào", () => {
    expect(maskKey("abc")).toBe("••••••");
    expect(maskKey("")).toBeNull();
    expect(maskKey(null)).toBeNull();
  });
});

describe("missingEnvNames", () => {
  it("liệt kê đúng env chưa cấu hình", () => {
    vi.stubEnv("TABAPI_KEY", undefined);
    vi.stubEnv("SERPAPI_KEY", undefined);
    vi.stubEnv("WHOIS_API_KEY", "whois-env");
    vi.stubEnv("SE_RANKING_API_KEY", undefined);
    vi.stubEnv("TRUSTPILOT_SCRAPER_URL", "https://scraper.example.com");

    const missing = missingEnvNames(
      resolveTrafficCredentials({
        traffic_seranking_api_key: "db-seranking",
      }),
    );

    expect(missing).toEqual(["TABAPI_KEY", "SERPAPI_KEY"]);
  });
});
