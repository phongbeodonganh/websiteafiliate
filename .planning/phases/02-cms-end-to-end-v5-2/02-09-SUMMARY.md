---
phase: 02-cms-end-to-end-v5-2
plan: 09
subsystem: ui
tags: [placement, rsc, pure-function, gap-closure]
requires:
  - "02-02: sortPlacementsByPosition + ORDERED_POSITION_LABELS (provides ordered placements)"
provides:
  - "selectVerdictPlacement and splitPlacementsByVerdict in placement-order.ts"
  - "Article RSC consumes verdict by position instead of array index"
affects:
  - "src/app/article/[slug]/page.tsx (verdict selection logic)"
tech-stack:
  added: []
  patterns:
    - "Pure selector function + split helper over ORDERED_POSITION_LABELS"
    - "Position-based selection (middle_comparison) over array-index selection"
key-files:
  created:
    - "tests/lib/placement-verdict-order.test.ts"
  modified:
    - "src/lib/placement-order.ts"
    - "src/app/article/[slug]/page.tsx"
key-decisions:
  - "Verdict chosen by position label (middle_comparison preferred), not array index — top_cta stays in remaining/offers slot"
  - "Pure extractable functions matching repo convention (faq-jsonld.ts, placement-order.ts)"
  - "Legacy/unknown labels fall back deterministically to index 0 (verdict), never dropped"
requirements-completed: [CMS-03]
duration: 5min
completed: 2026-09-22
status: complete
commits: 3
plan_head_before: 2f82e17bda70eaf2ea112abb1fea14d7ae5c6780
actuals:
  tokens: 12000
  tasks: 2
  commits: 2
---

# Phase 02 Plan 09: Verdict-by-Position Gap Closure Summary

WR-02 closed: Editor's Verdict now selected by position (middle_comparison) instead of array index (placements[0]), so top_cta stays renderable at the top and a middle_comparison can surface as the verdict.

## What Was Built

### Task 1: Pure verdict selector + unit tests

Added two pure exported functions to `src/lib/placement-order.ts`:

- **`selectVerdictPlacement<T>(placements: T[]): number`** — returns the index of the placement that should become the Editor's Verdict. Prefers the first `middle_comparison` (read from `ORDERED_POSITION_LABELS[1]`, not a bare literal), falls back to `0` when no middle exists, returns `-1` for empty arrays.
- **`splitPlacementsByVerdict<T>(placements: T[]): { verdict: T | null; remaining: T[] }`** — calls the selector and splits into verdict + remaining. For empty input returns `{ verdict: null, remaining: [] }`. The verdict is excluded from remaining exactly once.

Neither function mutates its input.

Created `tests/lib/placement-verdict-order.test.ts` with 18 unit tests covering:
- (a) Full canonical set `[top_cta, middle_comparison, footer_banner]` → verdict is middle_comparison, top_cta in remaining
- (b) `[top_cta, footer_banner]` (no middle) → verdict falls back to top_cta, footer remains
- (c) `[footer_banner]` (single non-middle) → verdict is the footer, remaining empty
- (d) `[]` → verdict null, remaining empty
- (e) Legacy label `middle` → falls back to index 0 deterministically; with canonical labels present, stays in remaining
- (f) Duplicate `[middle_comparison, middle_comparison]` → first is verdict, second remains
- (g) Input not mutated

### Task 2: RSC call site updated

Replaced the index-based split in `src/app/article/[slug]/page.tsx`:
- **Before:** `verdictPlacement = placements[0] || null; remainingPlacements = placements.slice(1)`
- **After:** `const { verdict: verdictPlacement, remaining: remainingPlacements } = splitPlacementsByVerdict(placements)`

Import updated to include `splitPlacementsByVerdict` from `@/lib/placement-order`. All downstream consumers (`EditorVerdict`, offers aside, `StickyMobileBar`) read the same variables and work unchanged.

## Deviations from Plan

None — plan executed exactly as written.

**Out-of-scope note:** `npx tsc --noEmit` surfaced 3 TS errors in `tests/api/blacklist-post-rbac.test.ts` (from plan 02-07's parallel work). These are pre-existing and unrelated to this plan's changes. Not fixed per scope boundary rules.

## Coverage

| Deliverable | Verification | Result |
|-------------|-------------|--------|
| `selectVerdictPlacement` pure selector | `npx vitest run placement-verdict-order.test.ts` | 7 tests passed |
| `splitPlacementsByVerdict` pure split | `npx vitest run placement-verdict-order.test.ts` | 11 tests passed |
| Existing sort unchanged | `npx vitest run placement-order.test.ts` | 12 tests passed (no regressions) |
| RSC call site compiles | `npx tsc --noEmit` (page.tsx only) | No TS errors in modified file |
| FAQ JSON-LD unaffected | `npx vitest run faq-jsonld.test.ts` | 8 tests passed |
| No mutation of input | Test (g) in verdict suite | Passed |

## Commits

- `a75df8d`: feat(02-09): pure verdict selector + unit tests in placement-order.ts
- `efc48e0`: fix(02-09): consume split-by-position selector in article RSC

## Self-Check: PASSED

- [x] `src/lib/placement-order.ts` — selectVerdictPlacement + splitPlacementsByVerdict exported, uses ORDERED_POSITION_LABELS[1]
- [x] `tests/lib/placement-verdict-order.test.ts` — 18 tests created and passing
- [x] `src/app/article/[slug]/page.tsx` — calls splitPlacementsByVerdict, no `placements[0]` or `placements.slice(1)`
- [x] Commit `a75df8d` exists in git log
- [x] Commit `efc48e0` exists in git log
- [x] All 30 placement/FAQ tests pass
- [x] tsc --noEmit clean for all modified files
