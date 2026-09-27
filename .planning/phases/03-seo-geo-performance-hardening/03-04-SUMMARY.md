---
phase: 03-seo-geo-performance-hardening
plan: 04
subsystem: seo, affiliate
tags: [json-ld, newsarticle, click-tracking, regression-tests, aff-02]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: ArticleModel, ClickLogModel, AffiliateLinkModel, appendSubId
  - phase: 03-seo-geo-performance-hardening
    provides: normalizeSiteUrl, serializeJsonLd (Plan 01)
provides:
  - 9 JSON-LD regression tests locking NewsArticle schema structure + canonical URL
  - 8 click tracking regression tests locking ClickLog schema + redirect sub_id + CTA rel-attributes
affects: []

actuals:
  tokens: 18000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Source-grep assertions lock structural contracts (NewsArticle type, serializeJsonLd usage, rel=nofollow sponsored)"
    - "Schema construction logic replicated from inline page.tsx objects for unit-level testing"

key-files:
  created:
    - tests/lib/article-seo-jsonld.test.ts
    - tests/api/click-tracking-pipeline.test.ts
  modified: []

key-decisions:
  - "Part A of JSON-LD test replicates the inline schema construction from page.tsx since it is not an exported function — tests the logic deterministically without importing React server components"
  - "Part B source-grep locks the structural contract at the file level"
  - "Click tracking test follows the seed pattern from tracking-redirect.test.ts but asserts on different fields (ip_address, clicked_at, utm_source, utm_medium)"

patterns-established:
  - "Regression test pattern: unit logic + source-grep dual assertion"
  - "CTA attribute contract: rel=nofollow sponsored + target=_blank across all affiliate link components"

requirements-completed: [SEO-02, AFF-02]

coverage:
  - id: D-14
    description: "Article page embeds NewsArticle JSON-LD with correct canonical URL"
    requirement: SEO-02
    verification:
      - kind: unit
        ref: tests/lib/article-seo-jsonld.test.ts
        status: pass
  - id: D-15
    description: "Affiliate tracking redirect creates ClickLog + 302 with sub_id"
    requirement: AFF-02
    verification:
      - kind: unit
        ref: tests/api/click-tracking-pipeline.test.ts
        status: pass

duration: 10min
completed: 2026-09-27
status: complete
---

# Phase 3 Plan 04: JSON-LD + Click Tracking Regression Tests Summary

**9 NewsArticle structured data tests + 8 affiliate click tracking pipeline tests — no production changes**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files created:** 2 test files (220 lines)
- **Production code changes:** 0 (TDD verification only)
- **Total test count:** 355 passing across 45 files (full suite)

## Accomplishments
- NewsArticle JSON-LD regression: tests schema type, context, mainEntityOfPage canonical URL, publisher fallback, image omission, serializeJsonLd XSS escaping, plus source-grep verification
- Click tracking pipeline: ClickLog ip_address + clicked_at assertions, 302 redirect status, sub_id = article slug, utm_source/utm_medium params, source-grep for rel="nofollow sponsored" across 3 CTA components

## Task Commits

1. **Tasks 1-2 combined** — `ca1b0ed` (test) — both regression test suites in one commit

## Files Created
- `tests/lib/article-seo-jsonld.test.ts` — 9 tests (6 logic + 3 source-grep)
- `tests/api/click-tracking-pipeline.test.ts` — 8 tests (5 pipeline + 3 source-grep)

## Decisions Made
- JSON-LD schema tested by replicating the inline construction logic (page.tsx doesn't export the schema as a standalone function)
- Source-grep tests use readFileSync to lock structural contracts at the source level

## Deviations from Plan
- Expanded test count slightly (9 vs 6 for JSON-LD, 8 vs 7 for click tracking) to include more comprehensive coverage

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- SEO-02 and AFF-02 contracts locked by regression tests
- Ready for Phase 4 (Presentation & Brand Alignment) and Phase 5 (Production Readiness)
---
*Phase: 03-seo-geo-performance-hardening*
*Completed: 2026-09-27*
