# Phase 3: SEO/GEO & Performance Hardening - Pattern Map

**Mapped:** 2026-09-23
**Files analyzed:** 21 (13 source modifications, 8 test files)
**Analogs found:** 21 / 21

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/view-count.ts` (new) | service | fire-and-forget | `src/lib/rateLimit.ts` (dedupe Map) | exact |
| `src/app/article/[slug]/page.tsx` | page/RSC | request-response | `src/lib/homepage-articles.ts` (unstable_cache) + `src/app/article/[slug]/page.tsx` (self) | exact |
| `src/lib/cache-revalidation.ts` | utility | event-driven | `src/lib/cache-revalidation.ts` (self) | exact |
| `src/app/sitemap.ts` | route | request-response | `src/app/sitemap.ts` (self) | exact |
| `src/app/robots.ts` | route | request-response | `src/app/robots.ts` (self) | exact |
| `src/app/page.tsx` | page/RSC | request-response | `src/lib/seo.ts` (createPageMetadata) + `src/app/page.tsx` (self) | exact |
| `src/app/bai-viet/[slug]/page.tsx` | page/route | request-response | `src/app/bai-viet/[slug]/page.tsx` (self) | exact |
| `src/app/api/v1/public/articles/route.ts` | route handler | request-response | `src/app/api/v1/public/articles/route.ts` (self) | exact |
| `src/app/api/v1/public/articles/by-category/route.ts` | route handler | request-response | `src/app/api/v1/public/articles/by-category/route.ts` (self) | exact |
| `src/app/api/v1/public/top-picks/route.ts` | route handler | request-response | `src/app/api/v1/public/top-picks/route.ts` (self) | exact |
| `src/lib/blacklist.ts` | service | CRUD | `src/lib/blacklist.ts` (self) | exact |
| `src/lib/db/models.ts` | model | CRUD | `src/lib/db/models.ts` (self) | exact |
| `src/app/api/v1/cms/articles/route.ts` | route handler | request-response | `src/app/api/v1/cms/articles/route.ts` (self, revalidation call-site) | exact |
| `src/app/api/v1/cms/articles/[id]/route.ts` | route handler | request-response | `src/app/api/v1/cms/articles/[id]/route.ts` (self, revalidation call-site) | exact |
| `tests/lib/article-view-count.test.ts` (new) | test | — | `tests/api/rate-limit.test.ts` (dedupe testing pattern) | exact |
| `tests/lib/article-cache.test.ts` (new) | test | — | `tests/lib/blacklist-sweep.test.ts` (lib test pattern) | role-match |
| `tests/lib/article-seo-jsonld.test.ts` (new) | test | — | `tests/lib/sanitize.test.ts` (lib structural test) | role-match |
| `tests/lib/search-noindex.test.ts` (new) | test | — | `tests/lib/client-ip.test.ts` (lib logic test) | role-match |
| `tests/lib/sitemap-shape.test.ts` (new) | test | — | `tests/lib/blacklist-sweep.test.ts` (lib data-shape test) | role-match |
| `tests/lib/blacklist-domain-query.test.ts` (new) | test | — | `tests/lib/blacklist-sweep.test.ts` (blacklist lib test) | exact |
| `tests/api/legacy-redirect.test.ts` (new) | test | — | `tests/api/tracking-redirect.test.ts` (redirect assertion) | role-match |
| `tests/api/articles-list-excerpt.test.ts` (new) | test | — | `tests/api/articles-list-scoping.test.ts` (list API assertion) | role-match |
| `tests/api/tracking-redirect.test.ts` (extend) | test | — | `tests/api/tracking-redirect.test.ts` (self) | exact |

## Pattern Assignments

### `src/lib/view-count.ts` (new) — service, fire-and-forget

**Analog:** `src/lib/rateLimit.ts` (lines 106–149)

**Imports pattern** (from analog lines 1–4):
```typescript
// Module-level in-memory Map — same single-instance contract.
// Referenced from src/lib/rateLimit.ts line 1 comment:
//   "In-memory, per-process store. Sufficient for a single-instance deployment"
```

**Dedupe Map pattern** (lines 111–128 of analog):
```typescript
interface DedupeEntry {
  lastSeenAt: number;
}

const dedupeWindows = new Map<string, DedupeEntry>();

