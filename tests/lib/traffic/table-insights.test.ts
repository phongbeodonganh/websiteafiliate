import { describe, expect, it } from "vitest";
import {
  buildCsv,
  computePreliminaryScore,
  computeTrafficMix,
  formatAffiliateCell,
  getMarketShare,
  isEmptyTrafficReport,
  parseDomainList,
  PRELIMINARY_SCORE,
  scoreMethodology,
  type AffiliateProgramInfo,
} from "@/lib/traffic/table-insights";
import { trafficFixture } from "./fixture";
import type { TrafficResponse } from "@/types/traffic";

function reportWith(overrides: Partial<TrafficResponse>): TrafficResponse {
  return { ...trafficFixture, ...overrides };
}

describe("isEmptyTrafficReport (A5 — domain không có dữ liệu)", () => {
  it("report rỗng hoặc thiếu → true", () => {
    expect(isEmptyTrafficReport(null)).toBe(true);
    expect(isEmptyTrafficReport(undefined)).toBe(true);
  });

  it("visits = 0, không nguồn, không quốc gia → true (aidealsuk.com case)", () => {
    const empty = reportWith({
      overview: { ...trafficFixture.overview, visits: 0 },
      traffic_sources: {
        direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0,
        social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0,
      },
      top_regions: [],
    });
    expect(isEmptyTrafficReport(empty)).toBe(true);
  });

  it("có visits > 0 → false dù nguồn rỗng", () => {
    const visited = reportWith({ traffic_sources: { ...trafficFixture.traffic_sources, direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0, social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0 } });
    expect(isEmptyTrafficReport(visited)).toBe(false);
  });

  it("visits = 0 nhưng có nguồn traffic > 0 → false", () => {
    const sourced = reportWith({
      overview: { ...trafficFixture.overview, visits: 0 },
      traffic_sources: { ...trafficFixture.traffic_sources, direct: 0.5 },
    });
    expect(isEmptyTrafficReport(sourced)).toBe(false);
  });
});

describe("computeTrafficMix (A3 — 4 nhóm không cộng dồn cha với con)", () => {
  it("fixture vercel: nhóm theo cấp con, tổng đúng mức top-level (~100%)", () => {
    const mix = computeTrafficMix(trafficFixture.traffic_sources)!;
    // Trực tiếp = direct
    expect(mix.direct).toBeCloseTo(0.7092, 4);
    // Tự nhiên = search_organic (KHÔNG phải search = 0.1347)
    expect(mix.organic).toBeCloseTo(0.129, 4);
    // Trả phí = search_paid + social_paid + paid_referrals
    expect(mix.paid).toBeCloseTo(0.0057 + 0.0003 + 0.0026, 4);
    // Khác = social_organic + (referrals − paid_referrals) + mail + gen_ai + affiliate + other
    expect(mix.other).toBeCloseTo(0.0449 + 0.0639 + 0.0178 + 0.024, 4);
    const total = mix.direct + mix.organic + mix.paid + mix.other;
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThanOrEqual(1.0001);
    expect(mix.normalized).toBe(false);
  });

  it("chuẩn hóa khi tổng > 1 để thanh không tràn", () => {
    const mix = computeTrafficMix({
      ...trafficFixture.traffic_sources,
      direct: 0.9,
      search_organic: 0.5,
      search: 0.6,
      search_paid: 0.1,
      social_organic: 0.1,
      social_paid: 0.05,
      social: 0.15,
      referrals: 0.2,
      paid_referrals: 0.05,
      mail: 0.05,
      gen_ai: 0.05,
      affiliate: 0,
      other: 0,
    })!;
    const total = mix.direct + mix.organic + mix.paid + mix.other;
    expect(mix.normalized).toBe(true);
    expect(total).toBeCloseTo(1, 6);
  });

  it("không có dữ liệu nguồn → null", () => {
    expect(computeTrafficMix(null)).toBeNull();
    expect(
      computeTrafficMix({
        direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0,
        social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0,
      }),
    ).toBeNull();
  });
});

