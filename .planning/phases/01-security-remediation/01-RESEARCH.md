# Phase 1: Security Remediation - Research

**Researched:** 2026-09-14
**Domain:** Brownfield Next.js 16 security hardening — destructive endpoint removal, canonical JWT auth, secrets hygiene, XSS-safe blacklist warning page, public-endpoint abuse controls
**Confidence:** HIGH (all fix targets opened and read from source this session; framework contracts verified in bundled Next 16 docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Seed Route (SEC-01)**
- **D-01:** Delete `/api/v1/seed` route entirely (`src/app/api/v1/seed/route.ts`). No gated replacement — the CLI seeding path already exists.
- **D-02:** Clean up ALL overlapping seed code paths when deleting the route: delete `src/lib/db/seed-mongodb.ts` and the dead `src/lib/db/seed.ts` wrapper too; keep only the CLI script (`scripts/seed-*.ts`) as the single seeding source.
- **D-03:** Add a regression test asserting that any request to the former seed path (and any destructive route without a token) is rejected (404/401) — guards against someone re-adding a seed route later.
- **D-04:** Admin password recovery moves to CLI: create `scripts/reset-admin.ts` (runnable on the VPS) and document its use in `DEPLOY.md`. No web path for recovery.

**Secrets Cleanup (SEC-03)**
- **D-05:** Remove secret literals from source only — user explicitly chose NOT to rotate the Gemini key in this phase (code cleanup only). Fallback literals to remove: `src/lib/gemini.ts:75` (default-parameter Gemini key), the duplicate at `src/app/api/v1/cms/ai/generate-article/route.ts:91`, and the leaked Google Cloud project ID in the error string at `src/lib/gemini.ts:202`. Note: user is aware the old key remains in git history and valid.
- **D-06:** Missing secrets fail via the EXISTING lazy-getter pattern (like `getMongoUri` in `src/lib/db/mongodb.ts:11` and `getJwtSecret` in `src/lib/auth.ts:9`) — extend this pattern to all required secrets. Do NOT add startup-time validation (build/CI/tests must not require real secrets).
- **D-07:** Gemini key precedence after fallback removal: env `GEMINI_API_KEY` is primary; the per-user key from CMS settings is the only secondary source (when env is absent).
- **D-08:** Add a CI grep gate in `.github/workflows/deploy.yml` (or a test step) banning secret-fallback patterns: `|| '`-style fallback literals on secrets, and `jwt.verify` outside `src/lib/auth.ts`. SEC-02 regressed once exactly this way — the gate prevents recurrence.

**Blacklist Warning Page (SEC-04 / AFF-03)**
- **D-09:** Rebuild the warning page as a REAL Next.js route (e.g. `/blocked`) — server component, site theme, CSP applies (proxy.ts), no `cdn.tailwindcss.com` Play CDN.
- **D-10:** The page is DB-backed: the redirect route issues `302 → /blocked?ref=<clickLogId-or-equivalent>` and the page resolves blacklist data from the DB by that ref. No attacker-controlled text travels through the URL.
- **D-11:** Keep the current redirect behavior (302 through the intermediate warning page) — only the rendering mechanism changes.

**Abuse Controls (CONCERNS #7, #8)**
- **D-12:** Rate-limit ALL THREE public write endpoints: `/api/v1/public/insider` (aliased `/subscribe`), `/api/v1/public/tracking/click`, `/api/v1/public/tracking/redirect` — reuse the existing per-IP sliding-window pattern in `src/lib/rateLimit.ts`.
- **D-13:** Policy: subscribe over-limit → hard 429. Click/redirect over-limit → do NOT 429 real users; instead drop duplicate records (same IP + link within a ~60s window) so F5/back-forward cannot inflate counts. Exact thresholds (window sizes, request caps) are delegated to the planner/researcher.
- **D-14:** Fix IP spoofing: parse the LAST trusted hop (X-Real-IP / last XFF entry) in `src/lib/utils.ts:57-67` AND configure Nginx to overwrite (not append) `X-Forwarded-For` — code + Nginx config together.
- **D-15:** KEEP JWT in localStorage. Do NOT migrate to httpOnly cookies in this phase — Phase 1 closes holes, not auth refactors. Logout revocation + rate limiting must work correctly across all CMS routes; the httpOnly migration remains future work.

### the agent's Discretion
- Exact rate-limit thresholds and window sizes (user delegated: "You decide" on specifics).
- Exact `/blocked` route path name and how `ref` is validated.
- How the CI grep gate is implemented (workflow step vs test assertion) as long as it fails the build on fallback-secret patterns.

### Deferred Ideas (OUT OF SCOPE)
- Rotate the exposed Gemini API key (and consider the leaked Google Cloud project ID) in Google AI Studio — user chose code cleanup only this phase; rotation is a user-side action to schedule
- Migrate JWT from localStorage to httpOnly cookies — larger auth refactor, belongs to a later phase
- httpOnly-cookie revocation story / Redis-backed token blacklist — already deferred (single-instance constraint valid at 50–100 concurrent users)
- Atlas credential rotation / migration to project-owned cluster — standing blocker (third-party ownership)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | No unauthenticated destructive endpoint | Seed route + `seed-mongodb.ts` + `seed.ts` deleted (all importers verified); `npm run seed` script must be removed/repointed (package.json:12); regression gate test + parameterized CMS 401 test design |
| SEC-02 | No secrets in source; env-only with loud failure | Exact literal locations verified (7 sites); lazy-throw pattern exists in `auth.ts:9-14`; gate test design; gemini key precedence + phantom `geminiApiKey` settings finding |
| SEC-03 | XSS-safe rendering of all content | `/blocked` RSC design — React text children escape by default [CITED: react.dev]; CSP applies outside `/api/**` [VERIFIED: src/proxy.ts:37-41]; no Play CDN |
| SEC-04 | Abuse controls on public inputs | New count-based limiter in rateLimit.ts (existing one is failure-lockout only — verified); dedupe design; `escapeRegExp` relocation; ReDoS mechanism [CITED: OWASP]; last-hop IP parsing |
| AUTH-01 | Canonical JWT guard on every CMS route | 5 route-local duplicates verified at exact lines; **new finding:** `cms/blacklist/check` has NO auth; full 25-route inventory for the parameterized 401 test |
| AFF-01 | `base_url` restricted to http(s) at API boundary | Both write paths verified unvalidated (POST route.ts:57-81, PUT [id]/route.ts:32); `normalizeHttpUrl` exists in `src/lib/seo.ts:28-37` as reference; reject-400 pattern recommended |
| AFF-03 | Blacklist interceptor renders injection-safe warning page | 302→`/blocked?ref=` flow designed; ClickLog-as-ref re-resolution pattern (no schema change); current inline HTML verified at redirect route:54-95 |
</phase_requirements>

## Summary

This phase closes five security holes in a deployed brownfield Next.js 16.2.12 app. Every fix target was opened and read from source this session; the codebase map docs (CONCERNS.md, STACK.md, TESTING.md) proved accurate, and three findings beyond them materially affect planning: (1) the `npm run seed` script in `package.json:12` points directly at the file being deleted, so it must be removed in the same task; (2) the "per-user Gemini key from CMS settings" secondary source (D-07) is currently **phantom** — `SettingSchema` declares no `geminiApiKey` field, so the `as any` read in `generate-article/route.ts:94` is always undefined and Mongoose strict mode prevents the field from ever persisting — making D-07 work requires adding the field; (3) `src/app/api/v1/cms/blacklist/check/route.ts` is a CMS route with **no auth at all** (read-only lookup) — within AUTH-01's literal scope ("every CMS route verifies through the single canonical `getAuthUser`") and invisible to CONCERNS.md.

The remediation pattern is consistent across all seven requirements: delete or canonicalize rather than add. The auth fix removes 5 route-local `verifyAdminAuth` duplicates in favor of the existing canonical `getAuthUser(req)`; the XSS fix replaces an interpolated HTML string with a real React server component (React escapes text children by default — the injection class disappears structurally, no sanitizer needed on this path); the ReDoS fix relocates an `escapeRegExp` helper that already exists in `homepage-articles.ts:28-30` and applies it at the two unescaped `new RegExp(userInput)` sites. Nothing new is hand-rolled except one small generic function: the existing `rateLimit.ts` is a *failure-lockout* limiter (counts wrong passwords, locks the IP), not a request-cap limiter — public write endpoints need a new count-based function in that module following the same in-memory-Map pattern.

**Primary recommendation:** Execute as 5 workstreams in dependency order — (1) seed deletion + reset-admin CLI, (2) secrets cleanup + canonical auth (they touch the same 5 routes; do together), (3) `/blocked` page, (4) abuse controls (limiter + dedupe + escapeRegExp + IP fix), (5) scheme validation + CI gate + the new security test suite — with the Vitest gate test as the phase's regression backstop since `deploy.yml` already runs `npm test` before build.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seed endpoint removal + regression gate | API/Backend (route handlers) | CI (Vitest gate) | Destructive surface lives in route handlers; prevention gate runs in CI test step |
| Canonical JWT verification | API/Backend (`src/lib/auth.ts`) | — | Auth guard is a library function consumed by route handlers; no middleware involvement (proxy is CSP-only) |
| Secrets fail-fast | API/Backend (lazy getters in lib) | Ops (VPS env files) | D-06 mandates call-time throw, not startup validation; real secrets live only in VPS `.env.local` |
| `/blocked` warning page | Frontend Server (RSC) | API/Backend (redirect route) | Page is a React server component under site layout; DB lookup happens in the RSC; CSP owned by `proxy.ts` |
| Rate limiting / click dedupe | API/Backend (route handlers + `rateLimit.ts`) | Ops (PM2 single instance) | In-memory per-process Map; PM2 `instances: 1` fork mode is the hard prerequisite |
| Trusted client IP | API/Backend (`utils.ts`) | CDN/Nginx (header overwrite) | Code parses last hop; Nginx must overwrite XFF — two tiers, one decision (D-14) |
| `base_url` scheme validation | API/Backend (CMS write handlers) | — | Validate at the storage boundary; redirect route then only ever 302s to http(s) |

## Standard Stack

### Core (all already installed — this phase installs ZERO new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next (route handlers, `NextResponse.redirect`, proxy) | 16.2.12 | `/blocked` page, 302 redirect, CSP pipeline | Existing framework; Next 16 contract: `proxy.ts` = middleware, `params`/`searchParams` are Promises [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md; page.mdx] |
| jsonwebtoken | 9.0.3 | JWT verify via canonical `getAuthUser` only | Existing; CI gate bans `jwt.verify` outside `src/lib/auth.ts` |
| mongoose | 9.9.1 | ClickLog lookup for `/blocked?ref`, settings field addition | Existing models; hot-reload-safe registration pattern in `models.ts:313-324` |
| vitest + mongodb-memory-server | 4.1.10 / 11.2.0 | New security tests + CI grep gate as a test | Existing suite; handlers imported directly, no HTTP server [VERIFIED: .planning/codebase/TESTING.md] |
| Tailwind CSS 4 (PostCSS build) | 4.3.3 | `/blocked` page styling via build pipeline | Replaces Play CDN; already configured project-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest gate test for D-08 | `grep` step in deploy.yml | Test runs locally AND in CI (deploy.yml already runs `npm test` before build, line 21-22), gives actionable assertion output; grep step duplicates it. D-08 allows either — recommend the test |
| In-memory click dedupe Map | DB query per click (`ClickLogModel.findOne({ ip, link, clicked_at >= now-60s })`) | In-memory mirrors rateLimit/tokenBlacklist pattern, zero extra DB load, single-instance-safe; DB-based survives restarts but adds a query to every click. Recommend in-memory |
| React text children for `/blocked` | Reuse `sanitize-html` on blacklist fields | Sanitizer is for rich HTML; here the data is plain text rendered as text — React escaping is the simpler, structurally safe mechanism |

**Installation:**
```bash
# None. No new dependencies. All work uses installed packages.
```

## Package Legitimacy Audit

> This phase installs **no external packages** — every task uses dependencies already in `package.json` (next, jsonwebtoken, mongoose, vitest). No legitimacy gate run required; no [ASSUMED] package names introduced.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none added) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram — current vs fixed flows

```text
CURRENT (vulnerable)                                     FIXED (this phase)
─────────────────────────                                ─────────────────────────
GET /api/v1/seed ──────────────▶ deleteMany(all)         (route deleted; 404 by
   unauthenticated                  + admin/password123    framework; gate test +
                                                          CI grep block re-adds)
POST /api/v1/cms/blacklist ───▶ jwt.verify(FALLBACK_1)   getAuthUser(req) ─▶
   forgeable admin token         'nexus_super_...'       src/lib/auth.ts verify
                                                          (canonical secret +
                                                          logout blacklist check)
GET /api/v1/public/tracking/  ─▶ inline HTML string      302 ▶ /blocked?ref=<clickLogId>
redirect  (blacklisted)          unescaped + Tailwind    ▶ RSC resolves ClickLog ▶
                                 Play CDN, NO CSP        link ▶ blacklist ▶ React
                                                         text children, CSP applied
POST /api/v1/public/insider ──▶ no rate limit            consume(ip) ▶ over-cap ▶ 429
GET  .../tracking/redirect ───▶ no rate limit            consume(ip) flood cap +
POST .../tracking/click ──────▶ no dedupe                dedupe(ip+link,60s) ▶ skip
                                                         record, still 302/200
GET /api/v1/public/articles   ─▶ new RegExp(q,'i')       new RegExp(escapeRegExp(q),'i')
?search=<evil regex>             ReDoS hang              literal-only pattern
```

### `/blocked` data flow (recommended ref-resolution, no schema change)

```text
Click (blacklisted link)
  ▼
redirect route: ClickLogModel.create(...) + $inc click_count   (unchanged — logged BEFORE blacklist check, redirect/route.ts:34-47)
  ▼
checkUrlAgainstBlacklist(base_url) → isBlacklisted
  ▼
NextResponse.redirect(new URL(`/blocked?ref=${clickLog.id}`, req.url), 302)
  ▼
/blocked page (async server component)
  await searchParams → ref
  validate: mongoose.isValidObjectId(ref)  (helper exists: utils.ts:52-54)
  ▼                                    ▼ invalid → NextResponse.redirect('/') or notFound()
  ClickLogModel.findById(ref) → affiliate_link_id
  ▼
  AffiliateLinkModel.findById(link_id)
  ▼
  link.status === 'blacklisted' || checkUrlAgainstBlacklist(link.base_url).isBlacklisted
  ▼
  render projectName / reason / blockedCountries as React text children
  (link un-blacklisted since click → render generic "link no longer blocked" + link home)
```

Why ClickLog-as-ref works without schema changes: the redirect route already creates the ClickLog **before** the blacklist check [VERIFIED: src/app/api/v1/public/tracking/redirect/route.ts:34-47], so every blacklisted click has a log row carrying `affiliate_link_id`; the page re-resolves current blacklist state from that. No attacker-controlled text ever enters the URL — only a 24-hex ObjectId. Alternative (rejected for scope): persist `project_name`/`reason` snapshot onto the ClickLog at click time — requires schema migration for historical rows.

### Recommended new/changed files

```text
src/
├── app/
│   ├── blocked/page.tsx                      # NEW — async RSC, awaits searchParams, robots noindex
│   └── api/v1/
│       ├── seed/route.ts                     # DELETE
│       └── v1/
│           ├── cms/ai/generate-article/route.ts   # swap verifyAdminAuth→getAuthUser; strip secrets
│           ├── cms/blacklist/{route,quick-blacklist,import,import-sheet-url}/route.ts  # same swap
│           ├── cms/blacklist/check/route.ts       # add getAuthUser (new finding)
│           ├── cms/affiliate-links/route.ts       # + scheme validation (POST)
│           ├── cms/affiliate-links/[id]/route.ts  # + scheme validation (PUT)
│           └── public/
│               ├── insider/route.ts               # + rate limit (429)   [subscribe aliases this POST]
│               └── tracking/{click,redirect}/route.ts  # + rate limit + dedupe; redirect → /blocked
├── lib/
│   ├── auth.ts                               # unchanged (canonical)
│   ├── rateLimit.ts                          # + generic count-based limiter (keep failure-lockout API)
│   ├── utils.ts                              # getClientIp last-hop fix; + escapeRegExp (moved here)
│   ├── gemini.ts                             # strip fallback key + project ID; required-key path
│   ├── blacklist.ts                          # escapeRegExp at :139
│   ├── db/
│   │   ├── models.ts                         # + gemini_api_key field on SettingSchema (D-07)
│   │   ├── seed-mongodb.ts                   # DELETE
│   │   └── seed.ts                           # DELETE
│   └── homepage-articles.ts                  # import escapeRegExp from utils (remove local copy)
└── proxy.ts                                  # unchanged (matcher already correct)
scripts/
└── reset-admin.ts                            # NEW — modeled on scripts/create-admin.ts
tests/
├── api/cms-auth-401.test.ts                  # NEW — parameterized, all 25 CMS routes
├── api/security-regressions.test.ts          # NEW — seed-path absence + secret-fallback gate
├── api/tracking-redirect.test.ts             # UPDATE — blacklisted branch asserts 302→/blocked
└── ...
package.json                                 # remove "seed" script (points at deleted file)
DEPLOY.md                                    # + reset-admin usage; Nginx XFF overwrite directive
```

### Pattern 1: Canonical auth swap (exact current duplicate shape)

**What:** Replace per-route JWT verification with the canonical guard.
**When to use:** All 5 fallback routes; also add to `blacklist/check`.
**Example:**

```typescript
// Source: canonical implementation at src/lib/auth.ts:48-55 (read this session)
export function getAuthUser(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);   // checks in-memory logout blacklist FIRST (auth.ts:39)
}
```

```typescript
// DELETE this block from each of the 5 routes (shape identical in all;
// literal differs: 'affiliate_secret_key_v3_super_secure' in generate-article,
// 'nexus_super_secret_jwt_key_2026' in the 4 blacklist routes):
const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';
async function verifyAdminAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch { return null; }
}
```

The duplicates differ from canonical in two security-relevant ways: they skip the logout token-blacklist check (`verifyToken` calls `isBlacklisted` at auth.ts:39), and they verify against a *different* secret than the rest of the CMS even when `JWT_SECRET` is set. Note the generate-article duplicate reads `headers()` from `next/headers` instead of the `req` argument — the swap must pass the handler's `NextRequest` to `getAuthUser` (same `Request` interface).

### Pattern 2: Lazy env getter (extend, don't replace — D-06)

```typescript
// Source: src/lib/auth.ts:9-14 (verbatim)
function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Provide it via the JWT_SECRET environment variable.');
  }
  return process.env.JWT_SECRET;
}
```

For the Gemini key the fail-fast already exists at `gemini.ts:79-81` (`if (!apiKey) throw new Error(...)`) — removing the default-parameter fallback literal at line 75 activates it. Message should follow the existing bilingual actionable style (point to env var + CMS settings).

### Pattern 3: Count-based rate limiter (new function, same module/pattern)

**What:** The existing limiter counts *failures* with lockout — wrong shape for public endpoints where the request *succeeds*. Add a windowed request counter alongside it.
**When to use:** All 3 public write endpoints (D-12).
**Example:**

```typescript
// Shape to add inside src/lib/rateLimit.ts — mirrors the in-memory Map +
// lazy-prune pattern of rateLimit.ts/tokenBlacklist.ts (single-instance contract:
// ecosystem.config.js instances:1, exec_mode:'fork' must not change).
const windows = new Map<string, { count: number; windowStart: number }>();

export interface ConsumeResult { allowed: boolean; retryAfterSeconds?: number }
export function consumeRequest(key: string, limit: number, windowMs: number): ConsumeResult {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    windows.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.windowStart + windowMs - now) / 1000) };
  }
  return { allowed: true };
}
// Lazy pruning on read (same idea as tokenBlacklist.ts:20-23): entries older than
// the window are replaced on next touch; optionally sweep on insert to bound memory.
```

**Suggested thresholds** (D-13 delegated; tune in plan review):
- `subscribe:<ip>` — limit 5 / 60s → over-limit = hard `429` + `Retry-After` header (matches login route's `tooManyRequests` helper shape, `login/route.ts:8-13`).
- `click:<ip>` / `redirect:<ip>` — flood cap 60 / 60s; over-cap requests still complete (302/200) but skip the ClickLog insert and `$inc` so analytics don't inflate; no 429.
- Dedupe (separate mechanism from the cap): in-memory `Map<"${ip}:${affiliateLinkId}", lastSeenAt>` with 60s window → duplicate = skip insert + skip `$inc`, still return success/302.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XSS-safe rendering of blacklist text | String-template HTML with manual escaping | React server component text children | React escapes all interpolated text; raw-HTML injection requires `dangerouslySetInnerHTML`, which this page must not use [CITED: react.dev reference/react-dom/components/common — "Unless the markup is coming from a completely trusted source, it is trivial to introduce an XSS vulnerability this way"] |
| Regex-escaping user input | Custom char filter | Move existing `escapeRegExp` from `homepage-articles.ts:28-30` to `utils.ts` | Already written, already proven in this codebase; literal-only patterns cannot backtrack-explode [CITED: OWASP ReDoS] |
| Object ID validation for `ref` | Hand-rolled hex check | `isValidObjectId` (`utils.ts:52-54`) or `mongoose.isValidObjectId` (used in redirect route today) | Already the codebase convention |
| Rate limiting | Per-endpoint ad-hoc timers | Extend `src/lib/rateLimit.ts` pattern | Established in-memory Map + single-instance documentation; consistent audit surface |
| http(s) URL validation | Regex scheme check | `new URL()` + `protocol` check (as `normalizeHttpUrl` does, `src/lib/seo.ts:28-37`) | `new URL` throws on malformed input — a regex can be bypassed by encoding tricks |

**Key insight:** every fix in this phase has an in-repo reference implementation (auth.ts guard, rateLimit.ts Map, escapeRegExp, normalizeHttpUrl, sanitize.ts for context). The phase is deletion + relocation + one new limiter function — not invention.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — seed route never persisted a marker; ClickLog rows already carry `affiliate_link_id` needed by `/blocked`; no data migration anywhere in this phase | None |
| Live service config | **VPS Nginx config is not in git** — DEPLOY.md §8 documents `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (append = spoofable). The overwrite fix must be applied on the VPS (`/etc/nginx/sites-available/websiteafiliate`, then `nginx -t && systemctl reload nginx`) as a documented manual step; Certbot may have restructured the file into 80/443 blocks (DEPLOY.md §9 warns directives must exist in both). Also: `JWT_SECRET` on the VPS differs from dev (DEPLOY.md:111) — after the fix, tokens signed with either fallback literal stop working everywhere (intended); sessions signed with the canonical prod secret survive | Code + DEPLOY.md docs; VPS edit is a manual ops step to list in the plan's deployment notes |
| OS-registered state | PM2 `ecosystem.config.js` (`instances:1`, `fork`) — prerequisite for in-memory limiter/blacklist; deploy.yml does `pm2 delete` + `pm2 start` (lines 83-84), which wipes in-memory rate-limit/blacklist state on every deploy | Do not change; note state loss is accepted and self-heals (entry maps rebuild empty) |
| Secrets/env vars | `JWT_SECRET` (canonical, stays); `GEMINI_API_KEY` (becomes the primary source); `INSIDER_TOKEN_SECRET`, `RESEND_API`, `MONGODB_URI` (untouched). Required-secrets failure must stay lazy (D-06) so `npm run build`, CI, and `npm test` never need real secrets — `tests/setup.ts:5-6` sets test-only `JWT_SECRET` before imports | Code edit only; no key renames |
| Build artifacts | None affected — no compiled assets, no package installs; `package.json` "seed" script edit is source-level | None |

**The canonical question:** after every file is updated, the only runtime systems holding old state are (a) the VPS Nginx XFF directive (manual config change) and (b) browser-held JWTs signed with fallback secrets, which simply start failing 401 (correct outcome, no migration).

## Common Pitfalls

### Pitfall 1: Deleting `seed-mongodb.ts` breaks `npm run seed`
**What goes wrong:** `package.json:12` is `"seed": "tsx src/lib/db/seed-mongodb.ts"` — deleting the file leaves a broken npm script.
**Why it happens:** the npm script is outside `src/` and easy to miss in a file-tree cleanup.
**How to avoid:** remove (or repoint) the `seed` script in the same task as the file deletions. Given "dọn dẹp triệt để" and that no generic wipe-and-reseed CLI *should* exist, removal is the clean choice; `scripts/seed-*.ts` remain the only seeding path [VERIFIED: package.json:12; scripts/ dir contains only content-specific seeders + create-admin].
**Warning signs:** `npm run seed` → "Cannot find module '/…/src/lib/db/seed-mongodb.ts'".

### Pitfall 2: The settings-doc Gemini key path is currently phantom
**What goes wrong:** D-07 wants "per-user key from CMS settings" as the only secondary source, but `SettingSchema` (models.ts:269-298) declares **no** `geminiApiKey` field; the read at `generate-article/route.ts:94-95` uses `(dbSetting as any)` and always yields `undefined`. Under Mongoose default strict mode the field can never be persisted through `SettingModel` either.
**Why it happens:** the code was written against an assumed schema field that was never added.
**How to avoid:** implement D-07 requires: add the field to `SettingSchema`, accept it in `PUT /api/v1/cms/settings` (admin-only already), and read it in the key-resolution chain. **Never return the raw key from `GET /api/v1/cms/settings`** — that route's GET has no auth check [VERIFIED: cms/settings/route.ts:6-62], so echoing the key would publish it; return a masked hint (e.g. last 4 chars) or omit.
**Warning signs:** admin saves a key in settings, generation still reports missing key.

### Pitfall 3: Adding rate limits breaks the existing insider-lifecycle test
**What goes wrong:** `tests/api/insider-lifecycle.test.ts` calls the subscribe POST handler multiple times from the same default IP (`getClientIp` returns `'127.0.0.1'` when no headers [VERIFIED: utils.ts:57-67]); the in-memory limiter is module-level state shared across tests in a file (`fileParallelism: false` shares the process). A 5/min/IP subscribe limit can trip mid-suite.
**How to avoid:** design the new limiter with a reset affordance (e.g. exported `_resetForTests()` or reuse `resetRateLimit(key)`) and call it in `beforeEach` of affected suites; or have tests send distinct `X-Forwarded-For` headers per scenario. Same caution applies to new click/redirect tests.
**Warning signs:** previously-green lifecycle tests start getting 429 or silently skipping writes after the limiter lands.

### Pitfall 4: `NextResponse.redirect` requires an absolute URL and defaults to 307
**What goes wrong:** `NextResponse.redirect('/blocked?ref=x')` throws; and the default status is 307, not 302 — the current fallback path in the redirect route returns 307 [VERIFIED: tests/api/tracking-redirect.test.ts:62 comment "NextResponse.redirect default status"].
**How to avoid:** always `new URL('/blocked?ref=…', req.url)` and pass `302` explicitly (the healthy path already does: `NextResponse.redirect(destinationUrl, 302)`, redirect/route.ts:102).
**Warning signs:** "Invalid URL" at runtime, or tests asserting 302 receiving 307.

### Pitfall 5: The CI gate must not ban legitimate `|| '` defaults
**What goes wrong:** a naive grep for `|| '` would fail the build on `searchParams.get('page') || '1'`-style defaults everywhere.
**How to avoid:** scope the gate to secret env names (`JWT_SECRET`, `GEMINI_API_KEY`, `MONGODB_URI`, `INSIDER_TOKEN_SECRET`, `RESEND_API`, …) and to `jwt.verify`/`jwt.sign` outside `src/lib/auth.ts`; run it over `src/` only (tests legitimately set dummy secrets). D-08's own wording: `|| '`-style fallbacks **on secrets**.
**Warning signs:** gate fails on unrelated PRs; developers add `eslint-disable`-style carve-outs and the gate erodes.

### Pitfall 6: Forgetting the token-blacklist asymmetry the duplicates introduce
**What goes wrong:** the 5 duplicate guards never check the logout blacklist — a logged-out token still works on blacklist CRUD/AI routes today [VERIFIED: CONCERNS fragile #1; auth.ts:39 canonical check]. Success criterion 2 requires uniform revocation.
**How to avoid:** the swap to `getAuthUser` fixes it automatically — do not preserve the duplicates' `headers()`-based variant for convenience.
**Warning signs:** logout test passes on canonical routes but the same token still authorizes `/cms/blacklist`.

### Pitfall 7: CSP matcher assumption for the new page
**What goes wrong:** assuming the new `/blocked` page needs CSP work in `proxy.ts`.
**How to avoid:** none needed — the matcher `/((?!api|_next/static|_next/image|favicon.ico).*)` already covers every non-`/api` path [VERIFIED: src/proxy.ts:37-41]; the warning page lost CSP only because it lived under `/api/**`. Moving it to `/blocked` restores CSP with zero proxy changes. Do not add any third-party script tag (would need a nonce + CSP entry).

## Code Examples

### The exact fix target — inline HTML warning page being replaced
```typescript
// Source: src/app/api/v1/public/tracking/redirect/route.ts:54-61, 74, 78 (current, vulnerable — excerpt)
const warningHtml = `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    ...
    <script src="https://cdn.tailwindcss.com"></script>          // ← Play CDN, third-party script, no CSP
  </head>
  ...
  Đường dẫn tới dự án <strong class="text-rose-400">${projectName}</strong> ...  // ← unescaped interpolation
  ...
  <strong class="text-slate-200">Lý do chặn:</strong> ${reason}   // ← attacker-controlled via imported sheet
`;
return new Response(warningHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
```

### The replacement — `/blocked` page skeleton (Next 16 contract)
```typescript
// Source: Next 16 bundled docs (searchParams is a Promise):
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.mdx —
//   "searchParams: Promise<{ [key: string]: string | string[] | undefined }>"
//   "const filters = (await searchParams).filters"
// src/app/blocked/page.tsx
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel } from '@/lib/db/models';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';

export const metadata = { title: 'Cảnh Báo An Toàn', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic'; // DB-backed per-request page (app is fully dynamic anyway)

export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { ref } = await searchParams;
  const rawRef = typeof ref === 'string' ? ref : '';
  if (!/^[0-9a-fA-F]{24}$/.test(rawRef)) {
    return NextResponse.redirect(new URL('/', 'http://localhost')); // or redirect('/'); validate 24-hex ObjectId
  }
  await connectToDatabase();
  const log = await ClickLogModel.findById(rawRef);
  const link = log?.affiliate_link_id ? await AffiliateLinkModel.findById(log.affiliate_link_id) : null;
  const check = link ? await checkUrlAgainstBlacklist(link.base_url) : { isBlacklisted: false };
  const blocked = link?.status === 'blacklisted' || check.isBlacklisted;
  if (!blocked) {
    return NextResponse.redirect(new URL('/', 'http://localhost'));
  }
  const projectName = check.projectName || link!.name;
  const reason = check.reason || 'Nền tảng vi phạm chính sách an toàn / bùng hoa hồng';
  const countries = check.blockedCountries ?? [];
  // Render projectName/reason/countries as React text children — escaped by React.
  // Site theme + CSP arrive automatically (root layout + proxy.ts).
  return (
    <main>{/* Vietnamese warning copy matching the current inline page, D-11 */}</main>
  );
}
```
(Note: inside a page component use `redirect()` from `next/navigation` rather than returning a `NextResponse`; the skeleton shows the guard shape — the executor picks `redirect('/')` per Next 16 docs.)

### `getClientIp` last-hop fix (D-14)
```typescript
// Source: src/lib/utils.ts:57-67 (current, spoofable — verbatim)
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();   // ← trusts FIRST (client-controlled) entry
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}
// Fix: return forwarded.split(',').pop()!.trim()  (last = appended by the most-recent
// trusted proxy) — combined with the Nginx overwrite below, XFF holds exactly one
// attacker-unforgeable value.
```

### Nginx overwrite (D-14, paired with the code fix)
```nginx
# Source: DEPLOY.md:195 (current) — $proxy_add_x_forwarded_for APPENDS remote_addr to the
# client-supplied chain [CITED: nginx.org ngx_http_proxy_module — "$proxy_add_x_forwarded_for:
# the 'X-Forwarded-For' client request header field with the $remote_addr variable appended
# to it, separated by a comma"].
# Fix — proxy_set_header 'allows redefining or appending fields to the request header
# passed to the proxied server' [CITED: same page]; assigning $remote_addr REDEFINES:
proxy_set_header X-Forwarded-For $remote_addr;   # overwrite, not append
```

### ReDoS fix sites (exactly two unescaped sites remain)
```typescript
// Site 1: src/app/api/v1/public/articles/route.ts:34 (public, unauthenticated)
const regex = new RegExp(searchKeyword.trim(), 'i');
// Site 2: src/lib/blacklist.ts:139 (admin/sheet input, still fix per CONCERNS #6)
const searchRegex = new RegExp(rootDomain || hostname || targetDomainOrUrl, 'i');
// Reference implementation to relocate to utils.ts — src/lib/homepage-articles.ts:28-30 (verbatim):
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Mechanism [CITED: OWASP ReDoS]: "Evil Regex" = grouping with repetition + inside the
// repeated group, repetition or overlapping alternation (e.g. (a+)+$) — exponential
// backtracking. Escaping all metacharacters makes the pattern literal-only; combine with
// a length cap (e.g. reject search terms > 100 chars) as defense in depth.
```

### `base_url` scheme validation (AFF-01)
```typescript
// Current: src/app/api/v1/cms/affiliate-links/route.ts:57-66 accepts any string;
// [id]/route.ts:32 assigns body.base_url unchecked. Reference logic — src/lib/seo.ts:28-37
// normalizeHttpUrl silently falls back; at the API boundary we want a 400 instead:
function assertHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}
// Apply on POST (finalBaseUrl, and finalProductUrl when present) and PUT (when base_url
// provided) → 400 'base_url phải là URL http/https'. Blocks javascript:/data: reaching
// the 302 redirect and the Jina scrape target.
```

### CI secret gate as a Vitest test (D-08 — runs in deploy.yml line 21-22 already)
```typescript
// tests/api/security-regressions.test.ts (shape)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');
function walk(dir: string): string[] { /* recursive .ts/.tsx paths */ }

