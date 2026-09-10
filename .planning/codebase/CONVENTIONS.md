# Coding Conventions

**Analysis Date:** 2026-09-10

> Context note: `AGENTS.md` at the repo root warns this Next.js version (`16.2.12`) has breaking changes vs. common training data. Conventions below are reported **as observed in the installed version** — notably Promise-based `params`, `src/proxy.ts` instead of `middleware.ts`, and async `generateMetadata` with DB access.

## Naming Patterns

**Files:**
- React components: PascalCase — `src/components/ArticleGrid.tsx`, `src/components/SocialShare.tsx`
- Client-companion components colocated in `src/app/`: kebab-case with `-client` suffix — `src/app/news-client.tsx`, `src/app/collection-client.tsx`
- Lib modules: mixed camelCase and kebab-case — `src/lib/rateLimit.ts`, `src/lib/tokenBlacklist.ts` (camelCase) vs `src/lib/cache-revalidation.ts`, `src/lib/homepage-articles.ts` (kebab-case). **Prefer kebab-case for new lib files** (`insider/` subfolder also uses kebab-case: `src/lib/insider/tokens.ts`)
- App Router files: Next.js reserved names lowercase — `page.tsx`, `layout.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`
- Dynamic segments: `[param]` folders — `src/app/api/v1/cms/articles/[id]/route.ts`
- Tests: kebab-case `<feature>.test.ts` — `tests/api/auth-login.test.ts`, `tests/lib/sanitize.test.ts`
- CSS Modules colocated with component: `SocialShare.module.css`, `article.module.css`
- One intentional near-collision to be aware of: `src/lib/sanitize.ts` (XSS HTML sanitizer) vs `src/lib/sanitizer.ts` (post-processing affiliate-link checker). Do not merge them; they are distinct utilities.

**Functions:**
- camelCase named functions — `connectToDatabase()`, `getAuthUser()`, `sanitizeArticleContent()`, `buildInsiderDigestEmail()`
- Route handlers: exported HTTP verbs — `export async function GET/POST/PUT/DELETE`
- Boolean helpers read as predicates — `isValidObjectId()`, `isBlacklisted()`, `isEmailConfigured()`

**Variables:**
- camelCase for locals (`rateLimitKey`, `verdictPlacement`)
- Mongoose schema consts: PascalCase + `Schema` suffix — `UserSchema`, `AffiliateLinkSchema` (`src/lib/db/models.ts`)
- Model exports: PascalCase + `Model` suffix — `UserModel`, `ArticleModel`, `ClickLogModel`

**Types:**
- Interfaces: `I`-prefixed for Mongoose documents (`IUser`, `ICategory`, `IAffiliateLink`), plain PascalCase for props/domain types (`SocialShareProps`, `AuthPayload`, `ArticlePageProps`)
- Prop interfaces declared directly above the component (`src/components/SocialShare.tsx:7-9`)

**Data field casing (important, inconsistent by layer):**
- MongoDB/Mongoose fields: snake_case — `password_hash`, `created_at`, `view_count`, `affiliate_link_id`
- API JSON responses: mostly camelCase after explicit mapping in handlers — `authorId`, `viewCount`, `metaTitle` (`src/app/api/v1/cms/articles/[id]/route.ts:39-65`); some endpoints pass fields through as-is. **When adding a new endpoint, map Mongoose snake_case fields to camelCase in the response.**

## Code Style