describe("getMarketShare (A2.4 — thị trường mục tiêu)", () => {
  it("lấy tỷ trọng US từ top_regions", () => {
    expect(getMarketShare(trafficFixture)).toBeCloseTo(0.1998, 4);
  });

  it("US không có trong danh sách nhưng có regions → 0 (dữ liệu thật)", () => {
    expect(getMarketShare(reportWith({ top_regions: [{ country: "VN", name: "Vietnam", share: 0.5 }] }))).toBe(0);
  });

  it("không có regions → null", () => {
    expect(getMarketShare(reportWith({ top_regions: [] }))).toBeNull();
  });
});

describe("computePreliminaryScore (A4 — điểm sơ bộ heuristic)", () => {
  it("fixture đầy đủ dữ liệu → điểm trên thang 100, đủ thành phần", () => {
    const result = computePreliminaryScore(trafficFixture);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThanOrEqual(100);
    expect(result.missingCount).toBe(0);
    expect(result.insufficient).toBe(false);
    // 4 thành phần đúng cấu trúc danh sách (dễ mở rộng Phần B)
    expect(result.components.map((component) => component.key)).toEqual([
      "traffic_scale",
      "trend",
      "channel_headroom",
      "market",
    ]);
    // Trọng số tối đa theo config
    expect(result.components.map((component) => component.maxPoints)).toEqual([
      PRELIMINARY_SCORE.weights.trafficScale,
      PRELIMINARY_SCORE.weights.trend,
      PRELIMINARY_SCORE.weights.channelHeadroom,
      PRELIMINARY_SCORE.weights.market,
    ]);
  });

  it("dư địa kênh = 35 * (1 − tỷ trọng trực tiếp)", () => {
    const result = computePreliminaryScore(trafficFixture);
    const headroom = result.components.find((component) => component.key === "channel_headroom")!;
    expect(headroom.earned).toBeCloseTo(PRELIMINARY_SCORE.weights.channelHeadroom * (1 - 0.7092), 4);
  });

  it("domain không có dữ liệu → null (không tính điểm)", () => {
    const empty = reportWith({
      overview: { ...trafficFixture.overview, visits: 0 },
      traffic_sources: {
        direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0,
        social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0,
      },
      top_regions: [],
      monthly_visits: [],
    });
    const result = computePreliminaryScore(empty);
    expect(result.score).toBeNull();
    expect(result.insufficient).toBe(true);
  });

  it("thiếu nhiều hơn 1 thành phần → chuẩn hóa về 100 + dấu hiệu chưa đủ dữ liệu", () => {
    const partial = reportWith({ traffic_sources: { ...trafficFixture.traffic_sources, direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0, social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0 } });
    // traffic (25) + trend (20) + market (20) còn → mix thiếu
    const result = computePreliminaryScore(partial);
    expect(result.score).not.toBeNull();
    expect(result.missingCount).toBe(1);
    expect(result.insufficient).toBe(false);

    const partial2 = reportWith({
      overview: { ...trafficFixture.overview, visits: 1_000_000 },
      monthly_visits: [],
      traffic_sources: { ...trafficFixture.traffic_sources, direct: 0, search: 0, search_organic: 0, search_paid: 0, social: 0, social_organic: 0, social_paid: 0, referrals: 0, paid_referrals: 0, mail: 0, gen_ai: 0, affiliate: 0, other: 0 },
    });
    // thiếu trend + mix (2 thành phần) → insufficient
    const result2 = computePreliminaryScore(partial2);
    expect(result2.missingCount).toBe(2);
    expect(result2.insufficient).toBe(true);
    expect(result2.score).not.toBeNull();
  });

  it("xu hướng: tăng +10% đạt tối đa, giảm −10% bằng 0, đi ngang ở mức giữa", () => {
    const up = computePreliminaryScore(
      reportWith({ monthly_visits: [{ month: "2026-01", visits: 100 }, { month: "2026-02", visits: 110 }] }),
    );
    const down = computePreliminaryScore(
      reportWith({ monthly_visits: [{ month: "2026-01", visits: 100 }, { month: "2026-02", visits: 90 }] }),
    );
    const flat = computePreliminaryScore(
      reportWith({ monthly_visits: [{ month: "2026-01", visits: 100 }, { month: "2026-02", visits: 100 }] }),
    );
    const trendOf = (result: ReturnType<typeof computePreliminaryScore>) =>
      result.components.find((component) => component.key === "trend")!.earned;
    expect(trendOf(up)).toBeCloseTo(PRELIMINARY_SCORE.weights.trend, 4);
    expect(trendOf(down)).toBeCloseTo(0, 4);
    expect(trendOf(flat)).toBeCloseTo(PRELIMINARY_SCORE.weights.trend / 2, 4);
  });
});

