# Codebase Concerns

**Analysis Date:** 2026-09-10

Cross-referenced against the project's own audit (`GO_LIVE_TASKLIST.md`, dated 2026-08-09) — items still open there are verified against current code below. Stale deps and hardcoded fallback secrets were also independently flagged in `.planning/codebase/STACK.md` / `INTEGRATIONS.md`.

---

## Security Considerations

### 1. CRITICAL — Unauthenticated, destructive seed route

- Risk: Anyone on the internet can destroy the entire production database and reset admin credentials to known values.
- Files: `src/app/api/v1/seed/route.ts` (public `GET` **and** `POST`, no auth), calling `src/lib/db/seed-mongodb.ts`
- Impact: `seedMongoDB()` runs `deleteMany({})` on **every collection** — Users, Articles, AffiliateLinks, Subscribers, ClickLogs, Settings (`src/lib/db/seed-mongodb.ts:20-28`) — then recreates a user `admin` with password `password123` (`src/lib/db/seed-mongodb.ts:31-40`). One `curl https://<site>/api/v1/seed` wipes all content, subscribers, click analytics, and site settings, and hands over a known admin login.
- Trigger: `GET /api/v1/seed` on the deployed site. `robots.ts` disallows `/api/` for crawlers but nothing blocks the request.
- Recommendations: Delete the route (the CLI path `npm run seed` / `scripts/seed-*.ts` already covers seeding) or gate it behind `INSIDER_CRON_SECRET`-style bearer auth + refuse when `NODE_ENV === 'production'` + never `deleteMany` users/settings.

### 2. CRITICAL — Hardcoded fallback JWT secrets in CMS routes (SEC-02 regression)

- Risk: Auth bypass via forgeable admin tokens if `JWT_SECRET` is unset; inconsistent verification across routes otherwise.
- Files:
  - `src/app/api/v1/cms/ai/generate-article/route.ts:11` — fallback literal `'affiliate_secret_key_v3_super_secure'` (this is the **exact string** SEC-02 in `GO_LIVE_TASKLIST.md` claims was removed; it survives here)
  - `src/app/api/v1/cms/blacklist/route.ts:8`, `src/app/api/v1/cms/blacklist/quick-blacklist/route.ts:8`, `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts:8`, `src/app/api/v1/cms/blacklist/import/route.ts:8` — fallback literal `'nexus_super_secret_jwt_key_2026'`
- Impact: These 5 routes each define a private `JWT_SECRET`/`getAuthUser` instead of importing `getAuthUser` from `src/lib/auth.ts` (which correctly throws when `JWT_SECRET` is missing). Anyone who reads the public source can self-sign an `admin` JWT against the fallback secret and hit the blacklist CRUD and AI-generation endpoints. Even with `JWT_SECRET` set, these routes accept tokens signed with a *different* secret than the rest of the CMS.
- Fix approach: Replace all route-local JWT logic with `getAuthUser(req)` from `src/lib/auth.ts`; delete both fallback literals. Add a grep gate in CI for `|| '` fallback patterns on secrets.

### 3. CRITICAL (standing, partially blocked) — Leaked MongoDB Atlas credential in git history (SEC-01 ⚠️)

- Risk: DB credential is still valid and was committed to git history.
- Files: documented in `GO_LIVE_TASKLIST.md` SEC-01 (password recorded there — intentionally not reproduced here); the code fallback in `src/lib/db/mongodb.ts` was removed and `mongodb.env` is now untracked/gitignored (verified: `.gitignore:35`, and `git ls-files` no longer lists it).
- Impact: Anyone with git history access can read/write the production Atlas cluster (all articles, subscribers, settings).
- Blocker: The Atlas cluster is owned by a third party; the project has no Atlas login, so the password cannot be rotated until the owner does it or the project migrates to its own cluster.
- Recommendations: Migrate to a project-owned Atlas cluster ASAP; until then treat every migration/backup step as compromised. Note `src/lib/db/mongodb.ts:16-27` still manually regex-parses `MONGODB_URI` out of `.env.local`/`mongodb.env` — a dev-only crutch that keeps the plaintext-connection-string-in-file pattern alive in production code paths.

