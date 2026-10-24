---
phase: 03-seo-geo-performance-hardening
plan: 03
subsystem: infra, seo, perf
tags: [cache-busting, revalidation, blacklist, indexed-query, cms]

requires:
  - phase: 03-seo-geo-performance-hardening
    provides: revalidateArticle, revalidateSitemap (Plan 01), ISR sitemap/robots (Plan 02)
provides:
  - CMS article create/update/delete calls revalidateArticle(slug) + revalidateSitemap()
  - checkUrlAgainstBlacklist queries by extracted_domain $in [hostname, rootDomain] instead of full-scan
  - Compound index { extracted_domain: 1, status: 1 } on BlacklistSchema
affects: [03-04 (regression tests)]

actuals:
  tokens: 22000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Per-slug cache tag bust on CMS write paths (D-04) using revalidateArticle(slug)"
    - "Sitemap cache tag bust on publish/delete (D-09) using revalidateSitemap()"
    - "Indexed domain query with $in: [hostname, rootDomain] replacing scan-all find (D-16)"
    - "Compound index { extracted_domain: 1, status: 1 } for the blacklist query pattern"

key-files:
  created:
    - tests/lib/cms-cache-bust.test.ts
    - tests/lib/blacklist-domain-query.test.ts
  modified:
    - src/app/api/v1/cms/articles/route.ts
    - src/app/api/v1/cms/articles/[id]/route.ts
    - src/lib/blacklist.ts
    - src/lib/db/models.ts

key-decisions:
  - "revalidateSitemap called unconditionally on PUT — over-conservative per CONTEXT decision (extra bust is not destructive)"
  - "revalidateArticle uses slug variable already in scope — finalSlug on POST, existingArticle.slug on PUT"
  - "Blacklist query uses .lean() to skip Mongoose hydration overhead on read-only candidates"
  - "Suffix wildcard matching stays in JS on the 0-2 candidate results — no change to match logic"
  - "Source-grep test assertion checks for presence of $in pattern, not absence of scan-all (other functions legitimately use find({ status: 'active' }))"

patterns-established:
  - "D-04: CMS write paths must call revalidateArticle(slug) after save"
  - "D-09: CMS publish/delete must call revalidateSitemap()"
  - "D-16: Blacklist queries use indexed domain field, not full-scan"

requirements-completed: [PERF-01]

coverage:
  - id: D-04
    description: "CMS article create/update calls revalidateArticle(slug)"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: tests/lib/cms-cache-bust.test.ts
        status: pass
  - id: D-09
    description: "CMS article publish/delete calls revalidateSitemap()"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: tests/lib/cms-cache-bust.test.ts
        status: pass
  - id: D-16
    description: "checkUrlAgainstBlacklist queries by extracted_domain $in instead of full-scan"
    requirement: PERF-01
    verification:
      - kind: unit
        ref: tests/lib/blacklist-domain-query.test.ts
        status: pass

duration: 15min
completed: 2026-09-27
status: complete
---

# Phase 3 Plan 03: CMS Cache Bust Wiring + Blacklist Indexed Query Summary

**Per-slug + sitemap cache invalidation on CMS writes, and O(1) indexed blacklist domain query replacing O(n) full-scan**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 4 source files
- **Files created:** 2 test files
- **Tests:** 12 new tests passing, 10 existing tests still passing, tsc clean

## Accomplishments
- CMS POST (create article) now calls `revalidateArticle(finalSlug)` + `revalidateSitemap()` (on publish)
- CMS PUT (update article) now calls `revalidateArticle(existingArticle.slug)` + `revalidateSitemap()`
- CMS DELETE now calls `revalidateSitemap()` alongside existing `revalidatePublicArticles()`
- `checkUrlAgainstBlacklist` queries `BlacklistModel.find({ extracted_domain: { $in: [hostname, rootDomain] }, status: 'active' })` — typically 0-2 docs instead of 300+
- Compound index `{ extracted_domain: 1, status: 1 }` added to BlacklistSchema for the query pattern
- Wildcard subdomain matching still works on the domain-filtered result set

## Task Commits

1. **Tasks 1-2 combined** — `d26677d` (feat) — CMS cache bust wiring + blacklist indexed query optimization in one commit

## Files Created/Modified
- `src/app/api/v1/cms/articles/route.ts` — added revalidateArticle + revalidateSitemap imports and calls
- `src/app/api/v1/cms/articles/[id]/route.ts` — same wiring for PUT and DELETE paths
- `src/lib/blacklist.ts` — checkUrlAgainstBlacklist queries by extracted_domain $in + .lean()
- `src/lib/db/models.ts` — compound index { extracted_domain: 1, status: 1 } on BlacklistSchema
- `tests/lib/cms-cache-bust.test.ts` — 6 source-grep + guard tests
- `tests/lib/blacklist-domain-query.test.ts` — 5 functional + 1 source-grep test

## Decisions Made
- revalidateSitemap unconditional on PUT (over-conservative, not destructive per CONTEXT.md)
- Source-grep assertion checks for presence of $in pattern (other functions legitimately use find({ status: 'active' }))

## Deviations from Plan
None — plan executed as written.

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- CMS cache bust wiring complete — Articles updated via CMS now reflect immediately on public pages
- Blacklist check is index-backed — ready for production traffic
---
*Phase: 03-seo-geo-performance-hardening*
*Completed: 2026-09-27*