**Formatting:**
- No Prettier config; formatting is editor/enforced-by-convention only
- 2-space indentation, semicolons, double or single quotes both present (single quotes dominate in `src/lib/` and API routes; double quotes in `src/app/layout.tsx`, `src/lib/utils.ts`). **Prefer single quotes for new code** (majority style)
- TypeScript `strict: true` (`tsconfig.json`); `noEmit`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`
- Path alias: `@/*` → `./src/*` (`tsconfig.json:21-23`)

**Linting:**
- ESLint 9 flat config: `eslint.config.mjs`
- Presets: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` via `defineConfig`
- `globalIgnores`: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run with `npm run lint` (script is plain `eslint`)
- Occasional targeted disables exist, e.g. `// eslint-disable-next-line no-var` for the global Mongoose cache in `src/lib/db/mongodb.ts:42` — use sparingly and only with a comment

## Import Organization

**Order (observed consistently, e.g. `src/app/article/[slug]/page.tsx:1-21`):**
1. Framework/type imports (`import type { Metadata } from 'next'`, `next/link`, `next/navigation`, react)
2. Third-party packages (`lucide-react`, `mongoose`)
3. Internal modules via `@/` alias — lib first, then components (`@/lib/db/models`, `@/components/AffiliateCtaBlock`)
4. Colocated CSS modules last (`styles from './article.module.css'`)

**Path Aliases:**
- `@/*` → `src/*` (works in app code and Vitest via `resolve: { tsconfigPaths: true }` in `vitest.config.mts`)
- Lib-to-lib intra-folder imports use relative paths (`./tokenBlacklist` in `src/lib/auth.ts:3`); prefer `@/` everywhere else

## Framework Conventions (Next.js App Router — as installed, v16.2.12)

**Server vs Client Components:**
- Default is Server Components. Pages that read MongoDB do so directly in the server component (`src/app/article/[slug]/page.tsx:68-119`, `src/app/layout.tsx:91-118`)
- `'use client'` appears on 29 files — all interactive components in `src/components/`, admin pages (`src/app/admin/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/articles/**`), and client companions (`src/app/news-client.tsx`, `src/app/collection-client.tsx`)
- Pattern for data-heavy public pages: server `page.tsx` fetches data → renders presentational components; when heavy interactivity is needed, a sibling `*-client.tsx` holds the client tree (see `src/app/page.tsx` + `src/app/news-client.tsx`)
- Admin pages are fully client-side and call the REST API (`/api/v1/cms/...`) with Bearer tokens; public pages read the DB directly on the server

**Async request APIs (do NOT use the old sync style):**
- Page props: `interface ArticlePageProps { params: Promise<{ slug: string }> }` then `const { slug } = await params` (`src/app/article/[slug]/page.tsx:25,35,69`)
- Route handlers: `{ params }: { params: Promise<{ id: string }> }` then `await params` (`src/app/api/v1/cms/articles/[id]/route.ts:12,20`)
- Headers: `const nonce = (await headers()).get('x-nonce')` (`src/app/layout.tsx:101`)

**Metadata generation:**
- Async `generateMetadata(): Promise<Metadata>` reading settings/articles from the DB (`src/app/layout.tsx:18-89`, `src/app/article/[slug]/page.tsx:34-66`)
- Always fall back to safe defaults when the DB read fails — wrap in try/catch and return the default metadata object (`src/app/layout.tsx:60-88`)
- Use helpers from `src/lib/seo.ts` (`normalizeSiteUrl`, `normalizeHttpUrl`, `normalizeLocale`, `serializeJsonLd`) rather than hand-rolling URL/locale handling

**Middleware/CSP:**
- `src/proxy.ts` (not `middleware.ts`) sets the per-request `x-nonce` header consumed by `src/app/layout.tsx` for CSP-compliant inline scripts

**Rendering control:**
- Dynamic pages export `export const revalidate = 0` (`src/app/article/[slug]/page.tsx:23`)
- Cache invalidation after CMS mutations via `revalidatePublicArticles()` from `src/lib/cache-revalidation.ts` — call it in CMS write routes

## Error Handling

**API routes (the dominant pattern — `src/app/api/v1/auth/login/route.ts`):**
- Wrap the entire handler body in `try/catch`
- Guard clauses returning early with `NextResponse.json({ status: 'error', message }, { status: <code> })`
- Validation failures → 400; auth missing → 401; forbidden/ownership → 403; not found → 404; rate limit → 429 with `Retry-After` header; unexpected → 500
- Response envelope everywhere: `{ status: 'success' | 'error', message?: string, ...data }`
- Catch block: `console.error('<Context> error:', error)` then a generic 500 message — never leak internals to the client

**Auth guards:**
- `const user = getAuthUser(req); if (!user) return 401` (`src/lib/auth.ts:48-55` extracts/verifies the Bearer token)
- Ownership: `if (user.role !== 'admin' && doc.author_id.toString() !== user.userId.toString())` → 403 (`src/app/api/v1/cms/articles/[id]/route.ts:31-36`)

**lib/ module conventions:**
- Lazy env reads with a clear throw — read `JWT_SECRET`/`MONGODB_URI` inside a function at call time, not at module import, and throw an actionable error message (`src/lib/auth.ts:9-14`, `src/lib/db/mongodb.ts:11-34`). This pattern is deliberate (documented in Vietnamese comments) so importing modules never throws at build/test time
- Return `null` for expected verification failures (`verifyToken` → `null`), throw only for misconfiguration
- Global singletons via `declare global` for dev hot-reload-safe caches (`mongooseCache` in `src/lib/db/mongodb.ts:36-50`)

**Client components:**
- `try/catch` around browser APIs with a manual fallback path (`navigator.clipboard` → hidden-textarea `execCommand` fallback in `src/components/SocialShare.tsx:31-47`); swallow user-aborted errors (`DOMException` `AbortError`)

## Logging

**Framework:** `console` only (no structured logger)

**Patterns:**
- Server errors: `console.error('<Owning feature> error:', error)` inside route catch blocks — always prefix with context (`'Login error:'`, `'CMS GET Article error:'`)
- No logging in lib modules; they throw and let the route handler log
- No client-side logging library; components fail silently or via thrown errors

## Comments

**When to Comment:**
- Comments explain **why**, not what — frequently in Vietnamese, e.g. the rationale for lazy env reads (`src/lib/auth.ts:5-8`, `src/lib/db/mongodb.ts`), test env timing (`tests/setup.ts:1-4`), and nonce/CSP ordering (`src/app/layout.tsx:96-100`)
- Section markers with `// 1. User` numbering in `src/lib/db/models.ts`, and `/* ── Section ── */` banner comments in page JSX (`src/app/article/[slug]/page.tsx:166,207`)
- Match the file's existing language; new comments in this repo are usually Vietnamese for internal rationale

**JSDoc/TSDoc:**
- Sparse. Block JSDoc headers on standalone utility modules (`src/lib/sanitizer.ts:1-5`); one-line `//` summaries on exported lib functions (`src/lib/auth.ts:22,27,32,37,47`); no TSDoc parameter annotations