### 4. HIGH — Hardcoded Gemini API key committed to source

- Risk: Live API key literal in public source; billing abuse.
- Files: `src/lib/gemini.ts:75` (default parameter fallback) and duplicated at `src/app/api/v1/cms/ai/generate-article/route.ts:91`; a Google Cloud project ID is also leaked in an error string at `src/lib/gemini.ts:202`.
- Impact: Anyone can extract the key and burn the account's Gemini quota/billing. Do not copy this value anywhere; it must be treated as compromised.
- Fix approach: Remove both literals (make the key required — `env` only), rotate the key in Google AI Studio, and use the per-user key from CMS settings as the only secondary source.

### 5. HIGH — HTML injection in blacklist warning page

- Risk: Stored XSS / HTML injection rendered to end users when a link is blacklisted.
- Files: `src/app/api/v1/public/tracking/redirect/route.ts:54-95` — `projectName`, `reason`, `blockedCountries` from `BlacklistModel` (via `src/lib/blacklist.ts:96-124`) are interpolated into a raw HTML template with zero escaping.
- Impact: Blacklist rows are populated by CMS users and by importing an external published Google Sheet (`src/app/api/v1/cms/blacklist/import-sheet-url/route.ts`), so attacker-controlled text in an imported sheet becomes markup on a user-facing page. This page also bypasses the article-content sanitizer (`src/lib/sanitize.ts`).
- Compounding factor: `src/proxy.ts:39` matcher excludes `/api/**` from the CSP, so this response ships with **no CSP at all**, and it loads Tailwind from `https://cdn.tailwindcss.com` (the Play CDN — not intended for production, heavy, and an extra third-party script origin).
- Fix approach: Build the warning page as a proper route/component, or at minimum HTML-escape all interpolated values and drop the CDN script.

### 6. HIGH — ReDoS via unescaped regex from public search input

- Risk: Unauthenticated CPU DoS.
- Files: `src/app/api/v1/public/articles/route.ts:34` — `new RegExp(searchKeyword.trim(), 'i')` built directly from the `?search=`/`?q=` query param; check `src/app/api/v1/public/articles/by-category/route.ts` for the same pattern before reusing.
- Impact: Crafted patterns (e.g. nested quantifiers) hang the event loop; PM2's 600MB cap makes restarts the only recovery. Note the inconsistency: `src/lib/homepage-articles.ts:28-30,43` **does** escape via `escapeRegExp()` — this route just doesn't use it.
- Fix approach: Reuse `escapeRegExp` (move it to `src/lib/utils.ts`) everywhere user text becomes a RegExp; also `src/lib/blacklist.ts:139` builds an unescaped RegExp from blacklist domain input.

### 7. MEDIUM — Public endpoints with no abuse controls

- Files:
  - `src/app/api/v1/public/insider/route.ts` (aliased as `/subscribe` via `src/app/api/v1/public/subscribe/route.ts`) — creates Subscriber docs and sends Resend confirmation emails; only a 60s per-email resend cooldown (`CONFIRMATION_RESEND_COOLDOWN_MS`), no IP rate limit → email-bombing / Resend bill abuse / list pollution.
  - `src/app/api/v1/public/tracking/click/route.ts` — unauthenticated `POST` that `$inc`s `click_count` and inserts a `ClickLog` with zero rate limiting → trivially spammable, corrupting dashboard analytics and commission decisions.
  - `src/app/api/v1/public/tracking/redirect/route.ts` — same click-count inflation on `GET`.
- Fix approach: Apply the existing `src/lib/rateLimit.ts` pattern (per-IP sliding window) to public write endpoints; dedupe click logs per IP+link+time-window.

### 8. MEDIUM — Spoofable client IP

- Files: `src/lib/utils.ts:57-67` — trusts the first entry of `X-Forwarded-For` (client-controlled header).
- Impact: Bypasses the login rate limit (`src/lib/rateLimit.ts` keys on this IP) and poisons `ClickLog.ip_address` attribution. Verify Nginx overwrites (not appends to) `X-Forwarded-For`, or parse the last trusted proxy hop instead.

### 9. MEDIUM — Affiliate `base_url` scheme never validated (SEC-07 open)