describe('SEC-02 secret-fallback regression gate (D-08)', () => {
  it('never verifies JWT outside src/lib/auth.ts', () => {
    const offenders = walk(SRC).filter(f => !f.includes('lib\\auth.ts') && !f.includes('lib/auth.ts'))
      .filter(f => /jwt\.(verify|sign)\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('has no fallback literals on secret env reads', () => {
    const secretEnv = /process\.env\.(JWT_SECRET|GEMINI_API_KEY|MONGODB_URI|INSIDER_TOKEN_SECRET|RESEND_API)/;
    const offenders = walk(SRC).filter(f => {
      const src = readFileSync(f, 'utf8');
      return secretEnv.test(src) && /\|\|\s*['"`]/.test(src.slice(Math.max(0, src.search(secretEnv) - 40), src.search(secretEnv) + 200));
    });
    expect(offenders).toEqual([]);   // scope the window check tightly — see Pitfall 5
  });
  it('seed route stays deleted (D-03)', () => {
    const seedDir = join(SRC, 'app', 'api', 'v1', 'seed');
    expect(() => statSync(seedDir)).toThrow();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` | `proxy.ts` exporting `proxy()` | Next.js 16 | Repo already migrated; new page needs no proxy work [VERIFIED: bundled docs 16-proxy.md — "Starting with Next.js 16, Middleware is now called Proxy"] |
| Sync `params`/`searchParams` | Promise props awaited in async components | Next.js 15/16 | `/blocked` page must `await searchParams` [VERIFIED: bundled page.mdx] |
| `proxy_add_x_forwarded_for` (append) | `$remote_addr` (redefine) for single-trusted-proxy setups | long-standing nginx semantics | DEPLOY.md §8 template must change; nginx docs confirm redefine-on-assign [CITED: nginx.org] |
| Tailwind Play CDN | Build-pipeline Tailwind (PostCSS) | Play CDN always "not for production" | `/blocked` styled by the normal build; third-party script origin removed |

**Deprecated/outdated:**
- Inline-HTML-string responses from route handlers for user-facing pages — replaced by real routes (this phase's D-09/D-10).
- Per-route JWT secrets — replaced by the canonical guard (AUTH-01 contract).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Suggested thresholds (subscribe 5/60s; click/redirect flood cap 60/60s; 60s dedupe window) are reasonable starting points for 50–100 concurrent users | Architecture Patterns → Pattern 3 | Too tight = real users hit 429 / lost clicks; too loose = abuse persists. Tunable after deploy; user delegated specifics |
| A2 | ClickLog-ref re-resolution (vs persisting blacklist snapshot on the log row) gives acceptable `/blocked` fidelity — e.g. if a link is un-blacklisted between click and page render, the page bounces home | Architecture Patterns → /blocked flow | Minor UX oddity in a rare race; alternative needs a schema migration for historical rows |
| A3 | The VPS Nginx config matches the DEPLOY.md §8 template (single Nginx, no CDN in front) | Runtime State Inventory | If a CDN/extra proxy sits in front, last-hop parsing trust assumptions change; deploy checklist should verify with `nginx -T` |
| A4 | `GET /api/v1/cms/settings` being unauthenticated is an oversight, not a contract — the parameterized 401 test should assert authed verbs only, and the planner may lock GET too (it currently leaks site settings metadata publicly) | Code Examples → gate notes; AUTH-01 | If some public consumer fetches cms/settings directly, locking it breaks that consumer (public settings exist at `/api/v1/public/settings`) |
| A5 | Adding `gemini_api_key` to `SettingSchema` + settings PUT is the minimal D-07 implementation; the admin UI input for it may already exist or be added later (UI change not locked) | Pitfall 2 | If the admin UI never sends it, the secondary source exists but is unused (env stays primary — still spec-compliant) |
| A6 | No E2E/HTTP-level test needed for "GET /api/v1/seed returns 404" — Next.js 404s unknown API routes by framework behavior; the file-absence + grep-gate assertions are sufficient regression guards (D-03 spirit) | Validation Architecture | If someone adds a *different* destructive route under another path, only the destructive-op grep gate (recommended extension) catches it |

## Open Questions

1. **`blacklist/check` route: guard or relocate?**
   - What we know: `POST /api/v1/cms/blacklist/check` performs a read-only blacklist lookup with zero auth [VERIFIED: file read this session]; AUTH-01's contract says *every* CMS route goes through `getAuthUser`.
   - What's unclear: whether the admin UI calls it with the Bearer header (almost certainly yes — the shared admin fetch attaches the token).
   - Recommendation: add `getAuthUser` (one line + 401 branch); keep the path.

2. **Lock `GET /api/v1/cms/settings`?**
   - What we know: it is currently public; `/api/v1/public/settings` already serves the public use case.
   - Recommendation: out of the audit's explicit scope — leave behavior, but exclude it from the parameterized 401 list with a comment, or lock it in the same task as AUTH-01 (planner's call).

3. **Fate of `mongodb.ts:16-27` env-file parsing fallback**
   - What we know: CONCERNS #3/tech-debt #8 flag it as a dev-only crutch in production paths; deploy.yml copies `.env.local`/`mongodb.env` into the app dir, so the fallback is load-bearing on the VPS today.
   - Recommendation: leave untouched this phase (MONGODB_URI isn't one of the literals D-05 lists); revisit in a hygiene phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all build/test | ✓ (local) | v25.9.0 local; VPS Node 22 via CI `setup-node@v4` | — |
| npm | CI install | ✓ | 11.12.1 | — |
| Next.js | framework | ✓ | 16.2.12 (exact, pinned in package.json) | — |
| Vitest | tests + gate | ✓ | 4.1.10 | — |
| mongodb-memory-server | route tests | ✓ | 11.2.0 (downloads mongod binary on first run — already cached in CI) | — |
| Mongoose | models | ✓ | 9.9.1 | — |
| Nginx (VPS) | D-14 header overwrite | n/a — remote manual step | documented in DEPLOY.md §8/§9 | document-only change if VPS edit deferred |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 + mongodb-memory-server 11.2.0 |
| Config file | `vitest.config.mts` (node env, `fileParallelism: false`, 20s timeout) |
| Quick run command | `npx vitest run tests/api/cms-auth-401.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Former seed path absent; no `deleteMany({})` on user/settings models in any API route | gate (fs + grep assertions) | `npx vitest run tests/api/security-regressions.test.ts` | ❌ Wave 0 |
| SEC-01/OPS-03 | Every CMS route 401s without a token (parameterized over 25 routes) | integration | `npx vitest run tests/api/cms-auth-401.test.ts` | ❌ Wave 0 |
| AUTH-01 | A JWT signed with a previously-hardcoded fallback secret is rejected 401 on all 5 fixed routes; logout-blacklisted token rejected uniformly | integration | same file as above (craft token with the old literal, assert 401) | ❌ Wave 0 |
| SEC-02 | No secret fallback literals in `src/` (gate) | gate | `tests/api/security-regressions.test.ts` | ❌ Wave 0 |
| SEC-03/AFF-03 | Blacklisted click → 302 to `/blocked?ref=<24-hex>`; `/blocked` renders blacklist text inert (assert rendered output contains escaped/encoded form, never raw `<script>`) and response CSP header present | integration + unit | `npx vitest run tests/api/tracking-redirect.test.ts` + new `/blocked` page test | ❌ Wave 0 (update existing `tracking-redirect.test.ts:83-96` which currently asserts inline HTML `Đã Chặn Liên Kết Rủi Ro`) |
| SEC-04 | ReDoS pattern (`(a+)+$`-class input) against `/api/v1/public/articles?search=` returns quickly (time-boxed assertion) with escaped pattern applied | unit/integration | `npx vitest run tests/lib/redos.test.ts` | ❌ Wave 0 |
| SEC-04 | Subscribe over-limit → 429 with Retry-After; click/redirect duplicates within 60s window create ONE ClickLog and one `$inc` (assert via `ClickLogModel.countDocuments` + `click_count`) | integration | `npx vitest run tests/api/rate-limit.test.ts` | ❌ Wave 0 |
| SEC-04 | `getClientIp` returns LAST XFF entry (spoofed first entry ignored) | unit | `npx vitest run tests/lib/client-ip.test.ts` | ❌ Wave 0 |
| AFF-01 | `base_url: 'javascript:alert(1)'` / `'data:…'` / non-URL on POST+PUT affiliate-links → 400, DB unchanged | integration | `npx vitest run tests/api/affiliate-links-scheme.test.ts` | ❌ Wave 0 |
| D-04 | `scripts/reset-admin.ts` upserts admin with new password hash | smoke (tsx) | manual on VPS; optional vitest smoke calling its main() against memory Mongo | ❌ optional |

### Sampling Rate
- **Per task commit:** `npx vitest run <affected-file>` (fast, no full-suite requirement)
- **Per wave merge:** `npm test` (full suite; ~10 existing + new files, serial ~2–4 min)
- **Phase gate:** full suite green in CI before deploy (deploy.yml already enforces `npm test` at line 21-22 — the gate ships with the phase)

### Wave 0 Gaps
- [ ] `tests/api/security-regressions.test.ts` — SEC-01/SEC-02 gates + seed-absence (D-03/D-08)
- [ ] `tests/api/cms-auth-401.test.ts` — parameterized 401 + fallback-secret-token rejection (AUTH-01)
- [ ] Update `tests/api/tracking-redirect.test.ts` blacklisted-branch assertions to the new 302→`/blocked` contract
- [ ] `tests/lib/redos.test.ts`, `tests/lib/client-ip.test.ts`, `tests/api/rate-limit.test.ts`, `tests/api/affiliate-links-scheme.test.ts`
- [ ] Rate-limiter test reset affordance (see Pitfall 3) before any rate-limited endpoint test lands
- No framework install needed — infrastructure complete.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | bcryptjs (existing) + canonical `getAuthUser`; `scripts/reset-admin.ts` for recovery |
| V3 Session Management | yes | JWT 24h via `signToken`; logout revocation via `tokenBlacklist` now uniform across all CMS routes (D-15 keeps localStorage — out-of-scope migration deferred) |
| V4 Access Control | yes | `getAuthUser` + role checks (`admin`-only link writes, admin/editor AI generation) — preserved verbatim during the auth swap |
| V5 Input Validation | yes | scheme validation via `new URL()` protocol check (AFF-01); ObjectId validation for `/blocked?ref`; email regex (existing); ReDoS-safe literal-only RegExp |
| V6 Cryptography | no new | `jsonwebtoken` HS256 verify centralized in `auth.ts`; no hand-rolled crypto anywhere in this phase |
| V14 Configuration | yes | Secrets env-only with lazy throw (D-06); CI gate prevents secret re-entry (D-08); CSP already per-request via `proxy.ts` |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated destructive endpoint | Tampering/Elevation | Delete route; fs-absence + destructive-op grep gates (D-01/D-03/D-08) |
| Forgeable JWT via fallback secret | Spoofing | Canonical verify with single secret; gate bans `jwt.verify` outside `auth.ts`; old-literal tokens now 401 |
| Stored XSS via imported blacklist sheet | Tampering | Real RSC page, React-escaped text, no `dangerouslySetInnerHTML`, CSP active, no third-party script |
| Regex injection (ReDoS) | DoS | `escapeRegExp` on all user-text→RegExp; input length cap |
| Credential stuffing / email bombing via public writes | DoS | Per-IP window limiter: subscribe hard 429; click/redirect dedupe without 429 |
| IP spoofing via XFF | Spoofing | Nginx `$remote_addr` overwrite + last-hop parsing in `getClientIp` |
| `javascript:` URI redirect | Spoofing/Tampering | http(s)-only `base_url` enforced at CMS write boundary |

## Sources

### Primary (HIGH confidence)
- Repo source files, opened and read this session: `src/app/api/v1/seed/route.ts`, `src/lib/db/seed-mongodb.ts`, `src/lib/db/seed.ts`, `src/lib/auth.ts`, `src/lib/rateLimit.ts`, `src/lib/utils.ts`, `src/lib/tokenBlacklist.ts`, `src/lib/blacklist.ts`, `src/lib/gemini.ts` (lines 60-130, 190-208), `src/lib/seo.ts` (1-80), `src/lib/homepage-articles.ts` (1-60), `src/lib/db/mongodb.ts`, `src/lib/db/models.ts` (95-327), `src/proxy.ts`, `src/app/layout.tsx` (1-110), `next.config.ts`, `src/app/api/v1/public/tracking/redirect/route.ts`, `.../tracking/click/route.ts`, `.../subscribe/route.ts`, `.../insider/route.ts`, `.../public/articles/route.ts`, `.../public/articles/by-category/route.ts`, `.../cms/ai/generate-article/route.ts`, `.../cms/blacklist/route.ts`, `.../cms/blacklist/check/route.ts`, `.../cms/affiliate-links/route.ts`, `.../cms/affiliate-links/[id]/route.ts`, `.../cms/settings/route.ts`, `.../auth/login/route.ts`, `.github/workflows/deploy.yml`, `package.json`, `vitest.config.mts`, `tests/setup.ts`, `tests/api/tracking-redirect.test.ts`, `tests/api/auth-login.test.ts`, `scripts/create-admin.ts`, `scripts/seed-finance-ai-articles.ts` (1-60), `DEPLOY.md` (100-293), `specv2.md` (78-117)
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — proxy convention/matcher
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.mdx` — Promise searchParams contract

### Secondary (MEDIUM confidence)
- nginx.org `ngx_http_proxy_module.html` — `proxy_set_header` redefine semantics; `$proxy_add_x_forwarded_for` append behavior (webfetch, full directive text)
- react.dev `reference/react-dom/components/common` — `dangerouslySetInnerHTML` as the XSS pre condition; text children safe
- OWASP Community page — Regular expression Denial of Service (ReDoS): Evil Regex anatomy, regex-injection attack vector

### Tertiary (LOW confidence)
- None — no training-data-only claims retained; all uncertain items are logged as [ASSUMED] above.

## Metadata

**Confidence breakdown:**
- Fix-target inventory (files/lines/literals): HIGH — every target read from source this session; fallback literals grep-verified across all 7 locations
- Framework contracts (proxy, Promise params, redirect): HIGH — verified in bundled Next 16.2.12 docs and existing passing tests
- Rate-limit/dedupe design: HIGH on mechanism, MEDIUM on exact thresholds (delegated by user, marked A1)
- Ops-side items (VPS Nginx): MEDIUM — documented config, actual VPS file not inspectable from here (A3)

**Research date:** 2026-09-14
**Valid until:** 2026-10-14 (stable brownfield; re-verify only if deps bump)
