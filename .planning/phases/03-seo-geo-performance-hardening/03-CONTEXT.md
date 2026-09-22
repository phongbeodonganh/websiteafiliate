# Phase 3: SEO/GEO & Performance Hardening - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the public site meet the V5.2 SEO contract and standing performance NFRs: accurate view counts that can be trusted for commission decisions, cached reads that survive ad-traffic and crawler bursts, crawl-clean URLs, verified structured data and affiliate tracking pipeline. Requirements in scope: SEO-01, SEO-02, SEO-03, PERF-01, PERF-02, AFF-02 (per ROADMAP Phase 3). This phase fixes performance bottlenecks and SEO gaps in an already-deployed system — it does not redesign the public frontend (that is Phase 4) or refactor the admin monolith (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### View Counting (PERF-02)
- **D-01:** Move view counting out of the RSC render entirely. Use Next 16 `after()` to fire a fire-and-forget `ArticleModel.updateOne({ _id }, { $inc: { view_count: 1 } })` after the response is sent. The RSC article page (`src/app/article/[slug]/page.tsx`) stays read-only — no DB writes during render. This kills three birds: lost-update race (atomic `$inc`), F5 inflation (dedupe prevents it), and the per-render save cost.
- **D-02:** Dedupe by IP + article ID + time window using an in-memory Map (same pattern as the Phase 1 click dedupe in `src/lib/rateLimit.ts`). Key: `${ip}:${articleId}`, value: timestamp. If the same IP views the same article within the dedupe window, the `$inc` is skipped. Resets on server restart — valid under single PM2 fork constraint. — **Reversibility:** reversible — the in-memory Map is a runtime optimization, not a schema change.
- **D-03:** `after()` fires on ALL renders (page body and metadata). The IP+article dedupe Map catches redundant renders (metadata re-renders, prefetch, F5) within the window. No special-case logic for render context detection.