export function consumeDedupe(key: string, windowMs: number): boolean {
  const now = Date.now();
  const entry = dedupeWindows.get(key);
  // Prune stale entries on touch so the map can't grow unboundedly.
  pruneStaleDedupe(now, windowMs);
  if (entry && now - entry.lastSeenAt < windowMs) {
    entry.lastSeenAt = now;
    return true; // duplicate within the window
  }
  dedupeWindows.set(key, { lastSeenAt: now });
  return false;
}
```

**Lazy-prune helper pattern** (lines 145–148 of analog):
```typescript
function pruneStaleDedupe(now: number, windowMs: number): void {
  for (const [k, v] of dedupeWindows) {
    if (now - v.lastSeenAt >= windowMs) dedupeWindows.delete(k);
  }
}
```

**Test reset affordance pattern** (lines 133–137 of analog):
```typescript
export function _resetForTests(): void {
  requestWindows.clear();
  dedupeWindows.clear();
}
```

**How to copy:** Export a new `recordView(articleId, ip, windowMs)` function from `src/lib/view-count.ts` that:
1. Builds key `${ip}:${articleId}`
2. Calls `consumeDedupe(key, windowMs)` — if `true`, skip (duplicate)
3. If `false`, fires `ArticleModel.updateOne({ _id: articleId }, { $inc: { view_count: 1 } })`
4. Exposes its own `_resetForTests()` for test isolation
Alternatively, the dedupe can reuse `consumeDedupe` directly from `rateLimit.ts` — the key format `${ip}:${articleId}` is compatible (parametric key).

---

### `src/app/article/[slug]/page.tsx` — page/RSC, request-response

**Analog (caching):** `src/lib/homepage-articles.ts` (lines 88–99)
**Analog (self):** `src/app/article/[slug]/page.tsx` (all lines — heavily modified, same file)

**unstable_cache pattern** (lines 88–92 of homepage-articles.ts):
```typescript
const getCachedHomepageArticles = unstable_cache(
  () => loadHomepageArticles(),
  ["homepage-public-articles"],
  { tags: ["public-articles"], revalidate: 60 },
);
```

**Conditional cache vs raw fetch pattern** (lines 94–98 of homepage-articles.ts):
```typescript
export function getHomepageArticles(query = "") {
  const normalizedQuery = query.trim();
  return normalizedQuery
    ? loadHomepageArticles(normalizedQuery)
    : getCachedHomepageArticles();
}
```

**What to remove (lines 85–86 of article page — the anti-pattern):**
```typescript
// REMOVE THIS — read-modify-write during render
article.view_count += 1;
await article.save();
```

**What replaces it (fire-and-forget via after()):**
```typescript
import { after } from 'next/server';
import { cache } from 'react';

// Layer 1: React.cache() dedupes within a single request
// Layer 2: unstable_cache() caches across requests
const fetchArticlePageData = cache(async (slug: string) => {
  const getCached = unstable_cache(
    async () => { /* existing fetch logic from lines 76–82 */ },
    [`article-${slug}`],
    { tags: [`article-${slug}`], revalidate: 60 },
  );
  return getCached();
});

// In page component:
after(async () => {
  // dedupe + $inc — no render blocking
});
```

**Existing data pipeline to preserve** (lines 73–127 of article page):
The article page already does `connectToDatabase()`, `ArticleModel.findOne()` + `.populate()` chain, `SettingModel.findOne()`, related/latest queries. Wrap these in the layered cache. The existing `export const revalidate = 0;` (line 28) must be removed in favor of the unstable_cache wrapper.

**JSON-LD to preserve as-is** (lines 153–161):
```typescript
const articleSchema = {
  '@context': 'https://schema.org', '@type': 'NewsArticle', headline: doc.title,
  description: doc.meta_description || doc.excerpt || doc.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
  ...(doc.thumbnail_url ? { image: [doc.thumbnail_url] } : {}), datePublished: doc.created_at,
  dateModified: doc.updated_at || doc.created_at,
  ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}),
  mainEntityOfPage: `${normalizeSiteUrl(settings?.canonicalUrl)}/article/${doc.slug}`,
  publisher: { '@type': 'Organization', name: settings?.site_title || 'AIDEALSUK' },
};
```

---

### `src/lib/cache-revalidation.ts` — utility, event-driven

**Analog:** Self (lines 1–23). This file is being extended, not rewritten.

**Existing pattern to replicate** (lines 1–22):
```typescript
import { revalidateTag } from 'next/cache';

export const PUBLIC_ARTICLES_CACHE_TAG = 'public-articles';

function isDirectVitestRouteCall(error: unknown) {
  return (
    process.env.NODE_ENV === 'test' &&
    error instanceof Error &&
    error.message.includes('static generation store missing')
  );
}

export function revalidatePublicArticles() {
  try {
    revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) {
      return;
    }
    throw error;
  }
}
```

**New exports to add (same try/catch pattern, same `'max'` argument):**
```typescript
export const SITEMAP_CACHE_TAG = 'sitemap';

