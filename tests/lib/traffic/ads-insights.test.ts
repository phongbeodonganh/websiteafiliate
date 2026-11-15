import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_WINDOW_DAYS,
  domainBrandKey,
  groupAdvertisers,
  resolveOwnerFlag,
  summarizeAdvertisers,
  warnIfCreativeOrderUnexpected,
} from "@/lib/traffic/ads-insights";
import type { AdCreativeSample } from "@/types/traffic";

const NOW_SECONDS = 1_700_000_000; // 2023-11-14T22:13:20Z
const DAY = 86_400;

function creative(
  overrides: Partial<AdCreativeSample> & { advertiser_id: string; advertiser: string },
): AdCreativeSample {
  return { first_shown: null, last_shown: null, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveOwnerFlag — brand match giữa advertiser và domain", () => {
  it("gohighlevel.com khớp 'HighLevel LLC' → Chính chủ", () => {
    expect(resolveOwnerFlag("HighLevel LLC", "gohighlevel.com")).toBe("owner");
  });

  it("bỏ hậu tố công ty trước khi khớp", () => {
    expect(resolveOwnerFlag("Shopify Limited", "shopify.com")).toBe("owner");
    expect(resolveOwnerFlag("ClickFunnels, Inc.", "clickfunnels.com")).toBe("owner");
  });

  it("tên không liên quan → Bên ngoài", () => {
    expect(resolveOwnerFlag("Some Random Shop", "gohighlevel.com")).toBe("external");
  });

  it("không chắc chắn → Bên ngoài (tên rỗng hoặc domain rỗng)", () => {
    expect(resolveOwnerFlag("", "gohighlevel.com")).toBe("external");
    expect(resolveOwnerFlag("HighLevel LLC", "")).toBe("external");
  });

  it("domainBrandKey bỏ TLD", () => {
    expect(domainBrandKey("gohighlevel.com")).toBe("gohighlevel");
    expect(domainBrandKey("www.shopify.co.uk")).toBe("shopify");
  });
});

describe("groupAdvertisers — nhóm theo advertiser từ mẫu creative", () => {
  it("đếm creative, chọn creative mới nhất và tính số ngày chạy", () => {
    const rows = groupAdvertisers(
      [
        creative({
          advertiser_id: "AR1",
          advertiser: "Alpha LLC",
          first_shown: NOW_SECONDS - 10 * DAY,
          last_shown: NOW_SECONDS - 3 * DAY,
        }),
        creative({
          advertiser_id: "AR1",
          advertiser: "Alpha LLC",
          // newest theo first_shown lớn nhất
          first_shown: NOW_SECONDS - 5 * DAY,
          last_shown: NOW_SECONDS,
        }),
      ],
      "example.com",
      NOW_SECONDS,
    );

    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.creative_count).toBe(2);
    expect(row.newest_creative?.first_shown).toBe(NOW_SECONDS - 5 * DAY);
    // floor((last - first) / 86400) + 1
    expect(row.newest_run_days).toBe(6);
    expect(row.last_run).toBe(NOW_SECONDS);
    expect(row.is_active).toBe(true);
    expect(row.owner).toBe("external");
  });

  it("advertiser_id trống → gom theo tên advertiser", () => {
    const rows = groupAdvertisers(
      [
        creative({ advertiser_id: "", advertiser: "Beta Shop", first_shown: NOW_SECONDS, last_shown: NOW_SECONDS }),
        creative({ advertiser_id: "", advertiser: "Beta Shop", first_shown: NOW_SECONDS, last_shown: NOW_SECONDS }),
        creative({ advertiser_id: "AR2", advertiser: "Beta Shop", first_shown: NOW_SECONDS, last_shown: NOW_SECONDS }),
      ],
      "example.com",
      NOW_SECONDS,
    );

    expect(rows).toHaveLength(2);
    const byName = rows.find((row) => row.advertiser_id === "");
    const byId = rows.find((row) => row.advertiser_id === "AR2");
    expect(byName?.creative_count).toBe(2);
    expect(byId?.creative_count).toBe(1);
  });

  it("creative thiếu first_shown/last_shown vẫn đếm vào creative_count nhưng bỏ khỏi phép tính ngày", () => {
    const rows = groupAdvertisers(
      [
        creative({ advertiser_id: "AR1", advertiser: "Alpha LLC" }),
        creative({
          advertiser_id: "AR1",
          advertiser: "Alpha LLC",
          first_shown: NOW_SECONDS - 2 * DAY,
          last_shown: NOW_SECONDS,
        }),
      ],
      "example.com",
      NOW_SECONDS,
    );

    expect(rows[0].creative_count).toBe(2);
    expect(rows[0].newest_creative?.first_shown).toBe(NOW_SECONDS - 2 * DAY);
    expect(rows[0].newest_run_days).toBe(3);
  });

  it("status 'Đang chạy' trong ACTIVE_WINDOW_DAYS, ngoài khoảng thì 'Ngừng'", () => {
    const rows = groupAdvertisers(
      [
        creative({
          advertiser_id: "AR1",
          advertiser: "Fresh",
          first_shown: NOW_SECONDS - DAY,
          last_shown: NOW_SECONDS - DAY,
        }),
        creative({
          advertiser_id: "AR2",
          advertiser: "Stale",
          first_shown: NOW_SECONDS - 30 * DAY,
          last_shown: NOW_SECONDS - (ACTIVE_WINDOW_DAYS + 1) * DAY,
        }),
      ],
      "example.com",
      NOW_SECONDS,
    );

    expect(rows[0].name).toBe("Fresh");
    expect(rows[0].is_active).toBe(true);
    expect(rows[1].is_active).toBe(false);
  });

  it("sắp xếp: đang chạy lên trước, rồi last_run giảm dần, thiếu mốc xuống cuối", () => {
    const rows = groupAdvertisers(
      [
        creative({ advertiser_id: "AR3", advertiser: "NoTime" }),
        creative({
          advertiser_id: "AR1",
          advertiser: "Older Active",
          first_shown: NOW_SECONDS - 5 * DAY,
          last_shown: NOW_SECONDS - 2 * DAY,
        }),
        creative({
          advertiser_id: "AR2",
          advertiser: "Newest Active",
          first_shown: NOW_SECONDS - 2 * DAY,
          last_shown: NOW_SECONDS,
        }),
      ],
      "example.com",
      NOW_SECONDS,
    );

    expect(rows.map((row) => row.name)).toEqual(["Newest Active", "Older Active", "NoTime"]);
  });
});

