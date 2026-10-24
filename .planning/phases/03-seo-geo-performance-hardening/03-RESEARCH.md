# Phase 3: SEO/GEO & Performance Hardening — Research

**Researched:** 2026-09-23
**Domain:** SEO, performance optimization, caching, structured data verification
**Confidence:** HIGH

## Summary

Phase 3 closes the V5.2 SEO contract and performance NFRs that are gap or partial: accurate view counting (PERF-02), cached public reads (PERF-01), crawl-clean URLs (SEO-01/SEO-03), verified structured data (SEO-02), and affiliate tracking pipeline verification (AFF-02). The work is predominantly brownfield — every change is a targeted modification to existing code, guided by decisions in CONTEXT.md and the known gaps documented in CONCERNS.md.

The two highest-impact changes are: (1) moving view counting out of the RSC render into a fire-and-forget `after()` callback with an in-memory IP+article dedupe Map, which fixes both lost-update races (atomic `$inc`) and F5 inflation; and (2) wrapping the article fetch in `unstable_cache` + `React.cache()` so repeated article page requests (crawlers, ad traffic) don't each hit Atlas with 6+ queries. The phase also fixes two SEO regressions (legacy redirect is 307 → 308, `?q=` search URLs need noindex metadata) and wires up regression tests for JSON-LD, sitemap shape, and tracking verification — all pure assertions, no production code changes.

**Primary recommendation:** Follow the locked decisions from CONTEXT.md exactly — they are the result of a thorough discuss phase and map directly to the 5 success criteria. The `unstable_cache` + `after()` + `React.cache()` trifecta for article pages is the core architectural change; everything else is configuration, projection, or test assertion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### View Counting (PERF-02)
- **D-01:** Move view counting out of the RSC render entirely. Use Next 16 `after()` to fire a fire-and-forget `ArticleModel.updateOne({ _id }, { $inc: { view_count: 1 } })` after the response is sent. The RSC article page (`src/app/article/[slug]/page.tsx`) stays read-only — no DB writes during render.
- **D-02:** Dedupe by IP + article ID + time window using an in-memory Map (same pattern as the Phase 1 click dedupe in `src/lib/rateLimit.ts`). Key: `${ip}:${articleId}`, value: timestamp. If the same IP views the same article within the dedupe window, the `$inc` is skipped. Resets on server restart — valid under single PM2 fork constraint. **Reversible** — the in-memory Map is a runtime optimization, not a schema change.
- **D-03:** `after()` fires on ALL renders (page body and metadata). The IP+article dedupe Map catches redundant renders (metadata re-renders, prefetch, F5) within the window.

#### Article Page Caching (PERF-01)
- **D-04:** Wrap article fetch logic in `unstable_cache` with a per-slug tag (`article-${slug}`) and 60s revalidate. Same pattern as homepage's `unstable_cache` in `src/lib/homepage-articles.ts:87-91`. CMS article writes already call `revalidatePublicArticles()` — extend them to also call `revalidateTag('article-' + slug, 'max')`. **Reversible** — removing the cache wrapper returns to dynamic rendering.
- **D-05:** 60s revalidate window to match the homepage.
- **D-06:** Cache the related/latest article queries alongside the main article fetch using the same `article-${slug}` tag.
- **D-07:** Use `React.cache()` to dedupe the article fetch within a single request — both `generateMetadata` and the page body call the same fetch function, `React.cache()` ensures it runs once per request rather than twice.

#### Sitemap/Robots Caching (SEO-03, PERF-01)
- **D-08:** Replace `force-dynamic` with `export const revalidate = 3600` on both `src/app/sitemap.ts` and `src/app/robots.ts`. **Reversible** — switch back if ISR causes issues.
- **D-09:** CMS article publish/unpublish calls `revalidateTag('sitemap', 'max')` to bust the sitemap ISR cache on content changes.

#### List API Excerpts (PERF-01)
- **D-10:** Use Mongoose field projection (`select('-content')`) on ALL public list-mode article queries. When `excerpt` field is empty, derive a fallback (first ~150 chars of stripped content) — at projection time, not by adding a schema field. **Reversible**.
- **D-11:** Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` HTTP headers on public list GET responses.

#### Crawl Hygiene (SEO-01, SEO-03)
- **D-12:** Change legacy `/bai-viet/[slug]` redirect from `redirect()` (307) to `permanentRedirect()` (308). **One-way** — test thoroughly before deploying.
- **D-13:** Fix `/?q=` search URL noindex regression. Switch `src/app/page.tsx` from static `createPageMetadata` to `generateMetadata({ searchParams })`: when `q` is present, set `robots: { index: false, follow: true }` and a clean canonical `/`.

#### Structured Data & Tracking Verification (SEO-02, AFF-02)
- **D-14:** NewsArticle JSON-LD regression test asserting structure matches exact canonical `https://aidealsuk.com/article/[slug]`. Pure verification — no code change.
- **D-15:** AFF-02 affiliate click tracking regression test asserting ClickLog has IP/UA/time/article context, 302 redirect to `base_url` with `sub_id` appended, rendered CTAs carry `rel="nofollow sponsored" target="_blank"`. Pure verification.

