# Codebase Structure

**Analysis Date:** 2026-09-10

## Directory Layout

```text
[project-root]/
├── .github/workflows/    # deploy.yml — CI build + VPS deploy (branch feature/namdt25-develop)
├── .agents/skills/       # project skills: seo-audit, improve-ui
├── .claude/              # agent config
├── .planning/            # GSD planning docs (codebase/ holds STACK, INTEGRATIONS, ARCH, STRUCTURE)
├── design-plans/         # UI design notes (e.g. social-floating-and-footer-buttons.md)
├── public/               # static assets (favicon, images)
├── scripts/              # tsx maintenance scripts (seed, admin bootstrap, CTA injection)
├── src/
│   ├── app/              # Next.js 16 App Router — pages, layouts, API route handlers
│   │   ├── api/v1/       # REST API: public/ · cms/ · auth/ · cron/ · webhooks/ (seed/ deleted in Phase 01 SEC-01)
│   │   ├── admin/        # client-rendered CMS (page.tsx is one ~3.9k-line file)
│   │   ├── article/[slug]/   # article detail (RSC) + article.module.css
│   │   ├── bai-viet/[slug]/  # legacy redirect to /article/[slug]
│   │   ├── blocked/        # blacklist warning page (RSC, DB-backed via ClickLog ref, noindex)
│   │   ├── category/[slug]/  # category collection page
│   │   ├── insider/      # double opt-in result pages (success/failed)
│   │   ├── latest|hottest|editorial-picks|affiliates/  # thin collection pages
│   │   ├── layout.tsx    # root layout (settings-driven metadata, theme, GA, CSP nonce)
│   │   ├── page.tsx      # homepage (RSC) + news-client.tsx (client island) + page.module.css
│   │   ├── collection-client.tsx  # shared client island for all collection pages
│   │   ├── sitemap.ts · robots.ts # force-dynamic, DB-backed SEO endpoints
│   │   └── globals.css   # Tailwind v4 entry
│   ├── components/       # public-facing React components (flat, PascalCase)
│   │   └── admin/        # admin-only components (RichTextEditor, editor/ subfolder)
│   ├── lib/              # server-side services and utilities
│   │   ├── db/           # mongodb.ts (connection) · models.ts (11 Mongoose models) — src/lib/db seeders deleted in Phase 01 (seeding lives in scripts/)
│   │   ├── email/        # resend.ts · mailer.ts · welcome-email.ts
│   │   ├── google/       # auth.ts · ga4.ts · gsc.ts · insights.ts
│   │   ├── insider/      # tokens.ts · subscribers.ts · digest.ts
│   │   └── (flat)        # auth.ts · seo.ts · sanitize.ts · blacklist.ts · gemini.ts · storage.ts · rateLimit.ts · cache-revalidation.ts · homepage-articles.ts · utils.ts · brand.ts · scraper.ts · sanitizer.ts · tokenBlacklist.ts
│   └── proxy.ts          # Next 16 proxy (middleware replacement) — per-request CSP nonce
├── tests/                # vitest suite (mirrors src: api/ and lib/)
├── ecosystem.config.js   # PM2 definition for the VPS (runs app/server.js)
├── next.config.ts        # standalone output, security headers, R2 image domains, redirects
├── tsconfig.json         # strict TS, path alias @/* → ./src/*
├── vitest.config.mts     # vitest config
├── .env.local            # env config (exists — never commit/read contents)
├── mongodb.env           # optional MONGODB_URI fallback file (exists — treat as secret)
├── sqlite.db (+ -shm/-wal)  # legacy SQLite leftovers, unused (active DB is MongoDB)
└── *.md / *.tsx at root  # specs, tasklists, design mockups (see below)
```

## Directory Purposes