export function revalidateArticle(slug: string) {
  try {
    revalidateTag(`article-${slug}`, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) return;
    throw error;
  }
}

export function revalidateSitemap() {
  try {
    revalidateTag(SITEMAP_CACHE_TAG, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) return;
    throw error;
  }
}
```

---

### CMS Write Paths — `src/app/api/v1/cms/articles/route.ts` & `[id]/route.ts`

**Analog:** Self. These files already call `revalidatePublicArticles()`.

**Existing call-site POST create** (route.ts line 137):
```typescript
    revalidatePublicArticles();
```

**Existing call-site PUT update** ([id]/route.ts line 145):
```typescript
    await existingArticle.save();
    revalidatePublicArticles();
```

**Existing call-site DELETE** ([id]/route.ts line 187):
```typescript
    revalidatePublicArticles();
```

**What to add:**
- Import `revalidateArticle` and `revalidateSitemap` from `@/lib/cache-revalidation`
- After `revalidatePublicArticles()`, call:
  - `revalidateArticle(article.slug)` — when slug is available
  - `revalidateSitemap()` — only on publish/unpublish status changes
- The existing import on line 7 (`import { revalidatePublicArticles } from '@/lib/cache-revalidation'`) is the single import to extend.

---

### `src/app/sitemap.ts` — route, request-response

**Analog:** Self (lines 1–87).

**Current config to replace** (lines 9–10):
```typescript
// Buộc render động mỗi request thay vì cố static-generate lúc `next build`
export const dynamic = 'force-dynamic';
```

**Replacement:**
```typescript
export const revalidate = 3600;
```

**Function body stays unchanged** (lines 12–87) — the `await connectToDatabase()` and Mongoose queries are the same; ISR caching means they execute only once per hour.

---

### `src/app/robots.ts` — route, request-response

**Analog:** Self (lines 1–24).

**Current config to replace** (lines 8–9):
```typescript
// Buộc render động mỗi request
export const dynamic = 'force-dynamic';
```

**Replacement:**
```typescript
export const revalidate = 3600;
```

**Function body stays unchanged** (lines 11–24).

---

### `src/app/page.tsx` — page/RSC, request-response

**Analog (metadata):** `src/lib/seo.ts` (lines 52–79)
**Analog (self):** `src/app/page.tsx` (lines 1–33)

**Current static metadata pattern to replace** (lines 6–10):
```typescript
export const metadata: Metadata = createPageMetadata({
  title: "Technology News",
  description: "Latest technology and finance articles from AIDEALSUK.",
  path: "/",
});
```

**Existing createPageMetadata to build from** (seo.ts lines 52–79):
```typescript
export function createPageMetadata({
  title, description, path,
}: {
  title: string; description: string; path: string;
}): Metadata {
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: 'website', images: [...] },
    twitter: { card: 'summary_large_image', title, description, images: [...] },
  };
}
```

**Replacement — generateMetadata with conditional noindex:**
```typescript
export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const baseMeta = createPageMetadata({
    title: "Technology News",
    description: "Latest technology and finance articles from AIDEALSUK.",
    path: "/",
  });
  if (typeof q === 'string' && q.trim()) {
    return { ...baseMeta, robots: { index: false, follow: true } };
  }
  return baseMeta;
}
```

**Existing searchParams prop to reference** (line 12–14 of page.tsx):
```typescript
interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}
```

---

### `src/app/bai-viet/[slug]/page.tsx` — page/route, request-response

**Analog:** Self (lines 1–10). Single-line import swap.

**Current code** (lines 1–10):
```typescript
import { redirect } from 'next/navigation';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyArticleRedirect({ params }: ArticlePageProps) {
  const { slug } = await params;
  redirect(`/article/${slug}`);
}
```

**Change:** Replace `redirect` import with `permanentRedirect` from same module:
```typescript
import { permanentRedirect } from 'next/navigation';
// ... line 9: permanentRedirect(`/article/${slug}`);
```

---

### `src/app/api/v1/public/articles/route.ts` — route handler, request-response

**Analog:** Self (lines 1–113).

**Existing query to modify** (lines 61–67):
```typescript
const rawArticles = await ArticleModel.find(filter)
  .populate('author_id', 'name avatar username')
  .populate('category_id', 'name slug')
  .populate('sub_category_id', 'name slug')
  .sort(sortOption)
  .skip(offset)
  .limit(limit);
```

**Pattern — add `.select('-content')` after `.find(filter)`:**
```typescript
const rawArticles = await ArticleModel.find(filter)
  .select('-content')
  .populate('author_id', 'name avatar username')
  // ...
