# Technology Stack

**Analysis Date:** 2026-09-10

## Languages

**Primary:**
- TypeScript 5.x (strict mode, target ES2017, bundler module resolution) - entire `src/` codebase (app routes, API routes, libs, components)
- JavaScript - config only (`ecosystem.config.js`, legacy root prototypes `affiliate_platform_ui.tsx` / `giaodienuser.tsx` excluded from `tsconfig.json`)

**Secondary:**
- None. No Python, Go, or other backend languages.

## Runtime

**Environment:**
- Node.js 22 LTS (installed in CI via `.github/workflows/deploy.yml` `node-version: 22`; Next.js 16 requires Node ≥ 20.9)
- No `.nvmrc` present; DEPLOY.md instructs Node.js 22 LTS on the VPS

**Package Manager:**
- npm (scripts use `npm ci` in CI; `package-lock.json` present and committed)
- No `engines` field in `package.json`

## Frameworks

**Core:**
- Next.js **16.2.12** (App Router) — full-stack framework. IMPORTANT: this is NOT the Next.js from training data — see `AGENTS.md` and bundled docs at `node_modules/next/dist/docs/`. Version-16 specifics verified in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`:
  - **Turbopack is the default** for `next dev` AND `next build` (no `--turbopack` flag needed; scripts in `package.json` are plain `next dev` / `next build`)
  - **`proxy.ts` replaces `middleware.ts`** — request middleware lives at `src/proxy.ts` exporting `proxy()` (CSP nonce injection)
  - `next lint` is gone — linting runs the ESLint CLI directly (`"lint": "eslint"`)
  - `output: 'standalone'` in `next.config.ts` produces a self-contained server bundle
- React **19.2.4** + React DOM 19.2.4 (App Router server components throughout)

**Testing:**
- Vitest **4.1.10** — unit/integration tests (`vitest run` / `vitest` watch)
- mongodb-memory-server **11.2.0** — in-memory MongoDB for tests (`tests/setup.ts`)
- tsx **4.23.5** — running TS scripts (`scripts/`; the `npm run seed` script was removed with the seed surface in Phase 01)

**Build/Dev:**
- Turbopack (built into Next.js 16, no separate config)
- Tailwind CSS **4.3.3** via `@tailwindcss/postcss` (PostCSS plugin, no `tailwind.config` file) + `@tailwindcss/typography`
- ESLint 9 (flat config) + `eslint-config-next` 16.2.12 (`core-web-vitals` + `typescript` presets) — `eslint.config.mjs`
- PM2 (production process manager on VPS) — `ecosystem.config.js`

## Key Dependencies

**Critical:**
- `mongoose` **9.9.1** (with `mongodb` 7.5.0 driver) — ALL persistence. Models at `src/lib/db/models.ts`, schemas at `src/lib/db/schema.ts`, connection at `src/lib/db/mongodb.ts`. MongoDB Atlas in production, MongoMemoryServer in tests.
- `next` 16.2.12 — routing, SSR/ISR, API routes, metadata/sitemap/robots, images, redirects/headers
- `resend` **6.25.0** — transactional + batch email (`src/lib/email/resend.ts`); webhook receiver verified with `svix` 2.0.0 (`src/app/api/v1/webhooks/resend/route.ts`)
- `googleapis` **178.0.0** — GA4 Data API (`src/lib/google/ga4.ts`) and Search Console API (`src/lib/google/gsc.ts`) with JWT service-account auth (`src/lib/google/auth.ts`)
- `@aws-sdk/client-s3` **3.1107.0** — Cloudflare R2 image upload/delete (`src/lib/storage.ts`), S3-compatible endpoint
- `bcryptjs` **3.0.3** + `jsonwebtoken` **9.0.3** — custom auth (password hashing, JWT 24h tokens) in `src/lib/auth.ts`
- `@tiptap/*` **3.30.1** (react, starter-kit, suggestion, extension-image/link/table/placeholder/character-count, pm) — CMS rich text editor (`src/components/admin/RichTextEditor.tsx`, `src/components/admin/editor/`)
- `sanitize-html` **2.17.6** — HTML sanitization of AI/article content (`src/lib/sanitizer.ts`, `src/lib/sanitize.ts`)

**UI/Utility:**
- `lucide-react` 1.28.0 — icons
- `clsx` + `tailwind-merge` — `cn()` helper in `src/lib/utils.ts`
- `@floating-ui/dom` 1.8.0 — popover positioning (editor slash commands)

**AI / Scraping:**
- Gemini called via **raw REST** (`fetch` to `generativelanguage.googleapis.com`) in `src/lib/gemini.ts` — model `gemini-2.5-flash`, JSON-schema-enforced responses
- Jina AI Reader via plain `fetch` to `https://r.jina.ai/{url}` in `src/lib/scraper.ts` (no SDK)

**Stale / unused dependencies (in `package.json` but never imported in `src/` or `tests/`):**
- `drizzle-orm`, `pg`, `@types/pg` — no imports anywhere; leftover from an abandoned SQL setup (root `sqlite.db*` files are leftovers of this)
- `@google/genai` 2.15.0 — installed but NOT imported; `src/lib/gemini.ts` uses raw REST instead

## Configuration

**Environment:**
- `.env.local` (gitignored via `.gitignore` `.env*`) + `mongodb.env` (gitignored) at repo root — existence only, contents never committed
- Env vars are read lazily at call time (not import time) — pattern established in `src/lib/auth.ts` (`getJwtSecret()`) and `src/lib/db/mongodb.ts` (`getMongoUri()`), so importing modules never throws for missing env
- `src/lib/db/mongodb.ts` has a fallback that manually parses `MONGODB_URI` out of `.env.local` / `mongodb.env` if `process.env` is unset
- Full env var inventory: see INTEGRATIONS.md

**Build:**
- `next.config.ts` — standalone output, security headers (X-Frame-Options DENY, HSTS, etc.), image remotePatterns (R2 media domain, `*.r2.dev`, Unsplash), legacy redirect `/figma-tech-finance-news/*` → `/`
- `src/proxy.ts` — per-request CSP with nonce (static CSP in `next.config.ts` headers would block Next.js inline hydration scripts)
- `tsconfig.json` — strict, path alias `@/*` → `./src/*`, `noEmit`, Next plugin
- `postcss.config.mjs` — Tailwind 4 PostCSS plugin only
- `vitest.config.mts` — node environment, `tests/setup.ts`, `fileParallelism: false` (one MongoMemoryServer per run), 20s test timeout
- `eslint.config.mjs` — flat config, next core-web-vitals + typescript
- `ecosystem.config.js` — PM2 config for the VPS (fork mode, 600MB memory restart cap, points at standalone `app/server.js`)

**SEO-specific config (affiliate site):**
- No third-party SEO library (no next-seo) — native Next.js Metadata API in `src/app/layout.tsx` (`generateMetadata` reads site settings from MongoDB)
- Programmatic `sitemap.ts` and `robots.ts` App Router conventions at `src/app/sitemap.ts` / `src/app/robots.ts` (both dynamic, DB-driven)
- SEO/GEO helpers in `src/lib/seo.ts` (defaults: site `https://aidealsuk.com`, OG image, canonical/hreflang normalization)
- GA4 gtag snippet + `google-site-verification` meta + custom JSON-LD injected in `src/app/layout.tsx` from MongoDB `Setting` document

## Platform Requirements

**Development:**
- Node.js ≥ 20.9 (22 recommended), npm
- MongoDB reachable via `MONGODB_URI` (Atlas or local); optional: R2, Resend, Google service account, Gemini key for full feature set
- `npm run dev` (Turbopack), `npm run test` (Vitest + in-memory Mongo), `npm run lint` (ESLint CLI)

**Production:**
- Ubuntu VPS (4GB RAM) — per `DEPLOY.md`: **no Docker**; Node.js 22 + **PM2** (`ecosystem.config.js`) + **Nginx** reverse proxy + Certbot HTTPS
- **Build happens in GitHub Actions CI** (runner has RAM); the VPS only unpacks the `output: 'standalone'` bundle (`server.js` + traced node_modules) and `pm2 restart` — it never runs `next build`
- MongoDB stays in Atlas (cloud); VPS runs only the Next.js server
- Deployed on push to branch `feature/namdt25-develop` via `.github/workflows/deploy.yml`
- Legacy `render.txt` references an old Render deployment hostname (superseded by VPS deploy)

---

*Stack analysis: 2026-09-10*