## Function Design

**Size:** Handlers and page components can be long (route handlers ~90–190 lines; `src/app/article/[slug]/page.tsx` is 258 lines) — data mapping is done inline with early returns rather than helper sprawl. Follow existing granularity: one handler per HTTP method, private helpers at the top of the file (`tooManyRequests()` in `src/app/api/v1/auth/login/route.ts:8-13`)

**Parameters:** Single `Request` object for handlers (+ destructured `{ params }` for dynamic routes); plain positional args for lib helpers; options objects for builders (`buildInsiderDigestEmail({...})` in `src/lib/insider/digest.ts`)

**Return Values:**
- Lib: typed values or `null` for expected failure; throw for misconfiguration
- Routes: always `NextResponse.json(...)` with the `{ status, message }` envelope — never raw `Response.json` or thrown errors to the client
- Components: default export, typed props interface

## Module Design

**Exports:**
- Named exports for everything in `src/lib/` (functions, models, interfaces)
- Default exports for React components and pages
- Route files export only HTTP verb functions, optionally small private helpers

**Barrel Files:** None — import directly from the defining module (`@/lib/db/models`, `@/lib/insider/tokens`). Do not introduce `index.ts` barrels

**Model definitions:** All Mongoose interfaces, schemas, and model exports live in `src/lib/db/models.ts` (numbered `// 1. User`, `// 2. Category`, ... comments). Add new collections there, following `I<X>` interface + `<X>Schema` + `export const <X>Model` and snake_case fields with `created_at: { type: Date, default: Date.now }`

**Where to add new code (quick map):**
- New REST endpoint: `src/app/api/v1/<public|cms|auth>/<resource>/route.ts` (+ `[id]/route.ts` for item ops)
- New shared server logic: `src/lib/<topic>.ts` (kebab-case)
- New UI component: `src/components/PascalCase.tsx` (admin-only → `src/components/admin/`)
- New page: `src/app/<segment>/page.tsx` (+ colocated `*.module.css` and optional `<segment>-client.tsx`)
- New test: `tests/api/` (route-level) or `tests/lib/` (pure logic) — see TESTING.md

---

*Convention analysis: 2026-09-10*
