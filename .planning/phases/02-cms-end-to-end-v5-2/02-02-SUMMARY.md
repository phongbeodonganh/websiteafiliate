---
phase: 02-cms-end-to-end-v5-2
plan: 02
subsystem: ui
tags: [json-ld, faqpage, schema.org, seo, geo, affiliate-placements, vitest, cms-02, cms-03]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: 02-01 async DB-backed auth guard (unrelated to this plan's public render path)
provides:
  - "Pure `buildFaqPageSchema(faq_schema)` builder returning a schema.org FAQPage object or null"
  - "Third `application/ld+json` script on the public article page, emitted only when complete pairs exist"
  - "Stable canonical placement-order helper (`ORDERED_POSITION_LABELS`, `positionRank`, `sortPlacementsByPosition`)"
  - "Deterministic render order top_cta → middle_comparison → footer_banner regardless of stored/click order"
  - "Unit tests for both helpers (14 tests: FAQ truth table + escaping, canonical order + stability + unknown-label + no-mutation)"
affects: [02-cms-end-to-end-v5-2, 04-public-bento (phase 4), all future affiliate placement render work]

actuals:
  tokens: 3403
  tasks: 2
  commits: 2
  plan_head_before: 523cc517681d18ad4043cae6338fb5d0179b0f60

tech-stack:
  added: []
  patterns:
    - "Pure lib builder returning object|null; caller guards emission with `schema &&` in JSX"
    - "Decorate-sort-undecorate for an explicitly stable sort instead of relying on Array.prototype.sort stability"
    - "All JSON-LD output routed through the single `serializeJsonLd` escaper (< → \\u003c)"

key-files:
  created:
    - src/lib/faq-jsonld.ts
    - src/lib/placement-order.ts
    - tests/lib/faq-jsonld.test.ts
    - tests/lib/placement-order.test.ts
  modified:
    - src/app/article/[slug]/page.tsx

key-decisions:
  - "FAQ completeness rule mirrors the editor's existing `f.question.trim() && f.answer.trim()` drop-incomplete filter exactly — a pair is kept only when both sides are strings with non-whitespace content after trim"
  - "`buildFaqPageSchema` is a zero-dependency pure builder (no next/*, no DB) so it is trivially unit-testable; the page owns the guarded emission"
  - "Canonical order pinned as the A2 recommendation top_cta → middle_comparison → footer_banner; legacy `middle` and any unknown label tie after the three canonical labels (rank = length) and are never dropped"
  - "Stability is guaranteed explicitly via original-index tiebreaker, not assumed from Array.prototype.sort"
  - "Render-side ordering is the deterministic source of truth; the CMS payload is not reordered at write time (plan 02-06's concern)"

patterns-established:
  - "Structured-data builder + guarded script emission: build pure, guard at the JSX boundary"
  - "Stable canonical sort helper with an unknown-label fallback rank rather than a hard failure"

requirements-completed: [CMS-02, CMS-03]

coverage:
  - id: D1
    description: "A published article whose faq_schema holds complete {question, answer} pairs renders a FAQPage JSON-LD block (one Question per pair, in stored order); no complete pairs renders no FAQPage script"
    requirement: CMS-02
    verification:
      - kind: unit
        ref: "tests/lib/faq-jsonld.test.ts#builds a FAQPage object with one Question per complete pair, in stored order"
        status: pass
      - kind: unit
        ref: "tests/lib/faq-jsonld.test.ts#returns null for undefined, empty, and all-incomplete lists (edge: empty)"
        status: pass
      - kind: unit
        ref: "tests/lib/faq-jsonld.test.ts#keeps only complete pairs from a mixed list and reflects the filtered count"
        status: pass
    human_judgment: false
  - id: D2
    description: "FAQ text cannot break out of the JSON-LD script tag — a question containing markup-closing sequence serializes with no raw `<` (T-02-06 mitigate)"
    requirement: CMS-02
    verification:
      - kind: unit
        ref: "tests/lib/faq-jsonld.test.ts#escapes a markup-closing question so the serialized output contains no raw \"<\" (T-02-06)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Affiliate placements render in canonical position order top_cta → middle_comparison → footer_banner, stable for ties, tolerant of unknown labels, non-mutating"
    requirement: CMS-03
    verification:
      - kind: unit
        ref: "tests/lib/placement-order.test.ts#reorders [footer_banner, top_cta, middle_comparison] to canonical order"
        status: pass
      - kind: unit
        ref: "tests/lib/placement-order.test.ts#keeps stored relative order for equal position labels (stable, adjacency edge)"
        status: pass
      - kind: unit
        ref: "tests/lib/placement-order.test.ts#sorts an unknown/legacy label after all canonical labels without dropping it"
        status: pass
      - kind: unit
        ref: "tests/lib/placement-order.test.ts#does not mutate the input array"
        status: pass
    human_judgment: false
  - id: D4
    description: "The public article page emits three ld+json blocks (NewsArticle, BreadcrumbList, FAQPage-when-present) and applies the placement sort before the verdict/remaining split"
    requirement: CMS-03
    verification:
      - kind: other
        ref: "grep src/app/article/[slug]/page.tsx: 3 × application/ld+json; sortPlacementsByPosition at line 99 before verdictPlacement/remainingPlacements at 112-113"
        status: pass
      - kind: integration
        ref: "npx tsc --noEmit (clean) + npm test (20 files / 214 tests passed)"
        status: pass
    human_judgment: true
    rationale: "A visual/devtools spot check that a real published article emits the three blocks and that CTAs display in canonical order in the browser is not assertable from the pure-function tests; the automated evidence proves the wiring and types but not the rendered DOM."

duration: 11min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 2: FAQPage JSON-LD + Canonical Placement Order Summary

**The public article page now emits a schema.org FAQPage JSON-LD block built from stored `faq_schema` through the shared escaper, and affiliate placements render in deterministic top_cta → middle_comparison → footer_banner order regardless of click order.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-21T04:14:33Z
- **Completed:** 2026-09-21T04:25:47Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- Added `buildFaqPageSchema(faq_schema)` — a zero-dependency pure builder returning a `@type: 'FAQPage'` object with `mainEntity` an array of `Question → acceptedAnswer/Answer`, one per complete pair in stored order, or `null` when no complete pair exists.
- Wired a guarded third `<script type="application/ld+json">` into `src/app/article/[slug]/page.tsx` via `serializeJsonLd`, so article FAQ text (including a `</script>` payload) cannot break out of the JSON-LD block — the existing NewsArticle and BreadcrumbList blocks are untouched.
- Added `sortPlacementsByPosition` with `ORDERED_POSITION_LABELS`/`positionRank`, applied before the Editor's Verdict / remaining-CTA split, so public render order is deterministic and no longer follows editor click order.
- Stability is explicit (decorate-sort-undecorate with original-index tiebreaker); unknown/legacy labels (e.g. `middle`) tie after the canonical three and are never dropped; the input array is never mutated.
- 14 new unit tests; full suite green (20 files / 214 tests) and `npx tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — FAQ Q&A pair → FAQPage JSON-LD on a rendered article** - `f0a5b20` (feat)
2. **Task 2: Expansion — canonical affiliate-placement render order** - `4626023` (feat)

**Plan metadata:** (pending docs commit)

_Note: TDD-style work — test files and implementation land in the same task commit (RED confirmed locally, then GREEN)._

## Files Created/Modified
- `src/lib/faq-jsonld.ts` - NEW: pure `buildFaqPageSchema`; filters incomplete/non-string pairs, trims emitted values, returns `null` on empty result
- `src/lib/placement-order.ts` - NEW: `ORDERED_POSITION_LABELS`, `positionRank`, stable `sortPlacementsByPosition`
- `src/app/article/[slug]/page.tsx` - MOD: import + apply both helpers; placement sort before the verdict split; guarded third ld+json script
- `tests/lib/faq-jsonld.test.ts` - NEW: pair truth table, empty/mixed lists, trimming, defensive non-string drop, `</script>` escaping
- `tests/lib/placement-order.test.ts` - NEW: canonical reorder, tie stability, unknown-label tolerance, empty/single, no-mutation

## Decisions Made
- **FAQ completeness rule mirrors the editor** (`f.question.trim() && f.answer.trim()`), plus a defensive `typeof === 'string'` guard for non-string stored values — verified by the non-string-drop test.
- **Pure builder, page-level guard:** `buildFaqPageSchema` imports nothing from `next/*` or the DB; the RSC guards emission with `faqPageSchema &&`, keeping the builder trivially testable.
- **Canonical order = A2 recommendation:** `top_cta → middle_comparison → footer_banner`; any label not in the list ranks after the three (`positionRank` returns `ORDERED_POSITION_LABELS.length`) rather than being dropped or sorted first.
- **Explicit stability:** decorate-sort-undecorate with the original index as tiebreaker, so equal-key ordering is guaranteed and testable independent of engine sort behavior.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `npx tsc --noEmit` is clean and the full suite is green (20 files, 214 tests) after both tasks. (Pre-existing Mongoose `findOneAndUpdate` deprecation warnings appear in test output but are unrelated to this plan.)

## Threat Surface Known
- T-02-06 (Tampering — FAQ text breaking out of the JSON-LD script) mitigated as planned: all output goes through `serializeJsonLd` (`<` → `\u003c`); an assertion proves the serialized string contains no raw `<`.
- T-02-07 (Information disclosure — malformed FAQ pairs leaking) mitigated as planned: incomplete pairs are dropped by the same rule the editor uses.
- T-02-08 (Tampering — placement order manipulation) accepted: ordering is cosmetic and already gated by admin-only placement management; the canonical sort reduces manipulation surface.
- T-02-SC (package legitimacy) not applicable: this plan installed zero packages.
- No new network endpoints, auth paths, or trust-boundary surface introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CMS-02's end-to-end contract now holds: stored FAQ pairs auto-embed as FAQPage JSON-LD on the public page (ROADMAP success criterion #1).
- CMS-03 render order is deterministic (ROADMAP success criterion #3); the remaining CMS write-payload ordering concern belongs to plan 02-06.
- Ready for the next plan in Phase 02.

## Self-Check: PASSED

- `src/lib/faq-jsonld.ts`, `src/lib/placement-order.ts`, `tests/lib/faq-jsonld.test.ts`, `tests/lib/placement-order.test.ts` all present
- Commits `f0a5b20` (Task 1) and `4626023` (Task 2) present in history
- `npx vitest run tests/lib/faq-jsonld.test.ts tests/lib/placement-order.test.ts` → 14 passed; `npm test` → 20 files / 214 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
