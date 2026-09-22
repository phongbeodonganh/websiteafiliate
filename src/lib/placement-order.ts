// Thứ tự chuẩn tất định cho affiliate placements khi render công khai (CMS-03 / A2 / Pitfall 6).
// Editor thêm placement theo thứ tự click; helper này sắp lại theo position_label chuẩn
// để trang public luôn hiển thị top_cta -> middle_comparison -> footer_banner.

export const ORDERED_POSITION_LABELS = ['top_cta', 'middle_comparison', 'footer_banner'] as const;

/**
 * Xếp hạng position_label trong thứ tự chuẩn.
 * Label không nằm trong danh sách (kể cả legacy `middle`) trả về
 * `ORDERED_POSITION_LABELS.length` để mọi label lạ cùng nằm sau ba label chuẩn.
 */
export function positionRank(label: string): number {
  const index = (ORDERED_POSITION_LABELS as readonly string[]).indexOf(label);
  return index === -1 ? ORDERED_POSITION_LABELS.length : index;
}

/**
 * Sắp xếp placements theo thứ tự vị trí chuẩn, ổn định (stable).
 * Dùng decorate-sort-undecorate với index gốc làm tiebreaker thay vì dựa vào
 * tính ổn định của Array.prototype.sort — đảm bảo tường minh và testable.
 * Trả về mảng mới; không bao giờ mutate mảng đầu vào.
 */
export function sortPlacementsByPosition<T extends { positionLabel: string }>(placements: T[]): T[] {
  return placements
    .map((placement, originalIndex) => ({ placement, originalIndex }))
    .sort((a, b) => {
      const rankDelta = positionRank(a.placement.positionLabel) - positionRank(b.placement.positionLabel);
      return rankDelta !== 0 ? rankDelta : a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.placement);
}

// Verdict selection by position (WR-02): the canonical sort orders top_cta first,
// so choosing the verdict by array index (placements[0]) always consumes top_cta
// as the mid-article Editor's Verdict, leaving no top-of-article CTA. Instead we
// select the verdict by position label — preferring middle_comparison — so top_cta
// stays in the remaining/offers slot and the verdict surfaces where intended.

/**
 * Trả về index của placement nên làm Editor's Verdict:
 * ưu tiên `middle_comparison` đầu tiên, fallback về index 0,
 * trả về -1 khi mảng rỗng. Không mutate input.
 */
export function selectVerdictPlacement<T extends { positionLabel: string }>(placements: T[]): number {
  if (placements.length === 0) return -1;
  const middleLabel = ORDERED_POSITION_LABELS[1]; // 'middle_comparison'
  const middleIdx = placements.findIndex((p) => p.positionLabel === middleLabel);
  return middleIdx >= 0 ? middleIdx : 0;
}

/**
 * Tách placements thành verdict và remaining theo position (WR-02).
 * Verdict được chọn bởi selectVerdictPlacement; remaining giữ mọi placement khác
 * theo thứ tự gốc. Trả về verdict null và remaining rỗng cho input rỗng.
 * Không mutate input.
 */
export function splitPlacementsByVerdict<T extends { positionLabel: string }>(
  placements: T[],
): { verdict: T | null; remaining: T[] } {
  const idx = selectVerdictPlacement(placements);
  if (idx === -1) return { verdict: null, remaining: [] };
  return {
    verdict: placements[idx],
    remaining: placements.filter((_, i) => i !== idx),
  };
}
