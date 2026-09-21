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