describe("parseDomainList (A8 — dán nhiều domain)", () => {
  it("tách theo dòng mới/dấu phẩy, bỏ protocol/www/path, loại trùng", () => {
    const { valid, invalid } = parseDomainList(
      "https://vercel.com/about\nwww.shopify.com, gohighlevel.com\nhttps://vercel.com",
    );
    expect(valid).toEqual(["vercel.com", "shopify.com", "gohighlevel.com"]);
    expect(invalid).toEqual([]);
  });

  it("mục không hợp lệ đưa vào invalid, không bỏ âm thầm", () => {
    const { valid, invalid } = parseDomainList("vercel.com\nkhông phải domain!!");
    expect(valid).toEqual(["vercel.com"]);
    expect(invalid).toEqual(["không phải domain!!"]);
  });
});

describe("buildCsv (A8 — xuất CSV)", () => {
  it("thêm BOM, escape ngoặc kép, CRLF", () => {
    const csv = buildCsv(["Domain", "Ghi" ], [["vercel.com", 'có "ngoặc"']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Domain","Ghi"');
    expect(csv).toContain('"có ""ngoặc"""');
    expect(csv).toContain("\r\n");
  });
});

describe("scoreMethodology — chú thích cách tính cho người dùng", () => {
  it("giải thích đủ 4 thành phần với đúng trọng số từ config", () => {
    const lines = scoreMethodology();
    expect(lines).toHaveLength(6);
    const all = lines.join(" ");
    for (const weight of [
      PRELIMINARY_SCORE.weights.trafficScale,
      PRELIMINARY_SCORE.weights.trend,
      PRELIMINARY_SCORE.weights.channelHeadroom,
      PRELIMINARY_SCORE.weights.market,
    ]) {
      expect(all).toContain(String(weight));
    }
    expect(all).toContain(PRELIMINARY_SCORE.marketCountry);
    expect(all).toContain("heuristic");
    // Quy tắc dữ liệu thiếu được nêu rõ.
    expect(all).toContain("chuẩn hóa");
    expect(all).toContain("không được chấm");
  });
});

describe("formatAffiliateCell (Phần B — placeholder)", () => {
  it("chưa có dữ liệu → 'Chưa quét'", () => {
    expect(formatAffiliateCell(null)).toBe("Chưa quét");
    expect(
      formatAffiliateCell({ co_chuong_trinh: "chua_quet", kieu_hoa_hong: null, ty_le_hoa_hong: null, nguon_url: null, do_tin_cay: null }),
    ).toBe("Chưa quét");
  });

  it("có dữ liệu → 'Có · 40% recurring'", () => {
    const info: AffiliateProgramInfo = {
      co_chuong_trinh: "co",
      kieu_hoa_hong: "recurring",
      ty_le_hoa_hong: 40,
      nguon_url: "https://example.com/affiliates",
      do_tin_cay: 0.8,
    };
    expect(formatAffiliateCell(info)).toMatch(/^Có · 40% recurring$/);
  });
});
