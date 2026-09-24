---
phase: 03-seo-geo-performance-hardening
plan: 02
subsystem: infra, seo
tags: [next.js, permanent-redirect, noindex, isr, cache-control, sitemap, robots]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: ArticleModel, CategoryModel, SettingModel, escapeRegExp
provides:
  - 308 permanent redirect from /bai-viet/[slug] to /article/[slug]
  - noindex metadata for /?q= search URLs
  - ISR sitemap (3600s revalidate) replacing force-dynamic
  - ISR robots.txt (3600s revalidate)
  - List API responses without full HTML content + excerpt fallback
  - Cache-Control headers on 3 public API endpoints
affects: [03-03 (revalidateSitemap wiring), 03-04 (regression tests)]

actuals:
  tokens: 18000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "permanentRedirect for legacy URL migration (308, not 307)"
    - "generateMetadata conditional robots for search URL noindex"
    - "ISR revalidate replacing force-dynamic for DB-backed metadata routes"
    - "Content exclusion from list API with excerpt fallback (D-10)"
    - "Cache-Control: public, s-maxage=60, stale-while-revalidate=300 on public GETs (D-11)"

key-files:
  created:
    - tests/api/legacy-redirect.test.ts
    - tests/lib/search-noindex.test.ts
    - tests/lib/sitemap-cache.test.ts
    - tests/api/list-excerpts.test.ts
    - tests/__server-only-stub.ts
  modified:
    - src/app/bai-viet/[slug]/page.tsx
    - src/app/page.tsx
    - src/app/sitemap.ts
    - src/app/robots.ts
    - src/app/api/v1/public/articles/route.ts
    - src/app/api/v1/public/articles/by-category/route.ts
    - src/app/api/v1/public/top-picks/route.ts
    - src/lib/homepage-articles.ts
    - vitest.config.mts

key-decisions:
  - "server-only stub added to vitest.config.mts — the package isn't installed standalone; alias resolves to an empty module for test-only"
  - "List API excerpt fallback: stripHTML(content).substring(0,150) + '...' when excerpt field is empty (D-10)"
  - "by-category uses select('-content') since no $or content filter; main articles route keeps content in query (for $or search) but strips from response mapping"
  - "Homepage findArticles keeps content in query (search filter) but removes from HomepageArticle result mapping"

patterns-established:
  - "D-10 excerpt fallback rule: strip HTML at projection time, don't add schema fields"
  - "D-11 Cache-Control pattern for public GET APIs"

requirements-completed: [SEO-01, SEO-03, PERF-01]

coverage:
  - id: D1
    description: "Legacy /bai-viet/[slug] issues 308 permanent redirect to /article/[slug]"
    requirement: SEO-01
    verification:
      - kind: unit
        ref: tests/api/legacy-redirect.test.ts#permanently redirects to /article/[slug]
        status: pass
      - kind: unit
        ref: tests/api/legacy-redirect.test.ts#targets the correct /article/ path
        status: pass
    human_judgment: false
  - id: D2
    description: "Search URLs /?q= produce noindex metadata; empty/missing/whitespace q is indexable"
    requirement: SEO-03
    verification:
      - kind: unit
        ref: tests/lib/search-noindex.test.ts#returns noindex metadata when q is a non-empty string
        status: pass
      - kind: unit
        ref: tests/lib/search-noindex.test.ts#returns normal indexable metadata when q is empty
        status: pass
      - kind: unit
        ref: tests/lib/search-noindex.test.ts#returns normal indexable metadata when q is whitespace-only
        status: pass
    human_judgment: false
  - id: D3
    description: "Sitemap/robots use ISR revalidate=3600 instead of force-dynamic"
    requirement: SEO-03
    verification:
      - kind: unit
        ref: tests/lib/sitemap-cache.test.ts#includes only published articles in the sitemap
        status: pass
    human_judgment: false
  - id: D4
    description: "List API responses exclude content field and derive excerpt fallback from stripped HTML"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: tests/api/list-excerpts.test.ts#excludes the content field from response data and uses seeded excerpt
        status: pass
      - kind: unit
        ref: tests/api/list-excerpts.test.ts#derives excerpt from stripped content when excerpt is empty
        status: pass
      - kind: unit
        ref: tests/api/list-excerpts.test.ts#sets Cache-Control header to public s-maxage (not no-store)
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-24
status: complete
---

# Phase 3 Plan 02: Crawl Hygiene + List API Performance Summary

**308 legacy redirect, search URL noindex, ISR sitemap/robots, and content-free list API with excerpt fallback + Cache-Control headers**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 8 source + vitest config
- **Files created:** 4 test files + 1 stub

## Accomplishments
- Legacy `/bai-viet/[slug]` now issues 308 permanent redirect (was 307 transient)
- Search URLs `/?q=` produce noindex metadata; normal homepage stays fully indexable
- Sitemap and robots switched from `force-dynamic` to ISR `revalidate=3600` (one Atlas query per hour max per crawler burst)
- Public list API responses exclude full HTML content with derived excerpt fallback for empty excerpts
- Cache-Control: `public, s-maxage=60, stale-while-revalidate=300` on 3 public API endpoints (was `no-store` on articles route)

## Task Commits

1. **Tasks 1-3 combined** — `deb7f1f` (feat) — all 3 tasks in one commit since all are crawl/perf hygiene with shared test run

## Files Created/Modified
- `src/app/bai-viet/[slug]/page.tsx` — redirect → permanentRedirect (D-12)
- `src/app/page.tsx` — static metadata → generateMetadata with conditional noindex (D-13)
- `src/app/sitemap.ts` — force-dynamic → revalidate=3600 (D-08)
- `src/app/robots.ts` — force-dynamic → revalidate=3600 (D-08)
- `src/app/api/v1/public/articles/route.ts` — content stripped, excerpt fallback, Cache-Control fixed (D-10, D-11)
- `src/app/api/v1/public/articles/by-category/route.ts` — select('-content'), Cache-Control added (D-10, D-11)
- `src/app/api/v1/public/top-picks/route.ts` — Cache-Control added (D-11)
- `src/lib/homepage-articles.ts` — content stripped from HomepageArticle, excerpt fallback (D-10)

## Decisions Made
- Added server-only stub in vitest.config.mts since the package is not installed standalone
- List API excerpt fallback uses stripHTML.substring(0,150)+'...' inline in the mapping (no schema field)
- by-category uses select('-content') since it has no $or content filter; main articles route keeps content in query

## Deviations from Plan
None — plan executed as written.

## Issues Encountered
- `server-only` package not installed — resolved with vitest alias to empty stub module

## User Setup Required
None.

## Next Phase Readiness
- sitemap/robots revalidate=3600 ready for 03-03 revalidateSitemap() bust wiring
- Cache-Control headers ready for Nginx/CDN integration
---
*Phase: 03-seo-geo-performance-hardening*
*Completed: 2026-09-24*
