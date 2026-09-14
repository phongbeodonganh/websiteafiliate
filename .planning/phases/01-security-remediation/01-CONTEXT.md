# Phase 1: Security Remediation - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the critical security holes in the deployed brownfield Next.js 16 app: the unauthenticated destructive seed route, forgeable CMS auth via hardcoded fallback JWT secrets, secret literals in source, the XSS vector on the blacklist warning page, and public-endpoint abuse (rate limiting, ReDoS, URL scheme validation). Requirements in scope: SEC-01, SEC-02, SEC-03, SEC-04, AUTH-01, AFF-01, AFF-03 (per ROADMAP Phase 1). This phase closes gaps in an already-deployed system — it does not redesign auth or refactor the admin app.

</domain>

<decisions>
## Implementation Decisions

### Seed Route (SEC-01)
- **D-01:** Delete `/api/v1/seed` route entirely (`src/app/api/v1/seed/route.ts`). No gated replacement — the CLI seeding path already exists.
- **D-02:** Clean up ALL overlapping seed code paths when deleting the route: delete `src/lib/db/seed-mongodb.ts` and the dead `src/lib/db/seed.ts` wrapper too; keep only the CLI script (`scripts/seed-*.ts`) as the single seeding source.
- **D-03:** Add a regression test asserting that any request to the former seed path (and any destructive route without a token) is rejected (404/401) — guards against someone re-adding a seed route later.
- **D-04:** Admin password recovery moves to CLI: create `scripts/reset-admin.ts` (runnable on the VPS) and document its use in `DEPLOY.md`. No web path for recovery.

### Secrets Cleanup (SEC-03)
- **D-05:** Remove secret literals from source only — user explicitly chose NOT to rotate the Gemini key in this phase (code cleanup only). Fallback literals to remove: `src/lib/gemini.ts:75` (default-parameter Gemini key), the duplicate at `src/app/api/v1/cms/ai/generate-article/route.ts:91`, and the leaked Google Cloud project ID in the error string at `src/lib/gemini.ts:202`. Note: user is aware the old key remains in git history and valid.
- **D-06:** Missing secrets fail via the EXISTING lazy-getter pattern (like `getMongoUri` in `src/lib/db/mongodb.ts:11` and `getJwtSecret` in `src/lib/auth.ts:9`) — extend this pattern to all required secrets. Do NOT add startup-time validation (build/CI/tests must not require real secrets).
- **D-07:** Gemini key precedence after fallback removal: env `GEMINI_API_KEY` is primary; the per-user key from CMS settings is the only secondary source (when env is absent).
- **D-08:** Add a CI grep gate in `.github/workflows/deploy.yml` (or a test step) banning secret-fallback patterns: `|| '`-style fallback literals on secrets, and `jwt.verify` outside `src/lib/auth.ts`. SEC-02 regressed once exactly this way — the gate prevents recurrence.

### Blacklist Warning Page (SEC-04 / AFF-03)
- **D-09:** Rebuild the warning page as a REAL Next.js route (e.g. `/blocked`) — server component, site theme, CSP applies (proxy.ts), no `cdn.tailwindcss.com` Play CDN.
- **D-10:** The page is DB-backed: the redirect route issues `302 → /blocked?ref=<clickLogId-or-equivalent>` and the page resolves blacklist data from the DB by that ref. No attacker-controlled text travels through the URL.
- **D-11:** Keep the current redirect behavior (302 through the intermediate warning page) — only the rendering mechanism changes.

### Abuse Controls (CONCERNS #7, #8)
- **D-12:** Rate-limit ALL THREE public write endpoints: `/api/v1/public/insider` (aliased `/subscribe`), `/api/v1/public/tracking/click`, `/api/v1/public/tracking/redirect` — reuse the existing per-IP sliding-window pattern in `src/lib/rateLimit.ts`.
- **D-13:** Policy: subscribe over-limit → hard 429. Click/redirect over-limit → do NOT 429 real users; instead drop duplicate records (same IP + link within a ~60s window) so F5/back-forward cannot inflate counts. Exact thresholds (window sizes, request caps) are delegated to the planner/researcher.
- **D-14:** Fix IP spoofing: parse the LAST trusted hop (X-Real-IP / last XFF entry) in `src/lib/utils.ts:57-67` AND configure Nginx to overwrite (not append) `X-Forwarded-For` — code + Nginx config together.
- **D-15:** KEEP JWT in localStorage. Do NOT migrate to httpOnly cookies in this phase — Phase 1 closes holes, not auth refactors. Logout revocation + rate limiting must work correctly across all CMS routes; the httpOnly migration remains future work.

