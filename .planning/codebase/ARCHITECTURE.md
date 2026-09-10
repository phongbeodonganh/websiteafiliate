<!-- refreshed: 2026-09-10 -->
# Architecture

**Analysis Date:** 2026-09-10

## System Overview

Single Next.js 16 App Router application (`src/app`) that serves three concerns from one codebase:

1. **Public content site** — SEO-driven AI/tech/finance article pages with affiliate monetization (brand: AIDEALSUK, `src/lib/seo.ts`)
2. **Admin CMS** — client-rendered content/affiliate/insider management under `/admin` (all `'use client'`)
3. **REST API v1** — route handlers under `src/app/api/v1` split into `public/`, `cms/`, `auth/`, `cron/`, `webhooks/`, `seed/`

```text
┌────────────────────────────────────────────────────────────────────┐
│                          Request Edge                               │
│  `src/proxy.ts` (Next 16 replacement for middleware.ts)             │
│  per-request CSP nonce via `x-nonce` header                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Root Layout (dynamic)                           │
│  `src/app/layout.tsx` — reads settings from MongoDB, injects        │
│  theme CSS vars, geo meta, JSON-LD, GA script (nonce-stamped)       │
└──────────────┬───────────────────────┬─────────────────────────────┘
               ▼                       ▼
┌──────────────────────────┐  ┌────────────────────────────────────┐
│  Public pages (RSC)      │  │  Admin CMS ('use client' islands)  │
│  `src/app/page.tsx`      │  │  `src/app/admin/**`                │
│  `src/app/article/[slug]`│  │  `src/components/admin/*`          │
│  `src/app/category/[slug]`│ │  Tiptap RichTextEditor             │
│  collection pages        │  └───────────────┬────────────────────┘
│  `news-client.tsx` /     │                  │
│  `collection-client.tsx` │                  │
└──────────────┬───────────┘                  │
               │ fetch (server fn or REST)    │ REST + Bearer JWT
               ▼                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     API Layer — `src/app/api/v1`                    │
│  public/ (articles, affiliates, tracking, subscribe, insider,      │
│  top-picks, categories, settings) · cms/ (articles, users, links,  │
│  blacklist, insights, ai/, upload) · auth/ (login/logout/me) ·     │
│  cron/ (insider-digest) · webhooks/ (resend)                       │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│              Service / Utility Layer — `src/lib`                    │
│  auth.ts · seo.ts · sanitize.ts · blacklist.ts · gemini.ts ·       │
│  storage.ts (R2) · email/* · insider/* · google/* ·                │
│  rateLimit.ts · cache-revalidation.ts · homepage-articles.ts       │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│              Data Layer — `src/lib/db` (Mongoose)                   │
│  `mongodb.ts` (cached connection singleton) ·                      │
│  `models.ts` (10 models: User, Category, SubCategory, Article,     │
│  AffiliateLink, Blacklist, ArticleAffiliateRelation, ClickLog,     │
│  Subscriber, Setting, InsightsCache)                               │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas (MONGODB_URI)  │  Cloudflare R2 (images)            │
│  Resend (email)               │  Google GA4/GSC (insights)         │
│  Gemini API (article gen)     │  PM2 + standalone on 4GB VPS       │
└────────────────────────────────────────────────────────────────────┘
```

**Framework note (per `AGENTS.md`):** this is Next.js 16.2.12 with breaking changes vs older training data. Middleware is `src/proxy.ts` exporting `proxy()` (no `middleware.ts` exists); `params`/`searchParams` are Promises awaited in pages; docs live in `node_modules/next/dist/docs/`.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Proxy (edge) | Per-request CSP nonce, forwards `x-nonce` header | `src/proxy.ts` |
| Root layout | Global metadata, theme CSS vars, geo meta, JSON-LD, GA injection | `src/app/layout.tsx` |
| Home page | Server-preloads latest/popular/editorial articles, delegates to client island | `src/app/page.tsx` |
| Home client island | Tabs, search, infinite lists, lead capture, top picks | `src/app/news-client.tsx` |
| Collection pages | latest/hottest/editorial-picks/affiliates/category via one shared client component | `src/app/collection-client.tsx` |
| Article page | RSC: fetch article + related, JSON-LD, affiliate placements, view counter | `src/app/article/[slug]/page.tsx` |
| Admin CMS shell | Dashboard, articles, links, users, blacklist, settings, insider (single file) | `src/app/admin/page.tsx` |
| Rich text editor | Tiptap editor with slash commands, image align, affiliate insert | `src/components/admin/RichTextEditor.tsx` |
| Public API handlers | Unauthenticated reads, tracking redirect, subscribe flow | `src/app/api/v1/public/**` |
| CMS API handlers | JWT-guarded CRUD with role-based data isolation | `src/app/api/v1/cms/**` |
| Auth lib | bcrypt hashing, JWT sign/verify (24h), token blacklist | `src/lib/auth.ts`, `src/lib/tokenBlacklist.ts` |
| SEO lib | Metadata builders, URL/locale normalizers, JSON-LD serializers | `src/lib/seo.ts` |
| Sanitizers | HTML sanitization for stored article content | `src/lib/sanitize.ts`, `src/lib/sanitizer.ts` |
| Affiliate tracking | Click logging + blacklist guard + subId-tagged 302 redirect | `src/app/api/v1/public/tracking/redirect/route.ts` |
| Blacklist | Domain/URL blocklist lookup + Google Sheets import | `src/lib/blacklist.ts`, `src/app/api/v1/cms/blacklist/**` |
| AI generation | Gemini 2.5 Flash article generation with enforced JSON schema | `src/lib/gemini.ts`, `src/app/api/v1/cms/ai/**` |
| Email | Resend client, batch mailer, welcome + insider digest emails | `src/lib/email/*.ts`, `src/lib/insider/*.ts` |
| Analytics | GA4/GSC OAuth + report fetch, cached in `InsightsCacheModel` | `src/lib/google/*.ts` |
| Image storage | Cloudflare R2 upload/delete via S3 API | `src/lib/storage.ts` |
| Data models | 11 Mongoose models, hot-reload-safe registration | `src/lib/db/models.ts` |
| DB connection | Cached mongoose connection, DNS workaround, retry | `src/lib/db/mongodb.ts` |

## Pattern Overview

**Overall:** Next.js App Router full-stack monolith — React Server Components for public pages, client components for admin, Route Handlers as a versioned REST API (`/api/v1`), Mongoose as the only persistence. No separate backend service; the Next server is the backend.

**Key Characteristics:**
- **Everything renders dynamically.** The root layout awaits `headers()` (`src/app/layout.tsx:101`), opting the whole app out of static prerendering. `src/app/article/[slug]/page.tsx:23` sets `revalidate = 0`; sitemap/robots set `force-dynamic`. There is no ISR/SSG anywhere.
- **Data-level caching instead of page caching:** `unstable_cache` with tag `public-articles` and 60s revalidate wraps homepage article queries (`src/lib/homepage-articles.ts:87-91`); CMS writes call `revalidateTag('public-articles', 'max')` via `src/lib/cache-revalidation.ts`.
- **Server-preload + client-fetch hybrid:** pages pass initial data into client islands, which then refetch via `/api/v1/public/*` for search/pagination (`src/app/page.tsx` → `src/app/news-client.tsx`; `src/app/collection-client.tsx`).
- **Route-handler-as-DAO:** no repository/service split; route handlers call Mongoose models directly through `src/lib` helpers.
- **Bilingual codebase:** Vietnamese comments and some Vietnamese user-facing copy inside API handlers; site content itself is English.

## Layers

**Presentation (public RSC pages):**
- Purpose: SEO-complete article/category/collection pages with structured data
- Location: `src/app/*.tsx`, `src/app/article/[slug]`, `src/app/category/[slug]`
- Contains: async Server Components, `generateMetadata`, JSON-LD scripts
- Depends on: `src/lib/db`, `src/lib/seo`, `src/lib/sanitize`, `src/components/*`
- Used by: site visitors, crawlers

**Presentation (client islands):**
- Purpose: interactivity (tabs, search, admin CRUD, editor)
- Location: `src/app/news-client.tsx`, `src/app/collection-client.tsx`, `src/app/admin/**`, `src/components/admin/**`
- Depends on: fetch to `/api/v1/*`, `lucide-react`, Tiptap (admin only)

**API layer:**
- Purpose: REST endpoints, versioned under `/api/v1`
- Location: `src/app/api/v1/**/route.ts`
- Contains: `GET`/`POST`/`PUT`/`DELETE`/`PATCH` handlers returning `NextResponse.json({ status: 'success'|'error', ... })`
- Depends on: `src/lib/auth` (Bearer JWT via `getAuthUser`), `src/lib/db`, `src/lib/cache-revalidation`
- Used by: client islands, admin CMS, external cron, Resend webhooks

**Service layer:**
- Location: `src/lib` (flat modules plus `db/`, `email/`, `insider/`, `google/` subdirs)
- Contains: auth, SEO, sanitization, blacklist, rate limiting, Gemini generation, R2 storage, email, digest logic, Google insights
- Used by: route handlers and RSC pages

**Data layer:**
- Location: `src/lib/db/mongodb.ts` (connection), `src/lib/db/models.ts` (schemas), `src/lib/db/seed-mongodb.ts` (seed)
- Contains: 11 Mongoose models with snake_case DB fields / camelCase API mapping done manually in handlers
- Used by: every layer above

## Data Flow

### Primary Read Path (public article page)

1. Request passes `src/proxy.ts:9` — CSP nonce generated, `x-nonce` header attached
2. Root layout reads settings + nonce (`src/app/layout.tsx:101-107`)
3. `generateMetadata` fetches article + settings (`src/app/article/[slug]/page.tsx:34-66`)
4. Page component fetches article with populated author/category/placements, increments `view_count` and saves (`src/app/article/[slug]/page.tsx:70-81`)
5. Related + latest articles fetched in parallel (`src/app/article/[slug]/page.tsx:111-119`)
6. HTML sanitized before render (`sanitizeArticleContent`, `src/lib/sanitize.ts`) and returned as RSC payload

### Homepage Path (cached)

1. `src/app/page.tsx:22` calls `getHomepageArticles(q)` (`src/lib/homepage-articles.ts:93`)
2. Empty query → `unstable_cache`-wrapped loader, tag `public-articles`, 60s revalidate; with `q` → uncached live query
3. Client island `src/app/news-client.tsx` handles subsequent interaction via `GET /api/v1/public/articles` (`src/app/api/v1/public/articles/route.ts`)

### Affiliate Click Path (monetization)

1. CTA components build `/api/v1/public/tracking/redirect?article_id=..&affiliate_link_id=..` (e.g. `src/app/article/[slug]/page.tsx:251`)
2. Handler logs `ClickLog` and `$inc`s `click_count`, then checks `checkUrlAgainstBlacklist` (`src/app/api/v1/public/tracking/redirect/route.ts:34-47`)
3. Blacklisted → inline Vietnamese warning HTML; healthy → 302 to `base_url` with `appendSubId(article.slug)` (`src/lib/utils.ts`)

### Admin Write Path (content publishing)

1. Admin client (`src/app/admin/page.tsx`, `src/app/admin/articles/create/page.tsx`) authenticates via `POST /api/v1/auth/login` (rate-limited, `src/lib/rateLimit.ts`), stores JWT
2. Writes go to `/api/v1/cms/articles` etc. with `Authorization: Bearer`; `getAuthUser` (`src/lib/auth.ts:48`) enforces identity; role filter isolates non-admin data (`src/app/api/v1/cms/articles/route.ts:18`)
3. Article create/update calls `revalidatePublicArticles()` to bust the public cache tag
4. AI generation: `/api/v1/cms/ai/generate-article` → `generateSeoGeoArticleWithGemini` (`src/lib/gemini.ts`) returns enforced-JSON `{ seo_meta, geo_data, content_html }`; article status cycles `generating → draft/published/failed`

### Newsletter / Insider Path

1. `LeadCapture` (`src/components/LeadCapture.tsx`) → `POST /api/v1/public/subscribe` → pending subscriber + double opt-in token (`src/lib/insider/tokens.ts`)
2. Confirm/unsubscribe via `/api/v1/public/insider/confirm|unsubscribe`; result pages `src/app/insider/success|failed`
3. Cron: `GET /api/v1/cron/insider-digest` guarded by `INSIDER_CRON_SECRET` (timing-safe compare, `src/app/api/v1/cron/insider-digest/route.ts:20-29`) builds GMT+12 period digest (`src/lib/insider/digest.ts`) and batch-sends via Resend (`src/lib/email/mailer.ts`)
4. Resend webhook `POST /api/v1/webhooks/resend` verifies svix signature and records `email.opened` (`src/app/api/v1/webhooks/resend/route.ts:31`)

**State Management:**
- No global client state library; each client island owns local `useState`/`useEffect`
- Server state lives in MongoDB; cache state in `unstable_cache` tags
- Global mutable module state: mongoose connection cache on `global.mongooseCache` (`src/lib/db/mongodb.ts:41-49`), in-memory JWT blacklist and login rate-limit maps (`src/lib/tokenBlacklist.ts`, `src/lib/rateLimit.ts`) — reset on server restart

## Key Abstractions

**Mongoose Models (single source of truth for content):**
- Purpose: all site content + CMS state; snake_case persisted fields
- Examples: `src/lib/db/models.ts` (`ArticleModel`, `AffiliateLinkModel`, `SettingModel`, `BlacklistModel`, `SubscriberModel`, `InsightsCacheModel`, ...)
- Pattern: interface + schema + hot-reload-safe `mongoose.models.X || mongoose.model<X>(...)` registration (`src/lib/db/models.ts:314-324`)

**Settings singleton (DB-driven site config):**
- Purpose: one `SettingModel` document drives site title, SEO defaults, theme colors, custom CSS, geo meta, GA id, JSON-LD
- Examples: consumed in `src/app/layout.tsx`, `src/app/article/[slug]/page.tsx`, `src/app/sitemap.ts`
- Pattern: read-one-doc-and-fallback-to-constants (`src/lib/seo.ts`)

**Metadata factory:**
- Purpose: consistent SEO metadata/canonicals/OG/Twitter
- Examples: `createPageMetadata` (`src/lib/seo.ts:39`), `generateMetadata` per dynamic page, `serializeJsonLd`/`sanitizeStoredJsonLd` XSS-safe JSON-LD
- Pattern: normalize-then-compose; every consumer falls back to constants on failure

**Auth guard function (not middleware):**
- Purpose: per-route JWT verification
- Examples: `getAuthUser(req)` called at the top of every `/api/v1/cms/*` handler (`src/lib/auth.ts:48-55`)
- Pattern: hand-rolled Bearer check + role branching; no NextAuth/session cookies

**Cache tag + revalidation helper:**
- Examples: `PUBLIC_ARTICLES_CACHE_TAG` / `revalidatePublicArticles()` (`src/lib/cache-revalidation.ts`)
- Pattern: writers revalidate; readers use `unstable_cache` with the same tag

## Entry Points

**Public site routes** (`src/app`):
- `/` — homepage (server-preloaded + client tabs) — `src/app/page.tsx`
- `/article/[slug]` — article detail, dynamic per request — `src/app/article/[slug]/page.tsx`
- `/latest`, `/hottest`, `/editorial-picks`, `/affiliates`, `/category/[slug]` — all delegate to `src/app/collection-client.tsx` with a `kind` prop
- `/insider/success|failed` — double opt-in results — `src/app/insider/*`
- `/sitemap.xml`, `/robots.txt` — `force-dynamic`, DB-backed — `src/app/sitemap.ts`, `src/app/robots.ts`
- `/bai-viet/[slug]` — legacy redirect to `/article/[slug]` — `src/app/bai-viet/[slug]/page.tsx`

**Admin routes** (`src/app/admin`):
- `/admin/login`, `/admin`, `/admin/articles/create`, `/admin/articles/edit/[id]` — all `'use client'`; `src/app/admin/layout.tsx` sets `robots: noindex`

**API routes** (`src/app/api/v1`):
- `auth/`: `login`, `logout`, `me`
- `public/`: `articles` (list + `[slug]` + `by-category`), `affiliates`, `categories`, `top-picks`, `settings`, `subscribe`, `insider` (+ `confirm`, `unsubscribe`), `tracking/click`, `tracking/redirect`
- `cms/`: `articles` (+ `[id]`), `categories` (+ `[id]`), `sub-categories` (+ `[id]`), `affiliate-links` (+ `[id]`), `users` (+ `[id]`), `subscribers` (+ `[id]`), `click-logs`, `dashboard`, `insights`, `settings`, `upload`, `blacklist` (+ `check`, `import`, `import-sheet-url`, `quick-blacklist`), `insider/send-now`, `ai/generate-article`, `ai/generate-takeaways`, `dashboard`
- `cron/insider-digest` — external scheduler hits this (Bearer secret)
- `webhooks/resend` — inbound svix-verified webhook
- `seed` — unauthenticated DB seeding endpoint (`src/app/api/v1/seed/route.ts`)

## Architectural Constraints

- **Threading/runtime:** Node.js runtime only; single PM2 fork instance, `max_memory_restart: 600M` (`ecosystem.config.js`). Cron and digest routes explicitly pin `export const runtime = 'nodejs'`.
- **Dynamic-rendering lock-in:** the `headers()` call in `src/app/layout.tsx:101` is deliberate (CSP nonce pickup) and forces every route to render per request. Do not remove it without redesigning the nonce pipeline (`src/proxy.ts`).
- **Global state:** `global.mongooseCache` (`src/lib/db/mongodb.ts`), in-memory token blacklist (`src/lib/tokenBlacklist.ts`), in-memory login rate limiter (`src/lib/rateLimit.ts`) — all reset on restart; safe with the single PM2 fork, not with multi-instance scaling.
- **Build/deploy split:** `output: 'standalone'` (next.config.ts:17) — CI builds (`.github/workflows/deploy.yml`, triggers on `feature/namdt25-develop`), tar-ships the bundle to the VPS; the VPS never runs `next build` (4GB RAM) and only `pm2 start`s `app/server.js`.
- **Manual env parsing:** `getMongoUri` (`src/lib/db/mongodb.ts:11-34`) and `getJwtSecret` (`src/lib/auth.ts:9-14`) lazily read env/.env.local/mongodb.env at call time so module imports (build-time route analysis, tests) don't throw.
- **DNS workaround:** `mongodb.ts` pins Google/Cloudflare DNS resolvers and ipv4first for Atlas SRV lookups (`src/lib/db/mongodb.ts:6-9, 75-79`).
- **Circular imports:** none detected; dependency flow is strictly pages/API → lib → db.
- **Model hot-reload guard:** every model registration must keep the `mongoose.models.X ||` pattern or Next dev reloads crash (`src/lib/db/models.ts:313-324`).
- **CSP strictness:** inline scripts require the nonce from proxy; any new third-party script tag must receive `nonce={nonce}` (see GA injection, `src/app/layout.tsx:151-170`).

## Anti-Patterns

### Monolithic admin component

**What happens:** the entire CMS (dashboard, articles, categories, links, users, blacklist, settings, insider mail, uploads) lives in one ~3,900-line client file.
**Why it's wrong:** `src/app/admin/page.tsx` is unmodifiable in practice — every tab shares one state scope, every edit risks regressions elsewhere, and the file dominates the bundle.
**Do this instead:** split each tab into its own route (`src/app/admin/<section>/page.tsx`) with shared hooks in `src/components/admin/`; follow the pattern already used by `src/app/admin/articles/create/page.tsx` (828 lines, still one concern).

### Duplicate legacy schema file

**What happens:** `src/lib/db/schema.ts` re-declares the same models in camelCase; the active code uses `src/lib/db/models.ts` (snake_case).
**Why it's wrong:** two schema definitions for one database invite editing the wrong file; `src/lib/db/index.ts` re-exports only `models.ts`.
**Do this instead:** treat `src/lib/db/models.ts` as canonical; do not import from `src/lib/db/schema.ts`, `seed.ts`, or `fix-malformed-links.ts` in new code.

### DB writes during RSC render

**What happens:** `src/app/article/[slug]/page.tsx:80-81` mutates and saves `view_count` inside the page render.
**Why it's wrong:** every render (including metadata generation and prefetch-triggered renders) pays a Mongo write; concurrent renders race on the counter; caching this page in the future would freeze views.
**Do this instead:** move view counting to a fire-and-forget endpoint or `after()` callback; keep the RSC read-only.

### Dead dependencies and dead components

**What happens:** `drizzle-orm`, `pg`, `@types/pg` are declared in `package.json` but have zero imports in `src/`; `sqlite.db`, `sqlite.db-shm`, `sqlite.db-wal` sit at the repo root. Components `PublicNav`, `Header`, `Footer`, `BreakingNewsTicker`, `ComparisonTable`, `ArticleGrid`, `SocialShare.module.css` consumers exist but `PublicNav`/`Header`/`Footer`/`BreakingNewsTicker`/`ComparisonTable`/`ArticleGrid` are imported nowhere (verified by grep).
**Why it's wrong:** misleading stack surface (a reader may assume Postgres/Drizzle is live) and bundle/typecheck noise.
**Do this instead:** remove the unused packages and root sqlite files; delete or wire up the orphaned components after confirming with `grep`.

### Silent catch blocks in layout

**What happens:** `src/app/layout.tsx:107` wraps the settings fetch in `try { } catch { }` with no logging.
**Why it's wrong:** a down database renders the site with default branding and no signal anywhere.
**Do this instead:** at minimum `console.error` in the catch; route handlers already follow the log-and-return-500 pattern (`src/app/api/v1/public/articles/route.ts:92-94`).

## Error Handling

**Strategy:** per-handler try/catch returning a uniform JSON envelope; graceful fallbacks in RSC metadata.

**Patterns:**
- Route handlers: `try/catch` → `NextResponse.json({ status: 'error', message }, { status: 500 })` with `console.error` (e.g. `src/app/api/v1/public/articles/route.ts:91-94`)
- Auth guard: 401 short-circuit before any DB work (`src/app/api/v1/cms/articles/route.ts:11-14`)
- Redirect handler: every failure path falls back to `/` (`src/app/api/v1/public/tracking/redirect/route.ts:105-108`)
- Layout/metadata: DB failure → constant defaults from `src/lib/seo.ts` (`src/app/layout.tsx:60-88`)
- Missing data: `notFound()` for unknown slugs (`src/app/article/[slug]/page.tsx:78`)
- Test-aware revalidation: `revalidatePublicArticles` swallows the "static generation store missing" error only under vitest (`src/lib/cache-revalidation.ts:5-11`)

## Cross-Cutting Concerns

**Logging:** bare `console.error`/`console.log`; no structured logger, no external error tracking.

**Validation:** manual checks in handlers (regex, `mongoose.isValidObjectId`, `parseInt` clamps) + Mongoose schema enums/required; sanitization of stored HTML via `src/lib/sanitize.ts` (`sanitize-html`), URL/locale normalization via `src/lib/seo.ts`.

**Authentication:** custom JWT Bearer tokens (`src/lib/auth.ts`), 24h expiry, bcryptjs password hashes, in-memory blacklist on logout, in-memory login rate limiting; role hierarchy `admin > editor > author` enforced inside handlers (data isolation at `src/app/api/v1/cms/articles/route.ts:18`), not middleware.

**Security headers:** static headers in `next.config.ts:5-11` (X-Frame-Options DENY, nosniff, HSTS, Permissions-Policy); per-request CSP with nonce in `src/proxy.ts`; admin area excluded from indexing via `src/app/admin/layout.tsx`.

**Caching:** data-level `unstable_cache` (`src/lib/homepage-articles.ts`) + `Cache-Control: no-store` on hot API responses (`src/app/api/v1/public/articles/route.ts:89`) + R2 objects with 1-year immutable cache headers (`src/lib/storage.ts:46`).

---

*Architecture analysis: 2026-09-10*
