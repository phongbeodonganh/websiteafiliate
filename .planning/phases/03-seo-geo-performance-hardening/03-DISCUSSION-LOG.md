# Phase 3: SEO/GEO & Performance Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 03-SEO/GEO & Performance Hardening
**Areas discussed:** View counting mechanism, Article page caching, Sitemap/robots caching, List API excerpts, Legacy redirect, Search URL noindex, Blacklist performance, NewsArticle JSON-LD, Affiliate click tracking, By-category excerpt scope

---

## View Counting Mechanism

### Q1: How should view counting work?

| Option | Description | Selected |
|--------|-------------|----------|
| after() + $inc (Recommended) | Use Next 16 `after()` to fire a fire-and-forget $inc after the response is sent. RSC stays read-only. | ✓ |
| Client beacon endpoint | Add a POST /api/v1/public/track-view endpoint. Decouples from RSC but adds network request, blocked by ad blockers. | |
| Within render but atomic $inc | Keep server-side in RSC but use atomic $inc instead of read-modify-write. Still costs a DB write per render. | |

**User's choice:** after() + $inc
**Notes:** Keeps RSC read-only; kills the lost-update race, F5 inflation, and per-render save cost simultaneously.

### Q2: How should repeat views be deduped?

| Option | Description | Selected |
|--------|-------------|----------|
| IP + article ID + window (Recommended) | In-memory Map, same pattern as Phase 1 click dedupe. Reset on restart, valid under single PM2 fork. | ✓ |
| Cookie-based dedupe | Short-lived cookie. Survives restarts but requires response header mutation in RSC. | |
| You decide | Lock the requirement, let planner pick. | |

**User's choice:** IP + article ID + window
**Notes:** Consistent with existing Phase 1 dedupe patterns.

### Q3: Should after() fire on ALL renders?

| Option | Description | Selected |
|--------|-------------|----------|
| All renders with dedupe guard (Recommended) | Dedupe Map catches metadata re-renders, prefetch, F5. Simple. | ✓ |
| Guard against metadata path only | Risky — Next.js doesn't expose render context reliably. | |

**User's choice:** All renders with dedupe guard
**Notes:** No special-case logic needed.

---

## Article Page Caching

### Q1: How should article pages be cached?

| Option | Description | Selected |
|--------|-------------|----------|
| unstable_cache per-slug tag (Recommended) | Wrap article fetch in unstable_cache with tag `article-${slug}` + 60s revalidate. CMS writes bust via revalidateTag. | ✓ |
| Single shared tag (public-articles) | Simpler but coarser — editing one article busts all article caches. | |
| You decide | Lock the requirement, let planner decide strategy. | |

**User's choice:** unstable_cache per-slug tag

### Q2: What revalidate window?

| Option | Description | Selected |
|--------|-------------|----------|
| 60s (match homepage) (Recommended) | Consistent across all public reads. | ✓ |
| 5-10 minutes | Reduces Atlas load further but less consistent. | |
| You decide | Let planner pick based on latency and traffic. | |

**User's choice:** 60s

### Q3: Should related articles be cached too?

| Option | Description | Selected |
|--------|-------------|----------|
| Cache related too (Recommended) | Avoids 2 extra Atlas queries per cached render. | ✓ |
| Only cache main article | Lighter queries, let them hit live. | |

**User's choice:** Cache related too

### Q4: Fix generateMetadata + page body dual query?

| Option | Description | Selected |
|--------|-------------|----------|
| React.cache() per-request dedupe (Recommended) | Dedupe within same request. Same result, no Atlas round trip. | ✓ |
| Let cache handle it naturally | Two cache hits, no Atlas round trip. Acceptable. | |

**User's choice:** React.cache() per-request dedupe

---

## Sitemap/Robots Caching

### Q1: How should sitemap.xml and robots.txt be cached?

| Option | Description | Selected |
|--------|-------------|----------|
| revalidate=3600 + tag bust on publish (Recommended) | Replace force-dynamic with revalidate=3600. CMS publish revalidateTag('sitemap'). | ✓ |
| unstable_cache for the query | Data-cache mechanism instead of route-level ISR. | |
| You decide | Lock requirement, let planner pick. | |

**User's choice:** revalidate=3600 + tag bust on publish

### Q2: What CMS actions should bust the sitemap cache?

| Option | Description | Selected |
|--------|-------------|----------|
| Article publish/unpublish only (Recommended) | Only publish state changes affect sitemap URL structure. | ✓ |
| Broad: any content change | More defensive but more cache invalidations. | |

**User's choice:** Article publish/unpublish only

---

## List API: Excerpt vs Full HTML