#### Blacklist Check Optimization (PERF-01 supporting)
- **D-16:** Add an index on `extracted_domain` in `BlacklistModel`. Change `checkUrlAgainstBlacklist()` from "load all + loop in JS" to querying by root domain. **Reversible**.

### the agent's Discretion
- Exact dedupe window size for view counting (suggested: 60s matching Phase 1 click dedupe window).
- Exact structure of the per-slug cache wrapper function (follow `unstable_cache` precedent in `src/lib/homepage-articles.ts`).
- Whether `React.cache()` wrapper and `unstable_cache` wrapper share the same fetch function or are layered separately.
- How `revalidateTag('sitemap', 'max')` is wired into the CMS write path.
- Exact fallback excerpt derivation (first-N chars of stripped content vs existing `excerpt` field check).
- Exact blacklist hostname extraction approach.

### Deferred Ideas (OUT OF SCOPE)
- Full ISR/SSG migration or `use cache` directive.
- Redis-backed caching layer.
- Error/uptime monitoring (Phase 5).
- Deploy health check + rollback (Phase 5).
- Public presentation / Bento redesign (Phase 4).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEO-01 | URL structure & legacy redirects: `/article/[slug]` path; `/bai-viet/[slug]` redirects with permanent HTTP status | D-12: `permanentRedirect()` issues 308 (Permanent), telling search engines to transfer ranking signals. [CITED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md:11`] |
| SEO-02 | Structured data: article pages auto-embed NewsArticle JSON-LD with exact canonical URL | D-14: JSON-LD at `page.tsx:153-161` already renders correct structure. Phase adds regression test only. |
| SEO-03 | Crawl hygiene: DB-driven sitemap.xml, robots.txt disallowing `/admin`/`/api`, `/?q=` noindex with clean canonical | D-08/D-09: ISR caching (3600s) for sitemap/robots; D-13: `generateMetadata` with conditional `robots: { index: false }` when `q` present |
| PERF-01 | Cached public reads: article pages cached via `unstable_cache`, sitemap/robots via ISR revalidate, list APIs return excerpts | D-04/D-05/D-06: `unstable_cache` with per-slug tag + 60s revalidate; D-08: `revalidate = 3600`; D-10: `select('-content')`; D-11: Cache-Control headers |
| PERF-02 | Accurate view counting: atomic `$inc` + dedupe window, RSC render stays read-only | D-01/D-02/D-03: `after()` + `$inc` + in-memory IP+article dedupe Map |
| AFF-02 | Click tracking pipeline verification: ClickLog context, 302 redirect with `sub_id`, CTA `rel` attributes | D-15: Regression test only — pipeline already built in Phase 1 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| View counting | API / Backend | — | `after()` fires a `$inc` DB write post-response; no browser logic needed |
| Article page caching | API / Backend | — | `unstable_cache` + `React.cache()` are server-side RSC optimizations |
| Sitemap/robots caching | API / Backend | — | `revalidate` route config on server-side sitemap/robots generators |
| Legacy URL redirect | API / Backend | — | `permanentRedirect()` on the server-side `bai-viet/[slug]` page |
| Search noindex metadata | Frontend Server (SSR) | — | `generateMetadata({ searchParams })` in `page.tsx` — server-rendered metadata |
| List API excerpt projection | API / Backend | — | Mongoose `select()` on route handlers |
| Blacklist optimization | API / Backend | Database / Storage | Index creation + query rewrite; data layer change |
| Regression tests | Database / Storage | — | Vitest + mongodb-memory-server test suite |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.12 | Framework — `after()`, `unstable_cache`, `permanentRedirect` | Already the project framework. `after()` is stable since v15.1.0. `unstable_cache` replaced by `use cache` directive in Next 16 but still works and is used by the existing homepage pattern. |
| MongoDB / Mongoose | 9.9.1 / 7.5.0 | DB — `$inc`, `select('-content')`, index creation | Already used. `$inc` is atomic (no lost updates). Field projection reduces wire data. |
| Vitest | — | Test framework | Already used. Vitest + mongodb-memory-server for all tests. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mongodb-memory-server` | — | In-memory MongoDB for tests | All test files — existing pattern |
| `next/cache` | — | `revalidateTag(tag, 'max')` | Two-argument form is the new Next 16 API. Already used in `src/lib/cache-revalidation.ts:15`. |
| `next/navigation` | — | `permanentRedirect()` | Import for the legacy redirect fix. 308 status code. |
| `next/server` | — | `after()` | Import for fire-and-forget view counting. Stable since v15.1.0. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `after()` + `$inc` | Client-side beacon `/api/v1/view` endpoint | More moving parts, extra HTTP round-trip, client can be blocked. `after()` is simpler and server-side. |
| In-memory dedupe Map | Redis-backed dedupe | Valid under single PM2 fork. Redis adds infrastructure. |
| `unstable_cache` | `use cache` directive + Cache Components | `use cache` is the replacement in Next 16 but the working `unstable_cache` pattern exists in the codebase. Migration is deferred. |
| `permanentRedirect()` | `redirect()` | Current (307) doesn't tell search engines to transfer ranking. 308 does. |

**Installation:**
No new packages needed. All tools (`after()`, `unstable_cache`, `permanentRedirect`, `revalidateTag`, `React.cache()`) are built into Next.js / React.

**Version verification (existing packages confirmed in codebase):**
- `next` 16.2.12 — `after()` stable since v15.1.0 [VERIFIED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:298-303`]
- `mongoose` — `$inc` operator, `select()` projection, index creation all standard
- `vitest` — already configured at `vitest.config.mts` with `mongodb-memory-server`

## Package Legitimacy Audit

> No new packages are installed in this phase. All tools are built-in Next.js 16 APIs or existing project dependencies.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| `next` (after/unstable_cache/permanentRedirect) | npm (built-in) | OK | No install needed |
| `mongoose` ($inc/select) | npm (existing) | OK | Already installed |
| `vitest` | npm (existing) | OK | Already installed |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User / Crawler / Browser
       │
       ▼
┌─────────────────────────────────────────────┐
│              Next.js 16 Server              │
│                                             │
│  ┌─────────┐   ┌───────────────────┐        │
│  │  after() │   │  RSC Render Path  │        │
│  │  callback│   │                   │        │
│  │  $inc    │   │  React.cache()    │        │
│  │  view_cnt│   │    ┌───────────┐  │        │
│  │  ──after │   │    │unstable(  │  │        │
│  │  response│   │    │ _cache    │  │        │
│  └────┬─────┘   │    │ +60s reval│  │        │
│       │         │    └─────┬─────┘  │        │
│       │ DB write│          │ cache  │        │
│       │ (async) │          │ hit?   │        │
│       ▼         │    ┌─────┴─────┐  │        │
│  ┌──────────┐   │    │ cache     │  │        │
│  │ $inc: 1  │   │    │ miss →    │  │        │
│  │          │   │    │ DB query  │  │        │
│  └──────────┘   │    └───────────┘  │        │
│       │         └───────────────────┘        │
│       │                                      │
│       ▼                                      │
│  ┌──────────────────────────────────┐        │
│  │      MongoDB Atlas (Mongoose)    │        │
│  │                                  │        │
│  │  ArticleModel                     │        │
│  │  ├── view_count ($inc)           │        │
│  │  ├── content (select(-content))  │        │
│  │  └── extracted_domain index      │        │
│  │  SettingModel                    │        │
│  │  BlacklistModel                  │        │
│  └──────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── app/
│   ├── article/[slug]/page.tsx     # Remove inline view_count; wrap in unstable_cache + React.cache; add after()
│   ├── bai-viet/[slug]/page.tsx    # redirect() → permanentRedirect()
│   ├── page.tsx                     # Static metadata → generateMetadata({ searchParams })
│   ├── sitemap.ts                  # force-dynamic → revalidate = 3600
│   └── robots.ts                   # force-dynamic → revalidate = 3600
├── app/api/v1/public/
│   ├── articles/route.ts           # Add select('-content') + Cache-Control headers
│   ├── articles/by-category/route.ts # Add select('-content') + Cache-Control headers
│   ├── tracking/redirect/route.ts  # Not modified (existing click stream)
│   └── top-picks/route.ts          # Add select('-content') + Cache-Control headers
├── lib/
│   ├── cache-revalidation.ts       # Extend: per-slug tag bust, sitemap tag bust
│   ├── homepage-articles.ts        # Not modified (precedent for unstable_cache pattern)
│   ├── blacklist.ts                # Rewrite checkUrlAgainstBlacklist() to query by domain
│   ├── rateLimit.ts                # Not modified (precedent for dedupe Map pattern)
│   └── db/models.ts                # Add extracted_domain index on BlacklistModel
└── tests/
    ├── api/
    │   ├── tracking-redirect.test.ts # Extend: assert aff click tracking details
    │   └── sitemap-shape.test.ts     # New: assert sitemap output shape
    └── lib/
        ├── article-view-count.test.ts  # New: atomic $inc + dedupe
        └── article-cache.test.ts       # New: unstable_cache cache hit/miss
```

### Pattern 1: `after()` for Fire-and-Forget DB Writes
**What:** Schedule a side effect (view_count `$inc`) that executes after the HTTP response is sent — no blocking, no client involvement.
**When to use:** Any post-response analytics, logging, or non-critical DB mutation that shouldn't block the render.
**Example:**
```typescript
// Source: [CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md]
import { after } from 'next/server'

// In the RSC page component, read request data BEFORE after():
const ip = getClientIp(headersList)
const articleId = doc._id.toString()

// Schedule the view_count increment — fires after response is sent
after(async () => {
  const dedupeKey = `${ip}:${articleId}`
  if (consumeDedupe(dedupeKey, DEDUPE_WINDOW_MS)) return // duplicate — skip
  await ArticleModel.updateOne({ _id: articleId }, { $inc: { view_count: 1 } })
})
```

### Pattern 2: `unstable_cache` + `React.cache()` Layered Caching
**What:** Two-layer caching: `React.cache()` dedupes within a single request (generateMetadata + page body); `unstable_cache` stores across requests with tag-based revalidation.
**When to use:** Any RSC page where data is fetched in both `generateMetadata` and the page component, and where cross-request caching is desired.
**Example:**
```typescript
// Source: adapted from [VERIFIED: src/lib/homepage-articles.ts:88-92] pattern + [CITED: docs]
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

// Layer 1: React.cache() dedupes within a single request
const fetchArticleData = cache(async (slug: string) => {
  // Layer 2: unstable_cache caches across requests
  const getCached = unstable_cache(
    async () => {
      const [article, settings] = await Promise.all([
        ArticleModel.findOne({ slug, status: 'published' })
          .populate('author_id', 'name username avatar')
          .populate('category_id', 'name slug')
          .populate('affiliate_placements.affiliate_link_id', 'name commission cookie'),
        SettingModel.findOne(),
      ])
      if (!article) return null
      const doc = article.toObject()
      // ... populate relatedArticles, etc.
      return { doc, settings }
    },
    [`article-${slug}`],
    { tags: [`article-${slug}`], revalidate: 60 },
  )
  return getCached()
})
```

### Pattern 3: `permanentRedirect()` (308) for Legacy URLs
**What:** Issues a 308 Permanent Redirect — search engines transfer ranking signals from the old URL to the new one.
**When to use:** Any legacy path that is retired and should pass SEO equity to the new path.
**Example:**
```typescript
// Source: [CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md]
import { permanentRedirect } from 'next/navigation'

export default async function LegacyArticleRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  permanentRedirect(`/article/${slug}`)
}
```

### Anti-Patterns to Avoid
- **DB writes during RSC render:** Current `article.save()` on every view. Moves to `after()` — the render path stays read-only.
- **Static metadata ignoring search params:** Current `export const metadata: Metadata = createPageMetadata(...)` on homepage. Switches to `generateMetadata({ searchParams })` for conditional `?q=` noindex.
- **Loading all blacklist docs and filtering in JS:** Current `checkUrlAgainstBlacklist()` loads all docs and loops. Rewrites to query by root domain.
- **Full HTML in list APIs:** Current list responses include `content: doc.content`. Adds `select('-content')`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fire-and-forget side effects | Custom async queue or worker | `after()` from `next/server` | Built into Next.js 16, stable since v15.1.0, no infra needed |
| Per-request deduplication | Manual singleton tracking with module-level flags | `React.cache()` | Built-in React API, dedupes across same request lifecycle |
| Cross-request caching | Manual in-memory cache with TTL | `unstable_cache` from `next/cache` | Built into Next.js, tag-based revalidation, 60s TTL |
| Per-route ISR caching | Custom cron-based warmers | `export const revalidate = N` | Native Next.js ISR — N seconds between re-fetches |
| IP+ID deduplication | Distributed lock or DB unique constraint | In-memory `Map<string, timestamp>` | Single PM2 fork makes this valid and zero-infra |

**Key insight:** Every performance and caching tool needed for this phase is built into Next.js 16. No new dependencies, no external caching services, no additional infrastructure. The existing codebase already proves `unstable_cache` + tag revalidation works (homepage-articles.ts). This phase simply replicates that proven pattern to the article page and sitemap.

## Common Pitfalls

### Pitfall 1: `after()` Fires on Every RSC Render Including Metadata
**What goes wrong:** `generateMetadata()` is called before the page body renders. If `after()` is called from `generateMetadata`, the view count may increment **before** the user even sees the page (metadata re-renders, prefetch requests).
**Why it happens:** `after()` fires on all renders including pre-renders. The word "every" in D-03 is intentional.
**How to avoid:** The IP+article dedupe Map covers this — same IP + same article within the dedupe window = only one `$inc`, regardless of how many renders triggered `after()`.
**Warning signs:** Test by firing 5 rapid requests from the same IP within the dedupe window — assert `view_count` incremented exactly once.

### Pitfall 2: 308 Permanent Redirect Is One-Way
**What goes wrong:** Once search engines index the 308 from `/bai-viet/[slug]` → `/article/[slug]`, reverting to a 307 forces a re-crawl cycle that may lose ranking signal.
**Why it happens:** Search engines cache permanent redirects aggressively (sometimes indefinitely).
**How to avoid:** Test the redirect thoroughly in a non-production environment before deploying. Verify the target URL is correct, the slug mapping is 1:1, and no edge cases (non-existent slugs) produce unexpected redirects.
**Warning signs:** Any doubt about slug compatibility between old and new routes requires gating this behind a manual checkpoint.

### Pitfall 3: In-Memory Dedupe Map Resets on Server Restart
**What goes wrong:** PM2 restarts the process (e.g., after hitting the 600MB `max_memory_restart` limit), and the in-memory dedupe Map is empty. All recent view counts get re-recorded.
**Why it happens:** The Map is module-level, per-process state — no persistence layer.
**How to avoid:** Acceptable under the single PM2 fork constraint (documented in PROJECT.md). The Map only prevents F5 bursts within the window; losing state on restart is a brief "reset" that's far better than the current behavior (every request increments).
**Warning signs:** If the project ever scales to multiple instances, move to Redis-backed dedupe (deferred — out of scope).

### Pitfall 4: `unstable_cache` Is Deprecated in Favor of `use cache`
**What goes wrong:** The docs note `unstable_cache` has been replaced by the `use cache` directive / Cache Components in Next.js 16. Continued use of the deprecated API may stop working in a future minor version.
**Why it happens:** Next.js is migrating caching to the `use cache` directive model.
**How to avoid:** The existing homepage pattern already uses `unstable_cache` and works. CONTEXT.md explicitly defers the migration to Cache Components as a backlog item. Low risk for this phase — the API works in 16.2.12 and is not removed, just superseded.
**Warning signs:** Check `node_modules/next/dist/docs/` on Next.js upgrades; if `unstable_cache` is removed, the `use cache` migration becomes urgent.

### Pitfall 5: Dedupe Test Isolation — Shared Map State Across Tests
**What goes wrong:** The dedupe Map is module-level in `src/lib/rateLimit.ts`. Vitest runs test files sequentially (`fileParallelism: false`), but within a single file, the Map persists across `describe`/`it` blocks.
**Why it happens:** Node.js module caching — `import` once, share state.
**How to avoid:** Call `_resetForTests()` from `src/lib/rateLimit.ts:134` (which clears the dedupe map) in `beforeEach` for any test that exercises dedupe logic. The `_resetForTests()` function already exists and clears both `requestWindows` and `dedupeWindows`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEO-01 | Legacy `/bai-viet/[slug]` returns 308 permanent redirect | integration | `npx vitest run tests/api/legacy-redirect.test.ts` | ❌ Wave 0 |
| SEO-02 | Article page JSON-LD matches NewsArticle spec with correct canonical | lib | `npx vitest run tests/lib/article-seo-jsonld.test.ts` | ❌ Wave 0 |
| SEO-03 | `/?q=` metadata returns noindex when query param present | lib | `npx vitest run tests/lib/search-noindex.test.ts` | ❌ Wave 0 |
| SEO-03 | Sitemap output includes only published articles with correct base URL | lib | `npx vitest run tests/lib/sitemap-shape.test.ts` | ❌ Wave 0 |
| PERF-01 | Article page cache: second request within 60s returns cached (0 DB hits) | integration | `npx vitest run tests/lib/article-cache.test.ts` | ❌ Wave 0 |
| PERF-01 | List API responses exclude full HTML content field | integration | `npx vitest run tests/api/articles-list-excerpt.test.ts` | ❌ Wave 0 |
| PERF-02 | 5 rapid reloads within dedupe window increment view_count exactly once | integration | `npx vitest run tests/lib/article-view-count.test.ts` | ❌ Wave 0 |
| PERF-02 | Concurrent view increments never lose updates (atomic $inc) | integration | `npx vitest run tests/lib/article-view-count.test.ts` | ❌ Wave 0 |
| AFF-02 | ClickLog records IP/UA/time/article context, 302 with sub_id, CTA rel attributes | integration | `npx vitest run tests/api/tracking-redirect.test.ts` (extend) | ✅ exists |
| PERF-01 | Blacklist query-by-domain returns correct result (not scan-all) | lib | `npx vitest run tests/lib/blacklist-domain-query.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` on the modified test file(s)
- **Per wave merge:** `npx vitest run --reporter=verbose` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/article-view-count.test.ts` — covers PERF-02 (atomic `$inc` + dedupe)
- [ ] `tests/lib/article-cache.test.ts` — covers PERF-01 (unstable_cache hit/miss)
- [ ] `tests/lib/article-seo-jsonld.test.ts` — covers SEO-02 (JSON-LD NewsArticle spec)
- [ ] `tests/lib/search-noindex.test.ts` — covers SEO-03 (`/?q=` noindex)
- [ ] `tests/lib/sitemap-shape.test.ts` — covers SEO-03 (sitemap output shape)
- [ ] `tests/lib/blacklist-domain-query.test.ts` — covers PERF-01 supporting (query-by-domain)
- [ ] `tests/api/legacy-redirect.test.ts` — covers SEO-01 (308 permanent redirect)
- [ ] `tests/api/articles-list-excerpt.test.ts` — covers PERF-01 (select('-content') projection)
- [ ] Test extension in `tests/api/tracking-redirect.test.ts` — covers AFF-02 (click tracking assertions)

## Code Examples

### Article Fetch with `React.cache()` + `unstable_cache` + `after()` — Combined Pattern

```typescript
// Source: [VERIFIED: src/lib/homepage-articles.ts:88-92 pattern] + [CITED: next docs]
// File: src/app/article/[slug]/page.tsx (conceptual)
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { after } from 'next/server'
import { ArticleModel, SettingModel } from '@/lib/db/models'
import { consumeDedupe } from '@/lib/rateLimit'

const DEDUPE_WINDOW_MS = 60_000

const fetchArticlePageData = cache(async (slug: string) => {
  const getCached = unstable_cache(
    async () => {
      const [article, settings] = await Promise.all([
        ArticleModel.findOne({ slug, status: 'published' })
          .populate('author_id', 'name username avatar')
          .populate('category_id', 'name slug')
          .populate('affiliate_placements.affiliate_link_id', 'name commission cookie'),
        SettingModel.findOne(),
      ])
      if (!article) return null
      // ... resolve relatedArticles, placements, etc.
      return { doc: article.toObject(), settings }
    },
    [`article-${slug}`],
    { tags: [`article-${slug}`], revalidate: 60 },
  )
  return getCached()
})

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchArticlePageData(slug)
  if (!data) notFound()

  // Fire-and-forget view count — no blocking, no await
  after(async () => {
    const dedupeKey = `${ip}:${data.doc._id}`
    if (consumeDedupe(dedupeKey, DEDUPE_WINDOW_MS)) return
    await ArticleModel.updateOne({ _id: data.doc._id }, { $inc: { view_count: 1 } })
  })

  // ... render page
}
```

### Extending Cache Revalidation for Per-Slug and Sitemap Tags

```typescript
// Source: [VERIFIED: src/lib/cache-revalidation.ts:1-23]
// File: src/lib/cache-revalidation.ts (extended)
import { revalidateTag } from 'next/cache'

export const PUBLIC_ARTICLES_CACHE_TAG = 'public-articles'
export const SITEMAP_CACHE_TAG = 'sitemap'

function isDirectVitestRouteCall(error: unknown) {
  return (
    process.env.NODE_ENV === 'test' &&
    error instanceof Error &&
    error.message.includes('static generation store missing')
  )
}

export function revalidatePublicArticles() {
  try {
    revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, 'max')
  } catch (error) {
    if (isDirectVitestRouteCall(error)) return
    throw error
  }
}