- Files: `src/app/api/v1/cms/affiliate-links/route.ts` (no scheme check on create/update); `appendSubId` in `src/lib/utils.ts:26` passes URLs through.
- Impact: A `javascript:`/`data:` URL stored as `base_url` would be 302-redirected to by the public tracking route (admin-only to set, but the AI route also injects arbitrary user-provided URLs — `src/lib/gemini.ts:74` `trackingUrl`).
- Fix approach: Validate `http(s):` scheme at the CMS API boundary (same `normalizeHttpUrl` logic as `src/lib/seo.ts:28`).

### 10. MEDIUM — JWT in localStorage + in-memory revocation

- Files: `src/app/admin/login/page.tsx:30-31` (token in `localStorage`, readable by any XSS), `src/lib/tokenBlacklist.ts` (per-process `Map`), `src/lib/rateLimit.ts` (same).
- Impact: Documented single-instance constraint (`GO_LIVE_TASKLIST.md` SEC-06): logout revocation and rate limiting are lost on restart and don't work across ≥2 instances. PM2 `fork`/`instances: 1` in `ecosystem.config.js:14-15` keeps this valid today — any move to cluster mode/serverless breaks security guarantees silently.

### 11. LOW — Admin-controlled CSS/JSON-LD injection points

- Files: `src/app/layout.tsx:134-150` — `custom_css`, `primary_color`, `accent_color` from the Setting doc are interpolated raw into a `<style>` tag (admin-only input, but stored CSS injection affects every visitor); `schemaJsonld` is at least guarded by `sanitizeStoredJsonLd()`.
- Fix approach: Constrain `primary_color`/`accent_color` to a color-format regex; keep `custom_css` behind an explicit trusted-admin-only setting if kept at all.

---

## Known Bugs

### 1. Admin edit page cannot load articles (silent 401s)

- Symptoms: `/admin/articles/edit/[id]` renders an empty editor; no error surfaces.
- Files: `src/app/admin/articles/edit/[id]/page.tsx:98-102` — fetches `/api/v1/cms/affiliate-links` and `/api/v1/cms/articles/${articleId}` **without an Authorization header**; both routes return 401 (`src/app/api/v1/cms/affiliate-links/route.ts:8-10`, `src/app/api/v1/cms/articles/[id]/route.ts:14-17`).
- Trigger: Open any article edit URL under `/admin/articles/edit/`.
- Context: This page looks superseded by the edit flow inside `src/app/admin/page.tsx` (FE-01 wired that one into URL state). Decide: fix the headers or delete the orphaned page — right now it's broken dead code that will confuse anyone using it.

### 2. Search-parameter SEO regression (SEO-05 fix lost)

- Symptoms: `/?q=<anything>` is indexable with a canonical pointing at `/` — index bloat / duplicate-content risk the project already fixed once.
- Files: The SEO-05 fix (noindex + canonical for `?q=`) was implemented on `src/app/figma-tech-finance-news/page.tsx`, which **no longer exists** (route deleted; `next.config.ts:31-43` now 301-redirects it to `/`). The search feature moved to the homepage (`src/app/page.tsx:16-18` reads `searchParams.q`), whose metadata is static (`createPageMetadata` in `src/lib/seo.ts:39`) with no `?q=` handling.
- Fix approach: In `src/app/page.tsx`, switch to `generateMetadata({ searchParams })` and add `robots: { index: false, follow: true }` + clean canonical when `q` is present.

### 3. View-count spam and lost updates (BUG-02 open)

- Files: `src/app/article/[slug]/page.tsx:80-81` — `article.view_count += 1; await article.save()` on **every** request.
- Impact: (a) F5/back-forward inflates counts and dashboard revenue metrics (acknowledged open in `GO_LIVE_TASKLIST.md` BUG-02); (b) read-modify-write is not atomic — concurrent views lose increments (should be `ArticleModel.updateOne({ _id }, { $inc: { view_count: 1 } })`); (c) `article.save()` runs full document validation per view.
- Fix approach: `$inc` update + cookie/IP dedupe window.

### 4. Legacy article URL redirect is temporary, not permanent