### Q1: How should list APIs return excerpts?

| Option | Description | Selected |
|--------|-------------|----------|
| Field projection + derived excerpt (Recommended) | select('-content') + fallback to first ~150 chars stripped. No schema change. | ✓ |
| New dedicated excerpt field | Structural, requires migration. | |
| Strip content, no excerpt replacement | List responses lose preview text. | |

**User's choice:** Field projection + derived excerpt

### Q2: Where should the excerpt-only projection apply?

| Option | Description | Selected |
|--------|-------------|----------|
| Both API route and homepage queries (Recommended) | Covers RSC feed + client-side search/pagination. | ✓ |
| API routes only | Keep homepage full content for Phase 4. | |

**User's choice:** Both API route and homepage queries

### Q3: Add HTTP cache headers on list APIs?

| Option | Description | Selected |
|--------|-------------|----------|
| Add Cache-Control headers (Recommended) | s-maxage=60, stale-while-revalidate=300. CDN/Nginx can cache. | ✓ |
| unstable_cache the query | Same mechanism as homepage. | |
| Skip — focus on excerpt first | Defer caching to later. | |

**User's choice:** Add Cache-Control headers

---

## Legacy Redirect: 308 Permanent?

| Option | Description | Selected |
|--------|-------------|----------|
| Change to permanentRedirect (308) (Recommended) | Permanent redirect, transfer SEO ranking. | ✓ |
| Keep 307 — already spec-compliant | Minimally invasive. | |

**User's choice:** Change to permanentRedirect (308)

---

## Search URL Noindex Fix

### Q1: How should /?q= search URLs be noindexed?

| Option | Description | Selected |
|--------|-------------|----------|
| generateMetadata with q detection (Recommended) | Server-side metadata, match old SEO-05 fix. | ✓ |
| Client-side meta tag injection | Works but less clean. | |

**User's choice:** generateMetadata with q detection

### Q2: noindex, follow or noindex, nofollow?

| Option | Description | Selected |
|--------|-------------|----------|
| noindex, follow (Recommended) | Crawlers can still discover links. Standard pattern. | ✓ |
| noindex, nofollow | Blocks crawling entirely. | |

**User's choice:** noindex, follow

---

## Blacklist Check Performance

### Q1: Fix blacklist linear scan?

| Option | Description | Selected |
|--------|-------------|----------|
| Index + query by hostname (Recommended) | Add extracted_domain index, query by hostname. Structural fix. | ✓ |
| In-memory cache of blacklist | Avoids Mongo queries but couples to memory. | |
| Defer — not a problem at current scale | ~300 entries, linear scan negligible. | |

**User's choice:** Index + query by hostname

### Q2: Wildcard domain matching with indexed lookup?

| Option | Description | Selected |
|--------|-------------|----------|
| Root-domain lookup + JS suffix (Recommended) | Query by root domain, JS suffix check on 0-1 results. | ✓ |
| Exact hostname match only | Loses '*' wildcard blocking. | |

**User's choice:** Root-domain lookup + JS suffix

---

## NewsArticle JSON-LD Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Verification + regression test (Recommended) | JSON-LD already renders. Add test asserting structure + canonical. | ✓ |
| Build NewsArticle JSON-LD | Might be missing/incomplete. Build from scratch. | |

**User's choice:** Verification + regression test
**Notes:** Confirmed code exists at `src/app/article/[slug]/page.tsx:153-161` with correct fields.

---

## Affiliate Click Tracking (AFF-02) Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Verification + regression test (Recommended) | Phase 1 built rate limiting + dedupe. Add regression test for full pipeline. | ✓ |
| Known gaps to fix | Specify what's missing. | |

**User's choice:** Verification + regression test

---

## By-Category Route Excerpt Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All public list endpoints (Recommended) | Consistent — no list endpoint leaks full content HTML. | ✓ |
| Main list + homepage only | Leave by-category and top-picks for later. | |

**User's choice:** All public list endpoints

---

## the agent's Discretion

- Exact dedupe window size for view counting (suggested 60s)
- Cache wrapper function structure (follow homepage precedent)
- React.cache + unstable_cache layering details
- revalidateTag('sitemap') wiring approach in cache-revalidation.ts
- Fallback excerpt derivation specifics
- Blacklist hostname extraction approach details

## Deferred Ideas

- Full ISR/SSG migration or `use cache` directive — backlog item
- Redis-backed caching layer — revisit at multi-instance scaling
- Error/uptime monitoring — OPS-02, Phase 5
- Deploy health check + rollback — OPS-01, Phase 5
- Public presentation / Bento redesign — PUB-02, Phase 4