```

**Existing response field to strip** (lines 69–76):
```typescript
const result = rawArticles.map((art) => {
  const doc = art.toObject();
  return {
    // ...
    content: doc.content,   // <-- REMOVE when select('-content') is applied
    // ...
  };
});
```

**Existing response header pattern to modify** (lines 95–108):
```typescript
return NextResponse.json(
  { status: 'success', data: result, pagination: { ... } },
  { headers: { 'Cache-Control': 'no-store' } }  // <-- CHANGE to public, s-maxage=60, stale-while-revalidate=300
);
```

**Existing error handling pattern** (lines 109–112):
```typescript
} catch (error) {
  console.error('Public articles API error:', error);
  return NextResponse.json({ status: 'error', message: 'Failed to fetch public articles' }, { status: 500 });
}
```

---

### `src/app/api/v1/public/articles/by-category/route.ts` — route handler, request-response

**Analog:** Self (lines 1–62).

**Existing select pattern already partially in place** (lines 18–19):
```typescript
ArticleModel.find(filter)
  .select('title slug excerpt content thumbnail_url view_count is_featured published_at created_at')
```

**Change:** Replace with `.select('-content')` (exclude instead of explicit-inclusion approach — simpler and future-proof):
```typescript
ArticleModel.find(filter)
  .select('-content')
```

**Existing response field to strip** (line 35):
```typescript
content: article.content,   // <-- REMOVE or derive excerpt fallback
```

**Existing response envelope** (line 54):
```typescript
return NextResponse.json({ status: 'success', data });
```
Add Cache-Control header: `{ headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }`

**Error handling pattern** (lines 55–61) stays as-is.

---

### `src/app/api/v1/public/top-picks/route.ts` — route handler, request-response

**Analog:** Self (lines 1–34).

**Note:** This route queries `AffiliateLinkModel`, not `ArticleModel`. The `select('-content')` pattern does NOT apply here — affiliate links don't have a `content` field. However, D-10 mentions all public list-mode article queries. If top-picks includes article joins in future, add projection then.

**Existing response envelope** (lines 27–30):
```typescript
return NextResponse.json({
  status: 'success',
  data: topPicks,
});
```

**Change:** Add Cache-Control header. No `select('-content')` needed (no content field).

---

### `src/lib/blacklist.ts` — service, CRUD

**Analog:** Self (lines 70–129). Rewriting `checkUrlAgainstBlacklist()`.

**Existing "load-all + loop" pattern to replace** (lines 82–127):
```typescript
// Retrieve active blacklists
const activeBlacklists = await BlacklistModel.find({ status: 'active' });

for (const item of activeBlacklists) {
  const targetDomain = (item.extracted_domain || item.website_url || '').toLowerCase().trim();
  // ... loop through ALL entries doing JS-side matching
}
```

**Replacement — query by root domain:**
```typescript
const { hostname, rootDomain, fullUrl } = extractDomainFromUrl(urlStr);

// Query by root domain instead of loading all
const matches = await BlacklistModel.find({
  extracted_domain: { $in: [hostname, rootDomain] },
  status: 'active',
}).lean();