export function revalidateArticle(slug: string) {
  try {
    revalidateTag(`article-${slug}`, 'max')
  } catch (error) {
    if (isDirectVitestRouteCall(error)) return
    throw error
  }
}

export function revalidateSitemap() {
  try {
    revalidateTag(SITEMAP_CACHE_TAG, 'max')
  } catch (error) {
    if (isDirectVitestRouteCall(error)) return
    throw error
  }
}
```

### Mongoose Field Projection in List APIs

```typescript
// Source: [VERIFIED: src/app/article/[slug]/page.tsx:125-126 select() usage]
// File: src/app/api/v1/public/articles/route.ts (conceptual)
// Add to existing query:
const articles = await ArticleModel.find(query)
  .select('-content')  // EXCLUDE full HTML — list mode only needs excerpt/title/slug
  .populate('author_id', 'name username')
  .populate('category_id', 'name slug')
  .sort({ created_at: -1 })
  .limit(limit)
  .skip((page - 1) * limit)
  .lean()

// Derive excerpt fallback:
const excerpt = doc.excerpt || doc.content
  ? doc.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
  : ''
```

### Blacklist Domain Index + Query Rewrite

```typescript
// Source: [VERIFIED: src/lib/db/models.ts (existing model)] + [ASSUMED: standard Mongoose index]
// File: src/lib/db/models.ts (extend BlacklistModel)
const BlacklistSchema = new Schema({
  // ... existing fields
  extracted_domain: { type: String, index: true }, // ADD INDEX
  // ...
})

