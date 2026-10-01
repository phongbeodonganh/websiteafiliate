import { describe, expect, it } from 'vitest';
import {
  ORDERED_POSITION_LABELS,
  positionRank,
  sortPlacementsByPosition,
} from '@/lib/placement-order';

describe('ORDERED_POSITION_LABELS — canonical CMS-03 order (A2)', () => {
  it('pins top_cta -> middle_comparison -> footer_banner', () => {
    expect([...ORDERED_POSITION_LABELS]).toEqual(['top_cta', 'middle_comparison', 'footer_banner']);
  });
});

describe('positionRank', () => {
  it('returns the canonical index for known labels', () => {
    expect(positionRank('top_cta')).toBe(0);
    expect(positionRank('middle_comparison')).toBe(1);
    expect(positionRank('footer_banner')).toBe(2);
  });

  it('ties every unknown/legacy label after the canonical three', () => {
    expect(positionRank('middle')).toBe(ORDERED_POSITION_LABELS.length);
    expect(positionRank('footer_banner_legacy')).toBe(ORDERED_POSITION_LABELS.length);
    expect(positionRank('')).toBe(ORDERED_POSITION_LABELS.length);
  });
});

describe('sortPlacementsByPosition — stable canonical-order render (CMS-03 / Pitfall 6)', () => {
  it('reorders [footer_banner, top_cta, middle_comparison] to canonical order', () => {
    const sorted = sortPlacementsByPosition([
      { positionLabel: 'footer_banner' },
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
    ]);

    expect(sorted.map((placement) => placement.positionLabel)).toEqual([
      'top_cta',
      'middle_comparison',
      'footer_banner',
    ]);
  });

  it('keeps stored relative order for equal position labels (stable, adjacency edge)', () => {
    const sorted = sortPlacementsByPosition([
      { positionLabel: 'top_cta', linkId: 'first-top' },
      { positionLabel: 'footer_banner', linkId: 'only-footer' },
      { positionLabel: 'top_cta', linkId: 'second-top' },
    ]);

    expect(sorted.map((placement) => placement.linkId)).toEqual([
      'first-top',
      'second-top',
      'only-footer',
    ]);
  });

  it('sorts an unknown/legacy label after all canonical labels without dropping it', () => {
    const sorted = sortPlacementsByPosition([
      { positionLabel: 'middle' },
      { positionLabel: 'footer_banner' },
      { positionLabel: 'top_cta' },
    ]);

    expect(sorted.map((placement) => placement.positionLabel)).toEqual([
      'top_cta',
      'footer_banner',
      'middle',
    ]);
  });

  it('handles empty and single-element inputs', () => {
    expect(sortPlacementsByPosition([])).toEqual([]);

    const single = [{ positionLabel: 'footer_banner' }];
    expect(sortPlacementsByPosition(single)).toEqual(single);
  });

  it('does not mutate the input array', () => {
    const input = [
      { positionLabel: 'footer_banner' },
      { positionLabel: 'top_cta' },
      { positionLabel: 'middle_comparison' },
    ];
    const snapshot = input.map((placement) => placement.positionLabel);

    sortPlacementsByPosition(input);

    expect(input.map((placement) => placement.positionLabel)).toEqual(snapshot);
  });
});
