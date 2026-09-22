import { describe, expect, it } from 'vitest';
import {
  ORDERED_POSITION_LABELS,
  selectVerdictPlacement,
  splitPlacementsByVerdict,
} from '@/lib/placement-order';

describe('selectVerdictPlacement — index selection by position (WR-02)', () => {
  it('returns -1 for an empty array', () => {
    expect(selectVerdictPlacement([])).toBe(-1);
  });

  it('prefers middle_comparison over top_cta (full canonical set)', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
      { positionLabel: 'footer_banner' },
    ];
    expect(selectVerdictPlacement(placements)).toBe(1);
  });

  it('falls back to index 0 when no middle_comparison exists', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'footer_banner' },
    ];
    expect(selectVerdictPlacement(placements)).toBe(0);
  });

  it('returns 0 for a single non-middle placement', () => {
    expect(selectVerdictPlacement([{ positionLabel: 'footer_banner' }])).toBe(0);
  });

  it('returns 0 for a legacy label (falls back deterministically)', () => {
    expect(selectVerdictPlacement([{ positionLabel: 'middle' }])).toBe(0);
  });

  it('selects the first middle_comparison when duplicates exist', () => {
    const placements = [
      { positionLabel: 'middle_comparison', id: 'first' },
      { positionLabel: 'middle_comparison', id: 'second' },
    ];
    expect(selectVerdictPlacement(placements)).toBe(0);
  });

  it('uses the ORDERED_POSITION_LABELS constant for the middle label', () => {
    // Ensure the selector reads from the canonical constant, not a bare literal.
    expect(ORDERED_POSITION_LABELS[1]).toBe('middle_comparison');
  });
});

describe('splitPlacementsByVerdict — verdict + remaining mapping (WR-02)', () => {
  it('(a) full canonical set: verdict is middle_comparison, top_cta is in remaining', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
      { positionLabel: 'footer_banner' },
    ];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict).not.toBeNull();
    expect(verdict!.positionLabel).toBe('middle_comparison');
    expect(remaining.map((p) => p.positionLabel)).toEqual(['top_cta', 'footer_banner']);
  });

  it('(b) [top_cta, footer_banner] (no middle): verdict falls back to top_cta, footer remains', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'footer_banner' },
    ];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict).not.toBeNull();
    expect(verdict!.positionLabel).toBe('top_cta');
    expect(remaining.map((p) => p.positionLabel)).toEqual(['footer_banner']);
  });

  it('(c) [footer_banner] (single non-middle): verdict is the footer, remaining is empty', () => {
    const placements = [{ positionLabel: 'footer_banner' }];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict).not.toBeNull();
    expect(verdict!.positionLabel).toBe('footer_banner');
    expect(remaining).toEqual([]);
  });

  it('(d) empty array: verdict is null and remaining is empty', () => {
    const { verdict, remaining } = splitPlacementsByVerdict([]);

    expect(verdict).toBeNull();
    expect(remaining).toEqual([]);
  });

  it('(e) legacy label: selector returns 0, legacy placement is verdict, nothing remains', () => {
    const placements = [{ positionLabel: 'middle' }];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict).not.toBeNull();
    expect(verdict!.positionLabel).toBe('middle');
    expect(remaining).toEqual([]);
  });

  it('(e.2) legacy label alongside canonical: legacy falls to remaining when middle exists', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
      { positionLabel: 'middle' },
    ];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict!.positionLabel).toBe('middle_comparison');
    expect(remaining.map((p) => p.positionLabel)).toEqual(['top_cta', 'middle']);
  });

  it('(f) duplicate middle_comparison: first is verdict, second remains', () => {
    const placements = [
      { positionLabel: 'middle_comparison', id: 'first' },
      { positionLabel: 'middle_comparison', id: 'second' },
    ];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    expect(verdict).not.toBeNull();
    expect((verdict as { id: string }).id).toBe('first');
    expect(remaining).toHaveLength(1);
    expect((remaining[0] as { id: string }).id).toBe('second');
  });

  it('(g) does not mutate the input array', () => {
    const input = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
      { positionLabel: 'footer_banner' },
    ];
    const snapshot = input.map((p) => ({ ...p }));

    splitPlacementsByVerdict(input);

    expect(input).toEqual(snapshot);
    expect(input.map((p) => p.positionLabel)).toEqual(snapshot.map((p) => p.positionLabel));
  });

  it('verdict is excluded from remaining exactly once', () => {
    const placements = [
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
      { positionLabel: 'footer_banner' },
    ];
    const { verdict, remaining } = splitPlacementsByVerdict(placements);

    // verdict appears exactly 0 times in remaining
    const verdictInRemaining = remaining.filter((p) => p === verdict);
    expect(verdictInRemaining).toHaveLength(0);
    // total count preserved: verdict (1) + remaining (2) = 3
    expect(remaining.length + (verdict ? 1 : 0)).toBe(placements.length);
  });
});