describe("summarizeAdvertisers — dòng tổng", () => {
  it("đếm tổng, đang chạy và bên ngoài đang chạy", () => {
    const rows = groupAdvertisers(
      [
        creative({
          advertiser_id: "AR1",
          advertiser: "gohighlevel",
          first_shown: NOW_SECONDS - DAY,
          last_shown: NOW_SECONDS,
        }),
        creative({
          advertiser_id: "AR2",
          advertiser: "External Active",
          first_shown: NOW_SECONDS - DAY,
          last_shown: NOW_SECONDS,
        }),
        creative({
          advertiser_id: "AR3",
          advertiser: "External Stale",
          first_shown: NOW_SECONDS - 40 * DAY,
          last_shown: NOW_SECONDS - 40 * DAY,
        }),
      ],
      "gohighlevel.com",
      NOW_SECONDS,
    );
    const summary = summarizeAdvertisers(rows, 3);

    expect(summary.advertiser_total).toBe(3);
    expect(summary.advertiser_active).toBe(2);
    expect(summary.external_active).toBe(1);
    expect(summary.sample_size).toBe(3);
  });
});

describe("warnIfCreativeOrderUnexpected — log dev khi giả định thứ tự sai", () => {
  it("cảnh báo khi last_shown tăng trong thứ tự trả về", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfCreativeOrderUnexpected([
      creative({ advertiser_id: "AR1", advertiser: "A", last_shown: NOW_SECONDS - DAY }),
      creative({ advertiser_id: "AR2", advertiser: "B", last_shown: NOW_SECONDS }),
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("KHÔNG giảm dần");
  });

  it("không cảnh báo khi thứ tự giảm dần (bỏ qua creative thiếu last_shown)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfCreativeOrderUnexpected([
      creative({ advertiser_id: "AR1", advertiser: "A", last_shown: NOW_SECONDS }),
      creative({ advertiser_id: "AR2", advertiser: "B" }),
      creative({ advertiser_id: "AR3", advertiser: "C", last_shown: NOW_SECONDS - DAY }),
    ]);
    expect(warn).not.toHaveBeenCalled();
  });
});
