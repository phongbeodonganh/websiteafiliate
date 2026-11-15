import { describe, expect, it } from "vitest";
import { formatNumber, formatPercent, formatPercentLocale, formatVisitsCompact } from "@/lib/traffic/format";

describe("format helpers", () => {
  it("định dạng số và giá trị rỗng", () => {
    expect(formatNumber(1234567)).toMatch(/1[.,]234[.,]567/);
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("định dạng phần trăm và giá trị rỗng", () => {
    expect(formatPercent(0.3183)).toBe("31.8%");
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(null)).toBe("—");
  });

  it("formatPercentLocale dùng dấu phẩy thập phân vi-VN", () => {
    expect(formatPercentLocale(0.4821)).toMatch(/48,2%/);
    expect(formatPercentLocale(0)).toMatch(/0%/);
    expect(formatPercentLocale(null)).toBe("—");
  });

  it("formatVisitsCompact rút gọn theo đơn vị Việt, dùng 'Tỷ' thay cho 'T'", () => {
    expect(formatVisitsCompact(856)).toBe("856");
    expect(formatVisitsCompact(14_000_000)).toMatch(/14 Tr/);
    expect(formatVisitsCompact(3_400_000_000)).toMatch(/3,4 Tỷ/);
    expect(formatVisitsCompact(1_200_000_000)).toMatch(/1,2 Tỷ/);
    expect(formatVisitsCompact(null)).toBe("—");
  });
});