### the agent's Discretion
- Exact rate-limit thresholds and window sizes (user delegated: "You decide" on specifics).
- Exact `/blocked` route path name and how `ref` is validated.
- How the CI grep gate is implemented (workflow step vs test assertion) as long as it fails the build on fallback-secret patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Security audit sources (drive the entire phase)
- `.planning/codebase/CONCERNS.md` — § Security Considerations #1–#11 with exact file:line references; this phase implements its fix recommendations
- `GO_LIVE_TASKLIST.md` — the project's own audit; SEC-01/SEC-02/SEC-06/SEC-07 and BUG-02 items referenced by CONCERNS (do not reproduce its recorded secrets; existence-only)

### Framework contract (breaking changes — NOT training-data Next.js)
- `AGENTS.md` — repo instruction: read bundled Next docs before writing code; `proxy.ts` replaces `middleware.ts`; `params` are Promises
- `node_modules/next/dist/docs/` — authoritative Next.js 16.2.12 API docs

### Existing map docs (evidence base)
- `.planning/codebase/STACK.md` — runtime, env handling, deploy
- `.planning/codebase/ARCHITECTURE.md` — route groups (`public/`, `cms/`, `cron|webhooks`), auth flow, data flow
- `.planning/codebase/TESTING.md` — Vitest 4 + mongodb-memory-server patterns to extend for new security tests

### Spec (governing, for blacklist/URL contracts)
- `specv2.md` — V5.2 governing spec (blacklists collection + import endpoint behavior; `/article/[slug]` URL contract)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` — canonical `getAuthUser(req)` (throws on missing secret, checks token blacklist); route-local duplicates in 5 CMS routes must be replaced by imports of this
- `src/lib/rateLimit.ts` — per-IP sliding-window limiter (in-memory; single-instance constraint applies) — reuse for public endpoints
- `src/lib/utils.ts` `escapeRegExp()` — currently used in `src/lib/homepage-articles.ts:28-30`; move to shared location and apply to ALL user-text→RegExp conversions (ReDoS fix)
- `src/lib/seo.ts` `normalizeHttpUrl` — reuse for affiliate `base_url` http(s) validation (AFF-01)
- `src/lib/sanitize.ts` + `tests/lib/sanitize.test.ts` — allowlist sanitizer gate; not directly on the warning page path but the project's XSS reference pattern
- `tests/` Vitest + mongodb-memory-server suite — extend with CMS 401 parameterized tests and seed-route regression test

### Established Patterns
- Lazy env getters that throw descriptive errors on first use (`getMongoUri`, `getJwtSecret`) — extend, don't replace, for missing-secret fail-fast
- `unstable_cache` tag-based caching in `src/lib/homepage-articles.ts` (relevant only as reference; not this phase)
- CLI scripts pattern (`scripts/seed-*.ts`) — the model for `scripts/reset-admin.ts`

### Integration Points
- `src/proxy.ts` — CSP pipeline; `/api/**` excluded from CSP (warning page must live OUTSIDE `/api/**` to get CSP)
- `.github/workflows/deploy.yml` — deploy on push to `feature/namdt25-develop`; CI grep gate goes here
- `src/app/api/v1/public/tracking/redirect/route.ts` — redirect flow stays 302; swaps inline HTML for redirect to the new `/blocked` route
- `ecosystem.config.js:14-15` — PM2 fork/instances:1 — hard prerequisite for in-memory rate limiter and token blacklist (do not change in this phase)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Notable user emphasis: fast cleanup ("dọn dẹp triệt để" on seed paths), minimal phase scope on auth storage (localStorage stays), and prevention of regressions (re-appearance test + CI grep gate) because SEC-02 already regressed once in this exact codebase.

</specifics>

<deferred>
## Deferred Ideas

- Rotate the exposed Gemini API key (and consider the leaked Google Cloud project ID) in Google AI Studio — user chose code cleanup only this phase; rotation is a user-side action to schedule
- Migrate JWT from localStorage to httpOnly cookies — larger auth refactor, belongs to a later phase
- httpOnly-cookie revocation story / Redis-backed token blacklist — already deferred (single-instance constraint valid at 50–100 concurrent users)
- Atlas credential rotation / migration to project-owned cluster — standing blocker (third-party ownership)

</deferred>

---

*Phase: 1-Security Remediation*
*Context gathered: 2026-09-11*