### Article Page Caching (PERF-01)
- **D-04:** Wrap article fetch logic in `unstable_cache` with a per-slug tag (`article-${slug}`) and 60s revalidate. Same pattern as homepage's `unstable_cache` in `src/lib/homepage-articles.ts:87-91`. CMS article writes already call `revalidatePublicArticles()` — extend them to also call `revalidateTag('article-' + slug)` so editing an article instantly busts its cache while leaving other articles cached. — **Reversibility:** reversible — removing the cache wrapper returns to dynamic rendering.
- **D-05:** 60s revalidate window to match the homepage. Success criterion #3 requires "within the revalidation window" — 60s is consistent across all public reads.
- **D-06:** Cache the related/latest article queries alongside the main article fetch. These 2 extra Atlas queries per page view should be cached too (they're lighter but still round trips). Use the same `article-${slug}` tag so they bust together.
- **D-07:** Use `React.cache()` to dedupe the article fetch within a single request — both `generateMetadata` and the page body call the same fetch function, `React.cache()` ensures it runs once per request rather than twice (CONCERNS perf #1 dual-query fix).

### Sitemap/Robots Caching (SEO-03, PERF-01)
- **D-08:** Replace `force-dynamic` with `export const revalidate = 3600` on both `src/app/sitemap.ts` and `src/app/robots.ts`. Crawlers hitting `/sitemap.xml` every minute will now serve from ISR cache; only one Atlas query per hour. — **Reversibility:** reversible — switch back to `force-dynamic` if ISR causes stale-sitemap issues.
- **D-09:** CMS article publish/unpublish calls `revalidateTag('sitemap')` to bust the sitemap ISR cache on content changes. Only article publish/unpublish triggers this (category/taxonomy changes don't affect sitemap URL structure). Add alongside existing `revalidatePublicArticles()` calls in CMS write paths. — **Reversibility:** reversible — extra cache bust is over-conservative, not destructive.

### List API Excerpts (PERF-01)
- **D-10:** Use Mongoose field projection (`select('-content')`) on ALL public list-mode article queries to strip full HTML. This covers: `GET /api/v1/public/articles`, `GET /api/v1/public/articles/by-category`, `GET /api/v1/public/top-picks`, and the homepage `getHomepageArticles()` cached queries. When `excerpt` field is empty, derive a fallback (first ~150 chars of stripped content) — but do this at projection time, not by adding a schema field. — **Reversibility:** reversible — removing the projection restores full content in responses.
- **D-11:** Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` HTTP headers on public list GET responses. Enables Nginx/CDN to serve cached list pages. Short TTL so new articles appear quickly.

### Crawl Hygiene (SEO-01, SEO-03)
- **D-12:** Change the legacy `/bai-viet/[slug]` redirect from `redirect()` (307 temporary) to `permanentRedirect()` (308 permanent). CONCERNS bug #4 flags the temporary redirect as losing SEO signal. A permanent redirect tells crawlers to transfer ranking to `/article/[slug]`. — **Reversibility:** one-way — search engines cache 308s; reverting to 307 after indexing the 308 requires waiting for re-crawl.
- **D-13:** Fix the `/?q=` search URL noindex regression (CONCERNS bug #2). Switch `src/app/page.tsx` from static `createPageMetadata` to `generateMetadata({ searchParams })`: when `q` is present, set `robots: { index: false, follow: true }` and a clean canonical `/`. Re-implements the lost SEO-05 fix on the correct route.

### Structured Data & Tracking Verification (SEO-02, AFF-02)
- **D-14:** NewsArticle JSON-LD is already rendered in `src/app/article/[slug]/page.tsx:153-161` with headline, image, datePublished, author, publisher from settings, and canonical URL. Phase 3 adds a regression test asserting the JSON-LD structure and canonical exactly matches `https://aidealsuk.com/article/[slug]` (D-003). Pure verification — no code change to the JSON-LD builder.
- **D-15:** AFF-02 affiliate click tracking pipeline is already built (Phase 1 rate-limited + IP-deduped the endpoints). Phase 3 adds a regression test asserting: ClickLog has IP/UA/time/article context, 302 redirect to `base_url` with `sub_id` appended, rendered CTAs carry `rel="nofollow sponsored" target="_blank"`. Pure verification.

### Blacklist Check Optimization (PERF-01 supporting)
- **D-16:** Add an index on `extracted_domain` in `BlacklistModel` (`src/lib/db/models.ts`). Change `checkUrlAgainstBlacklist()` (`src/lib/blacklist.ts`) from "load all + loop in JS" to querying by root domain: `BlacklistModel.findOne({ extracted_domain: rootDomain, status: 'active' })`. Wildcard subdomain matching stays in JS (suffix check on the 0-1 result docs). Fixes CONCERNS perf #4 structurally. — **Reversibility:** reversible — the index is additive; the query rewrite is a code change.

### the agent's Discretion
- Exact dedupe window size for view counting (suggested: 60s matching the Phase 1 click dedupe window, but the planner can tune based on success criterion #1 testing).
- Exact structure of the per-slug cache wrapper function (follow the `unstable_cache` precedent in `src/lib/homepage-articles.ts`).
- Whether the `React.cache()` wrapper and `unstable_cache` wrapper share the same fetch function or are layered separately.
- How `revalidateTag('sitemap')` is wired into the CMS write path (new helper in `src/lib/cache-revalidation.ts` vs extending existing functions).
- Exact fallback excerpt derivation (first-N chars of stripped content vs existing `excerpt` field check).
- Exact blacklist hostname extraction approach (reuse `extractDomainFromUrl` from `src/lib/blacklist.ts` as-is vs. adding a root-domain variant).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Governing spec (V5.2)
- `specv2.md` §2.1 — article URL structure `/article/[slug]`, legacy redirect behavior
- `specv2.md` §2.2 — structured data (NewsArticle JSON-LD), canonical URL contract, publisher fields from settings
- `specv2.md` §1.3 — `view_count` field behavior, article list behavior

### Project contracts
- `.planning/PROJECT.md` — Target Runtime (Next.js 16, Turbopack, PM2 fork constraints); Constraints (esp. #2 Next.js 16 contract, #3 single-process assumption, #4 dynamic-rendering lock-in via `headers()`); D-003 aidealsuk.com brand overrides spec branding for canonical
- `.planning/REQUIREMENTS.md` — SEO-01..03, PERF-01/02, AFF-02 definitions + statuses
- `.planning/ROADMAP.md` — Phase 3 goal + 5 success criteria

### Performance / SEO audit sources
- `.planning/codebase/CONCERNS.md` — Performance Bottlenecks #1–4, Known Bugs #2/#4 (SEO), with exact file:line references
- `GO_LIVE_TASKLIST.md` — BUG-02 (view_count spam), SEO-01/02/05 (crawl hygiene, sitemap), TECH-02 (caching gaps)

### Framework contract (breaking changes — NOT training-data Next.js)
- `AGENTS.md` — read bundled Next docs before writing code; `proxy.ts` replaces `middleware.ts`; `params`/`searchParams` are Promises
- `node_modules/next/dist/docs/` — authoritative Next.js 16.2.12 API docs (esp. `after()` for fire-and-forget view counting, `unstable_cache` for caching, `permanentRedirect()` for legacy redirect, `React.cache` for per-request dedupe)

### Existing map docs (evidence base)
- `.planning/codebase/ARCHITECTURE.md` — "Primary Read Path" (article page DB hit per view), "Homepage Path" (cache pattern), "Anti-Patterns" (DB writes during RSC render), cache tag + revalidation helper reference
- `.planning/codebase/STACK.md` — Next.js 16.2.12 specifics, `unstable_cache` stability note, environment handling

### Phase 1 locked decisions (carry forward)
- `.planning/phases/01-security-remediation/01-CONTEXT.md` — D-12/D-13 (rate limiting + click dedupe on public write endpoints), D-14 (IP trust last-hop XFF + Nginx overwrite)

### Phase 2 locked decisions (carry forward)
- `.planning/phases/02-cms-end-to-end-v5-2/02-CONTEXT.md` — D-15 (async getAuthUser locks inactive users), `revalidatePublicArticles()` wired into CMS writes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/homepage-articles.ts:87-91` — working `unstable_cache` pattern with tag `public-articles` + 60s revalidate. Template for article-page caching.
- `src/lib/cache-revalidation.ts` — `PUBLIC_ARTICLES_CACHE_TAG` / `revalidatePublicArticles()`. Extend with per-slug tag busting and sitemap tag.
- `src/lib/rateLimit.ts` — per-IP sliding-window limiter (in-memory Map). Template for view-count dedupe Map.
- `src/lib/blacklist.ts` — `extractDomainFromUrl()` + `checkUrlAgainstBlacklist()`. Rewrite the lookup; reuse the domain extraction.
- `src/lib/utils.ts` — `getClientIp()` (last-hop XFF), `appendSubId()`, `escapeRegExp()`. All established from Phase 1.
- `src/lib/seo.ts` — `normalizeSiteUrl()`, `createPageMetadata()`. `generateMetadata` for homepage will use these.
- `src/app/sitemap.ts` / `src/app/robots.ts` — both `force-dynamic`, both query Atlas per request. Add `revalidate = 3600`.
- `src/app/bai-viet/[slug]/page.tsx:9` — uses `redirect()` (307), swap to `permanentRedirect()` (308).
- `tests/` Vitest + `mongodb-memory-server` suite — extend with regression tests for JSON-LD, click tracking, sitemap shape.

### Established Patterns
- `unstable_cache` + tag-based revalidation: homepage already proves this works (60s revalidate + CMS bust)
- `revalidateTag(tag, 'max')` — the two-argument Next 16 form is already used in `src/lib/cache-revalidation.ts:15`
- Route handler response envelope `{ status: 'success'|'error', data?, message? }`
- snake_case DB fields → camelCase API mapping in handlers
- CMS writers call `revalidatePublicArticles()` from `src/lib/cache-revalidation.ts` after mutating published articles

### Integration Points
- `src/app/article/[slug]/page.tsx` — primary target: remove inline view_count write (line 80-81), wrap fetch in unstable_cache + React.cache, fire after() for view counting
- `src/app/page.tsx` — switch from `createPageMetadata` to `generateMetadata({ searchParams })` for `?q=` noindex
- `src/app/sitemap.ts` + `src/app/robots.ts` — swap `force-dynamic` to `revalidate = 3600`
- `src/app/bai-viet/[slug]/page.tsx` — swap `redirect()` to `permanentRedirect()`
- `src/app/api/v1/public/articles/route.ts` — add `select('-content')` + Cache-Control headers
- `src/app/api/v1/public/articles/by-category/route.ts` — same projection
- `src/lib/blacklist.ts` — rewrite `checkUrlAgainstBlacklist()` to query by domain instead of scan-all
- `src/lib/db/models.ts` — add `extracted_domain` index on BlacklistModel
- `src/lib/cache-revalidation.ts` — extend with per-slug and sitemap tag busting

</code_context>

<specifics>
## Specific Ideas

No particular "I want it like X" references. Notable user emphasis: keep the caching pattern consistent with the proven homepage approach (60s revalidate + unstable_cache + tag busting); make view counting completely non-blocking to the RSC render; fix the two SEO regressions that were lost (legacy redirect + search noindex); verify existing structured data and tracking pipeline with regression tests rather than rebuilding.

</specifics>

<deferred>
## Deferred Ideas

- Full ISR/SSG migration or `use cache` directive — the `unstable_cache` approach works well in Next 16 and the docs note it's not deprecated. Modernization to Cache Components is a backlog item, not this phase.
- Redis-backed caching layer — single PM2 fork makes in-memory Map valid; revisit only at multi-instance scaling.
- Error/uptime monitoring — OPS-02, Phase 5.
- Deploy health check + rollback — OPS-01, Phase 5.
- Public presentation / Bento redesign — PUB-02, Phase 4.

</deferred>

---

*Phase: 3-SEO/GEO & Performance Hardening*
*Context gathered: 2026-09-22*