// Wildcard subdomain matching stays in JS (suffix check on the 0–N result docs)
for (const item of matches) {
  // ... same suffix/match logic, but on a tiny result set
}
```

**Reusable domain extraction function** (lines 11–56):
```typescript
export function extractDomainFromUrl(urlStr: string): { hostname: string; rootDomain: string; fullUrl: string }
```
This is reused as-is — no change needed.

**Existing BlacklistCheckResult interface** (lines 58–65) stays as-is.

---

### `src/lib/db/models.ts` — model, CRUD

**Analog:** Self (lines 107–117). Extending BlacklistSchema.

**Current BlacklistSchema** (lines 107–117):
```typescript
const BlacklistSchema = new Schema<IBlacklist>({
  project_name: { type: String },
  website_url: { type: String, required: true },
  extracted_domain: { type: String, required: true, index: true },  // <-- ALREADY HAS INDEX
  match_type: { type: String, enum: ['domain', 'exact_url'], default: 'domain' },
  reason: { type: String, required: true },
  blocked_countries: [{ type: String }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});
```

**Finding:** `extracted_domain` ALREADY has `index: true` (line 110). The model change for D-16 is a **no-op on the schema** — the index exists. The optimization is purely the query rewrite in `blacklist.ts` (above). The schema change may involve adding a compound index `{ extracted_domain: 1, status: 1 }` for the query `findOne({ extracted_domain, status: 'active' })`, or confirming the single-field index is sufficient.

**Model export pattern** (line 329) for reference:
```typescript
export const BlacklistModel: Model<IBlacklist> = mongoose.models.Blacklist || mongoose.model<IBlacklist>('Blacklist', BlacklistSchema);
```

---

## Shared Patterns

### Route Handler Response Envelope
**Source:** `src/app/api/v1/public/articles/route.ts` (lines 95–108)
**Apply to:** All API route handlers (articles, by-category, top-picks)
```typescript
return NextResponse.json(
  { status: 'success', data: result, pagination: { total, page, limit, totalPages, hasMore } },
  { headers: { 'Cache-Control': '...' } }
);
// Error:
return NextResponse.json({ status: 'error', message: '...' }, { status: 500 });
```

### In-Memory Dedupe Map (single PM2 fork)
**Source:** `src/lib/rateLimit.ts` (lines 107–149)
**Apply to:** `src/lib/view-count.ts` (view count dedupe)
```typescript
// Key contract: module-level Map, no persistence, resets on restart.
// Synchronized via Node single-threaded event loop.
// Test isolation: `_resetForTests()` clears the map in beforeEach.
```

### Tag-Based Cache Revalidation with Vitest Guard
**Source:** `src/lib/cache-revalidation.ts` (lines 1–23)
**Apply to:** New `revalidateArticle(slug)` and `revalidateSitemap()` exports
```typescript
function isDirectVitestRouteCall(error: unknown) {
  return (
    process.env.NODE_ENV === 'test' &&
    error instanceof Error &&
    error.message.includes('static generation store missing')
  );
}
// Every revalidate* wrapper: try/revalidateTag(tag, 'max')/catch/vitest-guard
```

### CMS Write Path Revalidation Call
**Source:** `src/app/api/v1/cms/articles/[id]/route.ts` (line 145, line 187)
**Apply to:** Extend with new cache busts alongside existing `revalidatePublicArticles()` calls
```typescript
await existingArticle.save();
revalidatePublicArticles();
// ADD: revalidateArticle(existingArticle.slug);
// ADD: revalidateSitemap(); // only on status change (publish/unpublish)
```

### MongoDB Connection Pattern
**Source:** `src/app/api/v1/public/articles/route.ts` (line 25), `src/app/sitemap.ts` (line 13)
**Apply to:** All route handlers and lib functions requiring DB
```typescript
await connectToDatabase();
// then query via Mongoose models
```

### Test Setup — mongodb-memory-server
**Source:** `tests/setup.ts` (lines 1–27) + `vitest.config.mts`
**Apply to:** All new test files

**Key contracts:**
- `fileParallelism: false` — one MongoMemoryServer per file, sequential execution
- `afterEach` in setup.ts clears all collections — no cross-test pollution
- Import `connectToDatabase` then `await connectToDatabase()` in tests, models auto-connect
- Module-level `_resetForTests()` from rateLimit.ts calls in `beforeEach` when testing dedupe state

**Test file skeleton** (from `tests/lib/blacklist-sweep.test.ts`):
```typescript
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel } from '@/lib/db/models';
// import function under test

describe('feature description', () => {
  it('assertion', async () => {
    await connectToDatabase();
    // seed data
    // exercise function
    // assert result
  });
});
```

**Seed helper pattern** (from `tests/api/tracking-redirect.test.ts` lines 7–34):
```typescript
async function seedLinkAndArticle(overrides = {}) {
  await connectToDatabase();
  const author = await UserModel.create({ username: `...`, password_hash: 'irrelevant', role: 'author', status: 'active' });
  const affiliateLink = await AffiliateLinkModel.create({ ... });
  const article = await ArticleModel.create({ author_id: author._id, ... });
  return { affiliateLink, article };
}
```

### Dedupe Test Pattern
**Source:** `tests/api/rate-limit.test.ts` (lines 187–205)
**Apply to:** `tests/lib/article-view-count.test.ts`
```typescript
describe('consumeDedupe unit', () => {
  beforeEach(() => { _resetForTests(); });
  it('returns false on first touch and true within the window', () => {
    expect(consumeDedupe(key, 60_000)).toBe(false);
    expect(consumeDedupe(key, 60_000)).toBe(true);
  });
  it('prunes stale entries (false after window elapses)', async () => {
    // short window + setTimeout to test expiry
  });
});
```

---

## No Analog Found

All files have analogs. This is a brownfield phase with every modification targeting existing files.

## Metadata

**Analog search scope:** `src/lib/`, `src/app/`, `tests/`, `vitest.config.mts`
**Files scanned:** 22 source + test files
**Pattern extraction date:** 2026-09-23
