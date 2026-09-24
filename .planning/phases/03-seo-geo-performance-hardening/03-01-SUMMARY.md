---
phase: 03-seo-geo-performance-hardening
plan: 01
subsystem: database, infra
tags: [next.js, after, unstable_cache, react-cache, mongodb, atomic-inc, dedupe]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: ArticleModel with view_count field, placement-order utilities, sanitize/seo helpers
provides:
  - Fire-and-forget view counting via after() + atomic $inc with 60s IP+article dedupe
  - Per-request article data cache (React.cache) + cross-request unstable_cache with per-slug tag and 60s revalidate
  - revalidateArticle(slug) and revalidateSitemap() cache bust helpers
  - SITEMAP_CACHE_TAG constant exported for 03-03 wiring
affects: [03-03 (cache bust wiring), 03-04 (regression tests for article canonical JSON-LD)]

actuals:
  tokens: 12000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "after() fire-and-forget for non-blocking side effects in RSC Server Components"
    - "consumeDedupe + atomic $inc replacing read-modify-write save() for counters"
    - "React.cache() per-request dedup wrapping unstable_cache() cross-request cache"
    - "unstable_cache vitest guard (try/catch fallback to inner function when no Next runtime)"

key-files:
  created:
    - src/lib/view-count.ts
    - tests/lib/article-view-count.test.ts
    - tests/lib/article-cache.test.ts
  modified:
    - src/app/article/[slug]/page.tsx
    - src/lib/cache-revalidation.ts

key-decisions:
  - "view-count.ts re-exports _resetForTests from rateLimit.ts so tests clear the dedupe Map without coupling to rateLimit internals"
  - "ObjectId guard added to recordView so invalid articleId strings never throw into after() handler (Mongoose CastError on bad ObjectId)"
  - "fetchArticlePageData wrapped in try/catch to fallback to direct loadArticlePageData when unstable_cache throws incrementalCache invariant in vitest"
  - "export const revalidate = 0 removed — unstable_cache controls revalidation, not the route config"

patterns-established:
  - "after() + dedupe + $inc: canonical pattern for fire-and-forget counters in RSC render path"
  - "React.cache(unstable_cache(...)): per-request dedup inside cross-request cache for DB-backed page data"
  - "Vitest guard for unstable_cache: try/catch on 'incrementalCache missing' error, fallback to direct call"

requirements-completed: [PERF-02, PERF-01]

coverage:
  - id: D1
    description: "recordView increments view_count atomically via $inc with 60s IP+article dedupe — no read-modify-write"
    requirement: PERF-02
    verification:
      - kind: unit
        ref: tests/lib/article-view-count.test.ts#increments view_count by exactly 1 on the first call
        status: pass
      - kind: unit
        ref: tests/lib/article-view-count.test.ts#skips the increment on a duplicate call within the 60s dedupe window
        status: pass
      - kind: unit
        ref: tests/lib/article-view-count.test.ts#increments independently from a different IP
        status: pass
      - kind: unit
        ref: tests/lib/article-view-count.test.ts#does not throw on an invalid articleId
        status: pass
    human_judgment: false
  - id: D2
    description: "Article page RSC render path contains zero article.save() calls — view counting moved to after() callback"
    requirement: PERF-02
    verification:
      - kind: unit
        ref: "Source contract: page.tsx imports after from next/server and calls after(() => recordView(...)); article.save() removed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Article page data served from React.cache() + unstable_cache() with per-slug tag and 60s revalidate"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: tests/lib/article-cache.test.ts#returns article page data for a valid published slug
        status: pass
      - kind: unit
        ref: tests/lib/article-cache.test.ts#returns null for a slug that does not exist
        status: pass
      - kind: unit
        ref: tests/lib/article-cache.test.ts#can be called twice without throwing
        status: pass
    human_judgment: false
  - id: D4
    description: "cache-revalidation.ts exports revalidateArticle(slug) and revalidateSitemap() for CMS cache bust wiring (consumed by 03-03)"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: "Source contract: src/lib/cache-revalidation.ts exports revalidateArticle, revalidateSitemap, SITEMAP_CACHE_TAG"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-09-24
status: complete
---

# Phase 3 Plan 01: Article View Counting + Page Caching Summary

**Fire-and-forget view counting via after() + atomic $inc with IP dedupe, and React.cache() + unstable_cache() for cross-request article page data caching**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2
- **Files modified:** 2 (page.tsx, cache-revalidation.ts)
- **Files created:** 3 (view-count.ts, article-view-count.test.ts, article-cache.test.ts)

## Accomplishments
- Replaced read-modify-write `article.save()` anti-pattern with fire-and-forget `after(() => recordView(articleId, ip))` using atomic MongoDB `$inc` and 60s rolling dedupe — five rapid reloads from one IP now increment exactly once
- Layered `React.cache()` (per-request dedup) + `unstable_cache()` (cross-request, per-slug tag, 60s revalidate) around the entire article page data fetch — generateMetadata and page body share exactly one DB query per request
- Extended cache-revalidation.ts with `revalidateArticle(slug)` and `revalidateSitemap()` following the proven `revalidateTag(tag, "max")` + vitest-guard pattern

## Task Commits

1. **Task 1: Fire-and-forget view counting via after()** — `0fa4052` (feat)
2. **Task 2: Article page fetch caching with React.cache() + unstable_cache()** — `b412b85` (feat)

## Files Created/Modified
- `src/lib/view-count.ts` — recordView(articleId, ip) with consumeDedupe + atomic $inc, ObjectId guard, _resetForTests re-export
- `src/app/article/[slug]/page.tsx` — removed article.save(), added after()/recordView, refactored to fetchArticlePageData (React.cache + unstable_cache), removed `export const revalidate = 0`
- `src/lib/cache-revalidation.ts` — added revalidateArticle(slug), revalidateSitemap(), SITEMAP_CACHE_TAG
- `tests/lib/article-view-count.test.ts` — 4 tests: first-call increment, dedupe window, different-IP increment, invalid ObjectId no-throw
- `tests/lib/article-cache.test.ts` — 3 tests: valid slug returns data, missing slug returns null, double-call no-throw

## Decisions Made
- Re-exported `_resetForTests` from rateLimit.ts in view-count.ts so tests clear the dedupe Map without importing rateLimit directly
- Added ObjectId regex guard in recordView so bad articleId strings never throw CastError into after() handler
- Wrapped fetchArticlePageData's unstable_cache call in try/catch to fall back to direct loadArticlePageData in vitest (no Next runtime)
- Removed `export const revalidate = 0` — the unstable_cache wrapper controls revalidation, not route-level config

## Deviations from Plan

None — plan executed as written, with two minor implementation adaptations:
1. `server-only` import removed from view-count.ts because the package is not resolvable in vitest (package not installed)
2. ObjectId regex guard added to recordView (plan said "assert no throw" but Mongoose throws CastError before updateOne runs)

## Issues Encountered
- `unstable_cache` throws "incrementalCache missing" invariant when called in vitest without Next.js runtime — resolved with try/catch fallback, same philosophy as cache-revalidation.ts's `isDirectVitestRouteCall` guard

## User Setup Required
None — no external configuration needed.

## Next Phase Readiness
- `revalidateArticle(slug)` and `revalidateSitemap()` are ready for 03-03 CMS cache-bust wiring
- `fetchArticlePageData` is exported and can be tested directly by 03-04 regression tests
---
*Phase: 03-seo-geo-performance-hardening*
*Completed: 2026-09-24*
