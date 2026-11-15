const numberFormatter = new Intl.NumberFormat("vi-VN");
const compactFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const compactUsdFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : numberFormatter.format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  return value == null ? "—" : compactFormatter.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

/**
 * Percent with vi-VN comma decimals ("48,2%") — used by the screening table
 * where the spec pins the Vietnamese decimal separator.
 */
export function formatPercentLocale(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

/**
 * Compact visits in Vietnamese units with the explicit "Tỷ" suffix (never "T",
 * which reads as "thousand"): "14 Tr", "3,4 Tỷ", "856".
 */
export function formatVisitsCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1e9, suffix: " Tỷ" },
    { threshold: 1e6, suffix: " Tr" },
    { threshold: 1e3, suffix: " N" },
  ];
  for (const { threshold, suffix } of units) {
    if (abs >= threshold) {
      const scaled = value / threshold;
      const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
      return `${rounded.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${suffix}`;
    }
  }
  return Math.round(value).toLocaleString("vi-VN");
}

export function formatDuration(value: number | null | undefined): string {
  if (value == null) return "—";
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} phút ${seconds.toString().padStart(2, "0")} giây`;
}

export function formatCurrency(value: number | null | undefined): string {
  return value == null ? "—" : usdFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  return value == null ? "—" : `${compactUsdFormatter.format(value)} USD`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "—";
  return dateFormatter.format(new Date(time));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "—";
  return `${dateTimeFormatter.format(new Date(time))} UTC`;
}

export function formatMonth(value: string | null | undefined): string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "—";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
