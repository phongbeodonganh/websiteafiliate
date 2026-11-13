import { describe, expect, it } from "vitest";
import { formatNumber, formatPercent } from "@/lib/traffic/format";

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
});