- Files: `src/app/bai-viet/[slug]/page.tsx:9` — uses `redirect()` (HTTP 307). For a legacy path being retired, `permanentRedirect()` (308) preserves SEO signal.

### 5. Loose domain matching in the AI link sanitizer

- Files: `src/lib/sanitizer.ts:47` — `hrefDomain.includes(allowed) || allowed.includes(hrefDomain)` matches on substring in both directions (e.g. allowed `heygen.com` matches href `notheygen.com`; href `ai.com` matches allowed `openai.com`).
- Impact: Unapproved domains can pass the allowlist into generated article HTML. Mitigated downstream by `src/lib/sanitize.ts` scheme enforcement, but the domain check itself is ineffective.
- Fix approach: Compare exact hostnames / proper suffix matching (`hrefDomain === allowed || hrefDomain.endsWith('.' + allowed)`).

---

## Tech Debt

### 1. 4,097-line single-file admin app

- Issue: `src/app/admin/page.tsx` is one `'use client'` component containing dashboard, article CRUD, affiliate links, blacklist, insights, users, subscribers, insider dispatch, and settings — 60+ `useState` hooks, untyped `any` props (`LuxuryButton` at line 64, `StatCard` at line 80), all data fetching inline.
- Files: `src/app/admin/page.tsx` (4,097 lines; largest file in repo by ~5x)
- Impact: Any change risks regressions across unrelated tabs; zero testability; whole bundle ships on every admin page visit; 75 `any` usages repo-wide are concentrated here.
- Fix approach: Incremental extraction — one component file per tab (they're already visually segmented), a shared `useCmsFetch` hook with the token header, typed view models. Do it tab-by-tab; don't big-bang.

### 2. Three overlapping article editors

- Issue: Article editing exists in `src/app/admin/page.tsx` (tab-based, primary), `src/app/admin/articles/create/page.tsx` (762 lines), and `src/app/admin/articles/edit/[id]/page.tsx` (broken — see Known Bugs). Create/Edit pages duplicate the placement, AI-takeaways, and upload logic of the main admin.
- Fix approach: Consolidate on one editor; delete or fix the orphans.

### 3. Dead code in `src/lib/db/` and `src/components/`

- Issue (verified zero imports):
  - `src/lib/db/schema.ts` (277 lines) — a full second schema layer with **camelCase field names** (`passwordHash`, `baseUrl`, `createdAt`) conflicting with the live snake_case models in `src/lib/db/models.ts`; registers the same mongoose model names. Every file imports from `models.ts`; nothing imports `schema.ts`. High confusion risk for future work (an agent could easily import the wrong definitions).
  - `src/lib/db/seed.ts` — wrapper duplicating `seed-mongodb.ts`'s CLI entry.
  - `src/lib/db/index.ts` — barrel re-exporting legacy alias names (`export const User = UserModel`).
  - `src/lib/db/fix-malformed-links.ts` — one-off data-fix script inside `src/`.
  - `src/components/Header.tsx`, `Footer.tsx`, `PublicNav.tsx`, `Button.tsx`, `ComparisonTable.tsx`, `BreakingNewsTicker.tsx`, `ArticleGrid.tsx` — 0 imports anywhere (superseded by `EditorialHeader`/`EditorialFooter` and homepage `news-client.tsx`).
- Fix approach: Delete the schema.ts twin first (highest confusion risk), then the rest.

### 4. Unused dependencies (TECH-01 open)

- Issue: `drizzle-orm`, `pg`, `@types/pg` (abandoned SQL stack — root `sqlite.db`/`-shm`/`-wal` files are its leftovers, and all three are **committed to git**) and `@google/genai` (Gemini is raw REST in `src/lib/gemini.ts`) are installed but never imported.
- Files: `package.json:27,30,37`, `sqlite.db*` at repo root
- Impact: Install weight, audit surface, misleading stack signals.
- Fix approach: `npm uninstall drizzle-orm pg @types/pg @google/genai`; `git rm --cached sqlite.db*` and gitignore `*.db*`.

### 5. Repo-root clutter and committed artifacts

- Issue: Legacy prototypes `affiliate_platform_ui.tsx`, `giaodienuser.tsx` (excluded from `tsconfig` per STACK.md), `demogiaodien.html`, `test.mjs`, `render.txt` (old Render deploy hostname), plus `sqlite.db*` and a duplicate favicon set under `src/app/` (`icon.png`, `icon.jpeg`, `favicon/favicon.jpeg` all ~100-160KB committed images) are tracked in git.
- Fix approach: Move prototypes/design files to `design-plans/` or delete; delete `test.mjs`; replace heavyweight icon files with a single optimized favicon.

### 6. Brand constants bypassed

- Issue: `src/lib/brand.ts` exists as the declared single source of truth for `AIDEALSUK`, but components hardcode the string instead of importing it: `src/components/Header.tsx:46`, `EditorialFooter.tsx:8,292`, `Footer.tsx:19,45,57`, `EditorialBackdrop.tsx:9`, `PublicNav.tsx:111` (several of these files are dead — see above, which reduces the count but proves the pattern).
- Fix approach: When touching any live component, switch fallbacks to `BRAND_NAME` from `src/lib/brand.ts`; also a hardcoded default Google Sheet URL sits in component state at `src/app/admin/page.tsx:319` and should be settings-driven.

### 7. Logging and typing hygiene

- Issue: 66 `console.*` calls across `src/` (no levels, no request IDs; only visible via `pm2 logs`), 75 `any` usages, `Record<string, any>` filters in API routes (e.g. `src/app/api/v1/public/articles/route.ts:17`).
- Fix approach: No logger framework needed at this scale — but centralize a tiny `logger.ts` wrapper now so future shipping to a sink is one file; type API filter builders.

### 8. Dev-only env-file parsing in production path

- Files: `src/lib/db/mongodb.ts:16-27` — runtime `fs.readFileSync` + regex parsing of `.env.local`/`mongodb.env` when `MONGODB_URI` is unset; `dns.setServers(['8.8.8.8','1.1.1.1','8.8.4.4'])` at module load (`mongodb.ts:6-9,75-79`) globally overrides DNS for the whole process.
- Impact: Works, but hides misconfigured env in production (app "works" because a file happens to exist in cwd), and the global DNS override can surprise other consumers.
- Fix approach: Keep the lazy throw; delete the file-parsing fallback once the VPS env is verified (deploy.yml already copies `.env.local` into `app_new/`).

---

## Performance Bottlenecks

### 1. Article pages: fully dynamic + DB write per view

- Problem: `export const revalidate = 0` (`src/app/article/[slug]/page.tsx:23`) plus a synchronous read-modify-write of the Article doc on **every** request (line 80-81). Each page view = metadata query (article + settings) + page query (article + settings) + `save()` + 2 related-articles queries — 6+ round trips to remote Atlas, none cached, and every crawler hit is a DB write.
- Files: `src/app/article/[slug]/page.tsx`, also `generateMetadata` re-queries what the page re-queries (no `React.cache` dedup).
- Cause: Caching was deliberately traded away during the CSP nonce work (all routes are forced dynamic via `headers()` in `src/app/layout.tsx:101`); TECH-02 in `GO_LIVE_TASKLIST.md` remains ⬜.
- Improvement path: Homepage already uses `unstable_cache` with tags + `revalidate: 60` (`src/lib/homepage-articles.ts:87-91` with `revalidatePublicArticles()` in `src/lib/cache-revalidation.ts` wired into CMS article writes) — replicate that pattern for article pages: cached article fetch by tag, `view_count` via fire-and-forget `$inc` (or a client-side beacon endpoint).

### 2. Sitemap/robots hit MongoDB on every crawler request

- Problem: `export const dynamic = 'force-dynamic'` in `src/app/sitemap.ts:10` and `src/app/robots.ts:9` means every `/sitemap.xml` request runs `connectToDatabase()` + 3 queries (including a `$lookup` aggregation). Note GO_LIVE SEO-01 claims `revalidate = 3600` was added — it is **not** in the current code.
- Files: `src/app/sitemap.ts`, `src/app/robots.ts`
- Improvement path: `export const revalidate = 3600` on both (the DB comment about CI-time build is stale — force-dynamic was chosen for the no-DB-at-build problem, which ISR revalidate also solves).

### 3. List APIs return full article HTML

- Problem: `src/app/api/v1/public/articles/route.ts:58` maps `content: doc.content` into every list response — 6 full articles' HTML per page of listing; also no caching layer on public GET routes.
- Improvement path: Return excerpt-only in list mode; add `Cache-Control: s-maxage` or `unstable_cache` for hot public reads.

### 4. Blacklist check is linear scan per redirect

- Problem: `checkUrlAgainstBlacklist()` (`src/lib/blacklist.ts:83-126`) loads **all** active blacklist docs and loops in JS on every affiliate redirect. Fine at hundreds of entries; degrades silently at thousands.
- Improvement path: Index on `extracted_domain` + query by hostname instead of scan-all.

---

## Fragile Areas

### 1. Auth verification — five parallel implementations

- Files: canonical `src/lib/auth.ts` (throws on missing secret, checks blacklist) vs route-local duplicates in `src/app/api/v1/cms/ai/generate-article/route.ts` and 4 `src/app/api/v1/cms/blacklist/*` routes (fallback literals, **no** blacklist check — logged-out-but-blacklisted tokens still work on those routes).
- Why fragile: Security fixes to `auth.ts` (e.g. SEC-02) don't reach the duplicates; this is exactly how the fallback secrets regressed.
- Safe modification: Route everything through `getAuthUser()`; add a lint/grep rule banning `jwt.verify` outside `src/lib/auth.ts`.
- Test coverage: `tests/api/auth-login.test.ts`, `tests/api/auth-logout.test.ts` cover the canonical path; **no test covers the blacklist-route auth paths** (that's how the regression survived).

### 2. The blacklist warning HTML string

- Files: `src/app/api/v1/public/tracking/redirect/route.ts:54-95`
- Why fragile: Template literal HTML with interpolation, its own `<head>`, a third-party CDN script, and no escaping or CSP — any change risks XSS.
- Safe modification: Convert to a real route or a component; see Security #5.
- Test coverage: `tests/api/tracking-redirect.test.ts` covers the happy path and the blacklisted branch returning "a warning page" — it does not assert on HTML content.

### 3. Content pipeline (sanitize + generated-HTML rewrite)

- Files: `src/lib/sanitize.ts` (solid allowlist sanitizer, tested in `tests/lib/sanitize.test.ts`), `src/lib/sanitizer.ts` (regex-based link rewriter — fragile by construction, see Bug #5), `src/lib/gemini.ts` (AI output is parsed JSON then sanitized at save time in `src/app/api/v1/cms/articles/route.ts` / `[id]/route.ts`).
- Why fragile: Two layers with different guarantees; the regex rewriter can silently rewrite links (`primaryAllowedUrl` substitution at `sanitizer.ts:53-55`).
- Safe modification: Any change to allowed tags must update `tests/lib/sanitize.test.ts` first; run `sanitizeArticleContent` as the final gate regardless of source.

### 4. Deploy pipeline single-points

- Files: `.github/workflows/deploy.yml` — deploys on push to `feature/namdt25-develop` (a feature branch is the production trigger), `pm2 delete` + `pm2 start` (`deploy.yml:83-84`) means a failed start leaves the site down until manual intervention; no health check between restart and completion.
- Safe modification: Add a `curl -f http://localhost:3000` post-start check with rollback to `app_old` (currently `app_old` is deleted before the health of the new build is known).

---

## Scaling Limits

- **Single process assumption:** `ecosystem.config.js:14-15` (`instances: 1`, `exec_mode: 'fork'`) is a hard prerequisite for `src/lib/rateLimit.ts` and `src/lib/tokenBlacklist.ts` correctness (documented in both files and `GO_LIVE_TASKLIST.md` SEC-06). Any second instance silently disables login lockout and logout revocation.
- **VPS memory:** 4GB RAM box, PM2 `max_memory_restart: '600M'` (`ecosystem.config.js:17`) — a leaky or traffic-spike process is killed-and-restarted (dropping the in-memory blacklist/rate-limit state, ironically re-enabling recently-logged-out tokens). Build already moved to CI for this reason.
- **MongoDB Atlas ownership:** cluster is third-party-owned (SEC-01) — no ability to tune, scale, rotate, or even back up independently. Operational ceiling for the whole product.
- **Crawl-to-DB ratio:** with sitemap/robots/article pages all force-dynamic and uncached (see Performance), crawler bursts translate 1:1 into Atlas load; adds latency budget pressure on the 4GB VPS.

---

## Dependencies at Risk

- **`drizzle-orm` + `pg` + `@types/pg`** — abandoned SQL stack, never imported (`GO_LIVE_TASKLIST.md` TECH-01 ⬜). Remove.
- **`@google/genai` 2.15.0** — installed but unused; `src/lib/gemini.ts` calls the REST API directly. Either adopt the SDK or remove it; the raw-REST approach means model names are hardcoded in a fallback chain (`gemini.ts:166`: `gemini-3.6-flash` → `2.0-flash`) that will silently degrade to older models as candidates 404.
- **`unstable_cache`** (`src/lib/homepage-articles.ts:3,87`) — not deprecated in Next 16 (verified in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`), but docs recommend migrating to the `use cache` directive / Cache Components (`docs/01-app/02-guides/migrating-to-cache-components.md`). Modernization backlog item, not urgent. (Positive: `revalidateTag(tag, 'max')` in `src/lib/cache-revalidation.ts:15` already uses the new two-argument Next 16 form — the single-argument deprecation is avoided.)
- **`cdn.tailwindcss.com`** (Play CDN) loaded in the blacklist warning page (`src/app/api/v1/public/tracking/redirect/route.ts:61`) — explicitly not for production; ~300KB runtime compiler per view and a third-party script dependency.
- **`mongoose` 9.9.1 / `mongodb` 7.5.0 / Next 16.2.12** — all on recent majors; keep patch-current, and re-run `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` checks on any minor bump (AGENTS.md contract).

---

## Missing Critical Features

- **Custom 404/error pages** (FE-02 ⬜): no `not-found.tsx`/`error.tsx` anywhere under `src/app/` — DB-outage errors on public pages surface as raw Next.js error screens, bad for both users and crawl health.
- **View-count dedupe** (BUG-02 ⬜): see Known Bugs #3.
- **Error/uptime monitoring**: no Sentry or equivalent; a production 500 on the VPS is only visible if someone runs `pm2 logs`. For an ads-driven affiliate site, silent breakage = direct revenue loss.
- **Database backups**: no backup story for Atlas (blocked by ownership), and the only "restore" tool is the destructive seed script.
- **GSC submission of sitemap**: final unchecked box of SEO-01 (`GO_LIVE_TASKLIST.md:152`).
- **Staging environment**: CI deploys straight to production; no staging env to validate the CSP/nonce changes or seed changes before users see them.

---

## Test Coverage Gaps

Existing suite: 10 files under `tests/` (Vitest + `mongodb-memory-server`, `vitest.config.mts`, `fileParallelism: false`) covering auth login/logout, article ownership, tracking redirect, insider lifecycle/admin/digest/tokens, sanitize. Gaps, in priority order:

**CMS route security (High):**
- No tests assert that **unauthenticated** requests to `/api/v1/cms/*` return 401 — the exact gap that let hardcoded JWT fallbacks survive in 5 routes. Add a parameterized "all CMS routes 401 without token" test.
- No tests for `/api/v1/cms/settings` PUT (drives site-wide metadata), users CRUD (role changes), upload.

**Public read APIs (Medium):**
- `/api/v1/public/articles` (incl. the ReDoS regex input), `/top-picks`, `/categories`, `/settings` — untested.

**Rendering/SEO (Medium):**
- No test asserts sitemap output shape (published-only, correct base URL) or robots.txt contents; no test that `/?q=` metadata behavior (once the regression is fixed) stays fixed.

**Admin flows (High for the broken page):**
- Any E2E coverage of `/admin` flows would have caught the broken `admin/articles/edit/[id]` page (Known Bugs #1). No component or E2E tests exist at all.

**Seed route (High, after fixing):**
- Whatever guard is added to `/api/v1/seed` needs a test asserting unauthenticated calls are rejected — currently the most destructive endpoint in the app is the least protected.

---

*Concerns audit: 2026-09-10*