**`src/app` (App Router):**
- Purpose: all routes — public pages, admin CMS, and the `/api/v1` REST surface
- Contains: RSC pages with `generateMetadata`, shared client islands, one `route.ts` per REST endpoint
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/news-client.tsx`, `src/app/collection-client.tsx`, `src/app/article/[slug]/page.tsx`, `src/app/admin/page.tsx`

**`src/app/api/v1`:**
- Purpose: versioned backend. `public/` = unauthenticated reads + tracking + subscribe; `cms/` = JWT-guarded CRUD (role-isolated); `auth/` = login/logout/me; `cron/` = secret-guarded scheduled jobs; `webhooks/` = svix-verified Resend events. The old unauthenticated `seed/` route was deleted in Phase 01 (SEC-01) — re-adding a destructive seed path is blocked by `tests/api/security-regressions.test.ts`
- Naming: one `route.ts` per endpoint; dynamic segments use `[id]` / `[slug]`

**`src/components`:**
- Purpose: shared UI. Public site components are flat PascalCase files; admin-only pieces under `components/admin/` (Tiptap editor + `editor/` helpers: slashCommand, searchAndReplace, alignableImage)
- Key files: `src/components/admin/RichTextEditor.tsx`, `EditorialHeader.tsx`, `EditorialFooter.tsx`, `AffiliateCtaBlock.tsx`, `LeadCapture.tsx`, `TopPicksWidget.tsx`
- Note: `PublicNav.tsx`, `Header.tsx`, `Footer.tsx`, `BreakingNewsTicker.tsx`, `ComparisonTable.tsx`, `ArticleGrid.tsx` are imported nowhere (legacy orphans)

**`src/lib`:**
- Purpose: everything that is not UI — the de-facto service layer
- Key files: `src/lib/auth.ts` (JWT/bcrypt), `src/lib/seo.ts` (metadata/JSON-LD), `src/lib/sanitize.ts` (HTML sanitizer), `src/lib/gemini.ts` (AI generation), `src/lib/storage.ts` (R2), `src/lib/blacklist.ts`, `src/lib/homepage-articles.ts` (cached queries), `src/lib/cache-revalidation.ts`

**`src/lib/db`:**
- Purpose: Mongoose connection + models
- Key files: `mongodb.ts` (cached singleton connection), `models.ts` (canonical schemas — snake_case DB fields)
- Deleted in Phase 01 (SEC-01): `seed-mongodb.ts` (was used by the removed `npm run seed` script), `seed.ts`
- Legacy, do not use: `schema.ts` (camelCase duplicate), `fix-malformed-links.ts`

**`tests/`:**
- Purpose: vitest unit + route-handler tests, folder structure mirrors `src/lib` and `src/app/api`
- Key files: `tests/setup.ts`, `tests/api/auth-login.test.ts`, `tests/api/tracking-redirect.test.ts`, `tests/lib/sanitize.test.ts`, `tests/api/security-regressions.test.ts` (SEC-01/SEC-02 permanent regression gate — plan 06 extends it)

**`scripts/`:**
- Purpose: one-off maintenance scripts run with `tsx` (admin bootstrap + password reset via `create-admin.ts`/`reset-admin.ts` — the ONLY admin recovery path per SEC-01/D-04, seeding affiliate links/reviews, CTA injection into articles)

**Root-level spec/mockup files (not app code):**
- `Spec_Website_Affiliate_V3.md`, `spec.md`, `specv2.md`, `requimentgg.md`, `seo_geo_article_creator_dashboard.md` — requirement/spec documents
- `GO_LIVE_TASKLIST.md`, `R2_IMAGE_STORAGE_TASKLIST.md`, `INSIDER_EMAIL_SETUP.md`, `DEPLOY.md` — operational guides
- `affiliate_platform_ui.tsx`, `giaodienuser.tsx`, `demogiaodien.html` — static design mockups; `affiliate_platform_ui.tsx` and `giaodienuser.tsx` are explicitly excluded from `tsconfig.json`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: root layout — loads `SettingModel`, injects theme/geo/JSON-LD/GA, reads CSP nonce
- `src/proxy.ts`: edge entry for every page request (CSP nonce; excludes `/api`, `_next/static`, `_next/image`, favicon)
- `src/app/page.tsx`: homepage
- `.next/standalone/server.js` (built): production server run by PM2 via `ecosystem.config.js`

**Configuration:**
- `next.config.ts`: `output: 'standalone'`, security headers, R2/Unsplash image remote patterns, legacy redirects
- `tsconfig.json`: `strict: true`, alias `@/*` → `./src/*`
- `eslint.config.mjs`: flat ESLint config (`eslint-config-next`)
- `vitest.config.mts`: test runner config
- `.github/workflows/deploy.yml`: build → test → package → scp → pm2 restart
- `.env.local` / `mongodb.env`: MONGODB_URI, JWT_SECRET, R2_*, RESEND_*, GEMINI/GOOGLE keys, INSIDER_CRON_SECRET (existence only — contents are secrets)

**Core Logic:**
- Data models: `src/lib/db/models.ts`
- Auth: `src/lib/auth.ts`, `src/lib/tokenBlacklist.ts`, `src/lib/rateLimit.ts`
- Monetization: `src/app/api/v1/public/tracking/redirect/route.ts`, `src/lib/blacklist.ts`, `src/components/AffiliateCtaBlock.tsx`, `EditorVerdict.tsx`, `StickyMobileBar.tsx`, `VerticalAffiliateSidebar.tsx`
- AI content: `src/lib/gemini.ts`, `src/app/api/v1/cms/ai/generate-article/route.ts`
- Newsletter: `src/lib/insider/*`, `src/lib/email/*`, `src/app/api/v1/cron/insider-digest/route.ts`
- Analytics: `src/lib/google/*` + `InsightsCacheModel` (`src/lib/db/models.ts:307`)

**Testing:**
- `tests/api/*.test.ts`: route-handler tests (auth, tracking, insider, article ownership) using `mongodb-memory-server`
- `tests/lib/*.test.ts`: pure-function tests (sanitize, insider tokens/digest)
- `tests/setup.ts`: shared vitest setup

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (`AffiliateCtaBlock.tsx`); co-located CSS Modules in `camelCase.module.css` (`article.module.css`, `result.module.css`)
- Client islands colocated with their page: `news-client.tsx`, `collection-client.tsx`, `InsiderResult.tsx`
- Lib modules: `kebab-case.ts` (`cache-revalidation.ts`, `homepage-articles.ts`) except domain folders (`db/`, `email/`, `google/`, `insider/`)
- Route handlers: always `route.ts` under segment folders; pages always `page.tsx`; layouts `layout.tsx`

**Directories:**
- URL segments are lowercase-kebab (`editorial-picks`, `bai-viet`), including Vietnamese-derived slugs
- Dynamic segments: `[slug]` for content, `[id]` for CMS resources
- API versioning by folder: `api/v1/<audience>/<resource>`

**Code identifiers:**
- DB fields: `snake_case` (`view_count`, `affiliate_link_id`); API/JSON responses: `camelCase` (`viewCount`) — conversion is manual inside handlers (`src/app/api/v1/public/articles/route.ts:51-75`)
- Mongoose interfaces: `I`-prefixed (`IArticle`), models: `XxxModel`

## Where to Add New Code

**New public page (SEO content):**
- Server page: `src/app/<segment>/page.tsx` — use `createPageMetadata` from `src/lib/seo.ts`, add `generateMetadata` for dynamic slugs, mirror the `src/app/category/[slug]/page.tsx` shape
- Interactivity: colocate a `*-client.tsx` island and pass server-fetched initial data as props (pattern: `src/app/page.tsx` → `src/app/news-client.tsx`)
- If it reuses article-grid UI, extend `src/app/collection-client.tsx` with a new `CollectionKind` instead of a new island

**New REST endpoint:**
- Path: `src/app/api/v1/<public|cms|cron|webhooks>/<resource>/route.ts`
- Follow the envelope `{ status: 'success'|'error', data?, message? }` (example: `src/app/api/v1/public/articles/route.ts`)
- CMS endpoints: call `getAuthUser(req)` first and return 401 before touching DB; branch on `user.role` for data isolation (`src/app/api/v1/cms/articles/route.ts:11-18`)
- If the endpoint mutates published articles, call `revalidatePublicArticles()` from `src/lib/cache-revalidation.ts`

**New DB entity:**
- Add interface + schema + hot-reload-safe registration to `src/lib/db/models.ts` (`mongoose.models.X || mongoose.model<X>(...)` — mandatory)
- Re-export through `src/lib/db/index.ts` if a shorthand alias is wanted
- Do NOT add to the legacy `src/lib/db/schema.ts`

**New component:**
- Public: `src/components/<PascalCase>.tsx` (flat); CSS Modules alongside as `<name>.module.css`
- Admin-only: `src/components/admin/` (editor primitives under `src/components/admin/editor/`)
- Any inline `<script>` in JSX needs the nonce from `headers()` (see GA injection in `src/app/layout.tsx:151-170`) or the CSP in `src/proxy.ts` will block it

**New service/utility:**
- Single concern: `src/lib/<kebab-case>.ts`
- Multi-file domain: `src/lib/<domain>/` (precedents: `src/lib/email/`, `src/lib/insider/`, `src/lib/google/`)
- Server-only data helpers must `import "server-only"` first (precedent: `src/lib/homepage-articles.ts:1`)

**New env var:**
- Read lazily inside a getter function that throws a descriptive error (pattern: `getMongoUri` in `src/lib/db/mongodb.ts:11`, `getJwtSecret` in `src/lib/auth.ts:9`) so imports/builds/tests don't explode without it; document in DEPLOY.md; add to VPS `.env.local` (kept outside the unpacked `app/` dir across deploys)

**Tests:**
- Unit: `tests/lib/<module>.test.ts`; route handler: `tests/api/<endpoint>.test.ts` (use `mongodb-memory-server`, see `tests/setup.ts`)

## Special Directories

**`public/`:**
- Purpose: static assets served verbatim (favicon, icons)
- Generated: No; Committed: Yes
- Note: uploaded content images do NOT live here — they go to Cloudflare R2 (`src/lib/storage.ts`) and render via `next/image` remote patterns in `next.config.ts:21-29` (`media.aidealsuk.com`, `*.r2.dev`, Unsplash)

**`.next/`:**
- Purpose: build output (dev logs + standalone bundle in CI)
- Generated: Yes; Committed: No

**`.planning/`:**
- Purpose: GSD planning artifacts (PROJECT/ROADMAP/codebase docs)
- Generated: Yes (by GSD tooling); Committed: Yes

**`design-plans/`, root `*.md`/mockup files:**
- Purpose: specs, tasklists, throwaway design mockups (`demogiaodien.html`, `affiliate_platform_ui.tsx`, `giaodienuser.tsx`)
- Generated: No; Committed: Yes; the two root `.tsx` mockups are excluded from TypeScript (`tsconfig.json:33`)

**Root `sqlite.db`, `sqlite.db-shm`, `sqlite.db-wal`:**
- Purpose: leftover local SQLite files from an abandoned persistence approach — the live database is MongoDB Atlas
- Generated: Yes (runtime); Committed: check `.gitignore` before touching; safe to exclude from any new work

---

*Structure analysis: 2026-09-10*