// File: src/lib/blacklist.ts (rewrite checkUrlAgainstBlacklist)
export async function checkUrlAgainstBlacklist(url: string): Promise<BlacklistDoc | null> {
  const rootDomain = extractRootDomain(url)
  // Query by root domain instead of loading all docs
  const matches = await BlacklistModel.find({
    extracted_domain: rootDomain,
    status: 'active',
  }).lean()

  // Wildcard subdomain matching stays in JS (suffix check on 0-1 results)
  for (const entry of matches) {
    if (urlMatchesWildcard(url, entry)) return entry
  }
  return null
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `article.save()` on every view (read-modify-write) | `after()` + atomic `$inc` | This phase | Eliminates lost-update race, F5 inflation, per-render validation cost |
| `redirect()` (307) on `/bai-viet/[slug]` | `permanentRedirect()` (308) | This phase | Tells crawlers to transfer ranking signals to `/article/[slug]` |
| Static `export const metadata` on homepage | `generateMetadata({ searchParams })` | This phase | Enables conditional `?q=` noindex metadata |
| `force-dynamic` on sitemap/robots | `revalidate = 3600` | This phase | Sitemap serves from cache; one Atlas query per hour instead of per crawler |
| Full HTML in list API responses | `select('-content')` projection | This phase | Reduces wire transfer; excerpt-only in list mode |
| Blacklist scan-all + JS loop | Indexed query by root domain | This phase | O(n) → O(1) per redirect; stays fast at scale |
| Two-argument `revalidateTag(tag, 'max')` | Single-argument (deprecated) | Already adopted | The codebase already uses the new form — no migration needed |

**Deprecated/outdated:**
- `unstable_cache` — replaced by `use cache` / Cache Components in Next.js 16. Not removed; migration deferred to backlog.
- `revalidateTag(tag)` single-argument form — deprecated. The codebase already uses `revalidateTag(tag, 'max')` correctly.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `consumeDedupe()` from `src/lib/rateLimit.ts` can be directly reused for IP+article view dedupe without modification | View Counting | Minor — the existing API (`key: string, windowMs: number`) accepts any key format; IP+article composite key works. If the `_resetForTests()` doesn't clear the view-dedupe map, tests may fail — but `_resetForTests()` clears `dedupeWindows`, which is the same map. |
| A2 | `revalidateTag('sitemap', 'max')` works with a non-`unstable_cache` route (sitemap uses `export const revalidate = 3600` instead of `unstable_cache` tags) | Sitemap Caching | If `revalidateTag` doesn't trigger ISR revalidation of the sitemap route, then CMS publishes won't bust the sitemap cache until the 3600s window expires. Mitigation: `revalidate = 3600` with `stale-while-revalidate` means hittable content is at most 1 hour stale. Acceptable — CONTEXT.md D-08 notes this is reversible. |
| A3 | `permanentRedirect()` throws `NEXT_REDIRECT` error and terminates rendering, same as `redirect()` | Crawl Hygiene | Core Next.js behavior — 100% confident it works this way given the API docs confirm it [CITED: permanentRedirect.md:46-50]. Low-risk assumption. |

## Open Questions (RESOLVED)

1. **Dedupe window size for view counting**
   - What we know: Phase 1 click dedupe uses 60s. CONTEXT.md suggests 60s as matching.
   - What's unclear: Whether 60s is too aggressive (losing views from legitimate back/forward within a minute) or too lax (still allowing some F5 inflation).
   - Recommendation: Start with 60s (matching Phase 1). Success criterion #1 says "5 rapid reloads within one minute increment view_count exactly once" — this is testing the dedupe window boundary. If testing shows the window needs tuning, adjust before phase gate.

2. **Exact structure of the shared article fetch function**
   - What we know: `React.cache()` and `unstable_cache` must both wrap the article fetch. `generateMetadata` and `page` both need article + settings data.
   - What's unclear: Should `React.cache()` wrap `unstable_cache()` or vice versa? Should they be a single combined wrapper or two layers?
   - Recommendation: Outer `React.cache()` wrapping inner `unstable_cache()` with a single typed return. The `Code Examples` section shows this pattern. Both layers are needed: `React.cache()` for per-request dedupe (metadata + page body), `unstable_cache()` for cross-request caching.

## Environment Availability

> Step 2.6: SKIPPED — no external dependencies beyond what the project already uses. All tools (`after()`, `unstable_cache`, `permanentRedirect`, `revalidateTag`, `React.cache()`) are built into Next.js 16. No new npm packages, no external services, no runtimes are needed.

The existing environment (Next.js 16.2.12, Node.js, MongoDB Atlas, Vitest) covers all phase requirements.

## Security Domain

> **Note:** security_enforcement is not set in `.planning/config.json` (absent = enabled). However, this phase introduces no new security-sensitive code paths. All changes are performance optimizations, caching, and SEO metadata. The view counting dedupe reads the client IP (from the already-trusted `getClientIp()` utility, Phase 1 D-14) but does not expose any new surface.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | No | No new input paths added |
| V6 Cryptography | No | No cryptographic changes |
| V11 Business Logic | Partial | View count dedupe could be gamed if IP spoofing bypasses Nginx. Mitigated by Phase 1 IP trust fix (last-hop XFF + Nginx overwrite). |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| View count manipulation via IP spoofing | Tampering | Phase 1 IP trust fix: `getClientIp()` parses last-hop XFF (Nginx overwrites), not the client-controlled first entry. The single-instance constraint is documented. |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`] — `after()` API: fires callback post-response, imported from `next/server`, stable since v15.1.0, cannot use `headers()`/`cookies()` inside callback in Server Components.
- [VERIFIED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`] — `unstable_cache` API: replaces by `use cache` in Next 16 but still works. Supports `tags` and `revalidate` options.
- [VERIFIED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md`] — `permanentRedirect()` issues 308 (Permanent) HTTP redirect. Import from `next/navigation`. Throws `NEXT_REDIRECT` error.
- [VERIFIED: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`] — Two-argument form `revalidateTag(tag, 'max')` is the recommended API. Single-argument deprecated.
- [VERIFIED: `src/lib/homepage-articles.ts:88-92`] — Existing `unstable_cache` pattern with tag `public-articles` + 60s revalidate.
- [VERIFIED: `src/lib/cache-revalidation.ts:1-23`] — `revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, 'max')` with vitest route guard.
- [VERIFIED: `src/lib/rateLimit.ts:117-128`] — `consumeDedupe(key, windowMs)` returns true if duplicate within window.
- [VERIFIED: `src/app/article/[slug]/page.tsx:85-86`] — Current view_count pattern: `article.view_count += 1; await article.save()` (read-modify-write).
- [VERIFIED: `src/app/article/[slug]/page.tsx:153-161`] — Current JSON-LD NewsArticle structure.
- [VERIFIED: `src/app/bai-viet/[slug]/page.tsx:9`] — Current `redirect()` (307).
- [VERIFIED: `src/app/sitemap.ts:10`] — Current `force-dynamic` on sitemap.
- [VERIFIED: `src/app/robots.ts:9`] — Current `force-dynamic` on robots.
- [VERIFIED: `src/app/page.tsx:6-10`] — Current static `export const metadata` on homepage.
- [VERIFIED: `src/app/page.tsx:12-18`] — `searchParams` already typed in HomePageProps but not used for metadata.

### Secondary (MEDIUM confidence)
- [CITED: context decision D-01 through D-16] — All locked decisions from CONTEXT.md, the result of the discuss-phase.
- [CITED: `.planning/codebase/CONCERNS.md`] — Performance Bottlenecks #1-4, Known Bugs #2/#4.
- [CITED: `.planning/REQUIREMENTS.md`] — SEO-01/02/03, PERF-01/02, AFF-02 definitions.
- [CITED: `.planning/ROADMAP.md`] — Phase 3 success criteria #1-5.

### Tertiary (LOW confidence)
- None. All research claims are either source-verified from the Next.js 16 bundled docs or from directly reading the codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are built-in Next.js 16 APIs already present in the project.
- Architecture: HIGH — patterns proven by existing code (homepage-articles.ts `unstable_cache`, rateLimit.ts `consumeDedupe`).
- Pitfalls: HIGH — based on documented Next.js behavior and the single-instance constraint.
- Security: HIGH — no new security-sensitive code paths introduced.

**Research date:** 2026-09-23
**Valid until:** 2026-10-23 (30 days — stable framework, but `unstable_cache` deprecation status could change on minor Next.js bumps)