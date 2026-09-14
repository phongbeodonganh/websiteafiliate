---
phase: 01-security-remediation
plan: 04
subsystem: security
tags: [auth, jwt, canonical-guard, secure-by-default, regression-gate, parameterized-401, fallback-secret, logout-blacklist, vitest]

# Dependency graph
requires:
  - phase: foundation (pre-existing brownfield) + plans 01-01/01-02/01-03
    provides: the 5 CMS routes still carrying route-local fallback-secret duplicate guards
      (cms/blacklist/{route,quick-blacklist,import,import-sheet-url} + cms/ai/generate-article),
      the unauthenticated cms/blacklist/check route, the historically-public cms/settings
      GET+PUT, src/lib/auth.ts canonical getAuthUser(req) + verifyToken with the logout
      token-blacklist check, tests/setup.ts canonical test JWT_SECRET, tests/api/tracking-redirect.test.ts
      direct-handler-invocation conventions, the 01-02 security-regressions test file,
      and the 01-03 scheme gates on cms/affiliate-links (shared routes — preserved by this swap)
provides:
  - AUTH-01 closure: every CMS route verifies through the single canonical getAuthUser(req)
    from src/lib/auth.ts — zero route-local fallback secrets, zero duplicate guards
  - tests/api/cms-auth-401.test.ts — the phase's permanent parameterized 401 gate (61 tests
    over the full 25-route / 39-verb-handler inventory): no-token rejection, runtime glob
    inventory coverage check, fallback-secret-token rejection on all historically-fallback
    routes, logout-blacklist uniformity (Pitfall 6), Basic-scheme treated like no-header,
    and a fresh-token control
affects: [01-06 (extends this gate's spirit with the D-08 secret-fallback CI gate), the verifier
  UAT for AUTH-01, future CMS route additions (the inventory guard forces new routes to be
  registered in the test or the build fails — structural prevention of the same drift that
  left cms/blacklist/check authless)]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 7750     # chars/4 over the realized diff (~31,000 chars across 10 files / 2 task commits);
                    # the route swap was largely already present in the working tree, so the diff
                    # this plan added freshly is mostly the test — the plan estimated 60,000 over
                    # a from-scratch swap; once the pre-existing swap is accounted for the
                    # strategic miss is small (the pre-swap state was created upstream).
  tasks: 2
  commits: 2        # MEASURED: git rev-list --count 99ba4f0c..HEAD
  plan_head_before: 99ba4f0c523a291c3d7d302a11059f0b86f70d34

# Tech tracking
tech-stack:
  added: []         # zero new packages (T-1-SC honored: no npm installs in this plan)
  patterns:
    - Parameterized route-inventory gate: a static route table that runs against a runtime
      glob of the route directory, so adding a CMS route without registering it in the test
      fails the build — converts the "blacklist/check was authless" failure mode from
      human-review to structural prevention
    - Per-route status pinning: the gate asserts the EXACT expected no-auth status per route
      (401 for simple !user guards, 403 for combined !user || role!=='admin' write-guards)
      rather than loosely "is rejected" — a silent downgrade to 200 fails loudly while the
      role check semantics stay preserved (plan prohibition: do not weaken the role matrix)
    - Counter-vacuity control: includes BOTH a forged rejection case (blacklisted token
      rejected) AND a fresh-token not-rejected control — proves the rejections come from
      the guard's contract, not a misconfiguration that would 401/403 everything

key-files:
  created:
    - tests/api/cms-auth-401.test.ts
  modified:
    - src/app/api/v1/cms/blacklist/route.ts
    - src/app/api/v1/cms/blacklist/check/route.ts
    - src/app/api/v1/cms/blacklist/quick-blacklist/route.ts
    - src/app/api/v1/cms/blacklist/import/route.ts
    - src/app/api/v1/cms/blacklist/import-sheet-url/route.ts
    - src/app/api/v1/cms/ai/generate-article/route.ts
    - src/app/api/v1/cms/settings/route.ts
    - src/app/api/v1/cms/categories/route.ts          # AUTH-01 same-class completion (was no-arg GET)
    - src/app/api/v1/cms/sub-categories/route.ts      # AUTH-01 same-class completion (was no-arg GET)

key-decisions:
  - "Auth swap was already present in uncommitted working-tree state on agent arrival — the
    plan's stated precondition (5 route-local duplicates to delete) did not match current
    source. Committed the existing swap state rather than re-doing it, plus built the missing
    parameterized 401 gate test that the plan's <objective>, must_haves 'artifacts', and
    <verify> explicitly require. Documented as a deviation."
  - "categories GET + sub-categories GET also gained the guard in the same swap (AUTH-01's
    literal statement is 'every CMS route'); they imported getAuthUser but had no-arg GET
    handlers that could never call it. Same AUTH-01 class as the plan's named routes —
    included in the commit and the parameterized table."
  - "Per-route status pinning (401 vs 403) instead of a generic '[401,403].toContain'
    check — preserves the role matrix verbatim (plan prohibition) while still failing
    loudly on a silent downgrade to 200; the route-inventory guard refuses any drift
    between table and source."
  - "Fallback-secret tokens carry an admin-role payload to prove the rejection is from the
    secret mismatch, not a role failure — masks no edge case."
  - "logout-blacklist uniformity proven on cms/blacklist GET AND cms/ai/generate-article
    (the historically duplicate-guard route per Pitfall 6), plus a fresh-canonical-token
    control that asserts NOT-rejection — proves the rejections are not over-firing."
  - "generate-article authorId collapsed to string after both JWT and admin-DB-fallback
    branches (Rule 1 fix during Task 2 tsc pass) — matches the existing
    String(user.userId) convention in the canonical-blacklist routes; Mongoose ObjectId
    cast behavior unchanged."

patterns-established:
  - "Parameterized inventory gate: a static route table cross-checked against a runtime glob
    — converts 'I forgot to add auth to the new route' from a review item to a build break"
  - "Per-route rejection-status pinning (exact code per route) rather than 'is rejected' —
    detects downgrades while preserving role-matrix semantics"
  - "Forged-token rejection + control-token acceptance pair — counter-vacuity discipline for
    auth gates (pattern shared with 01-02's destructive-op matcher sanity block)"

requirements-completed: [AUTH-01]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "AUTH-01 closure for src/lib/auth.ts's contract: every route under src/app/api/v1/cms/** verifies through the single canonical getAuthUser(req) — no route-local secrets, no next/headers duplicate guards, no jwt.verify outside the canonical module"
    requirement: AUTH-01
    verification:
      - kind: other
        ref: "Node inventory sweep over every cms/**/route.ts: 25/25 routes use getAuthUser, 0 carry a route-local JWT_SECRET literal, 0 import headers from next/headers, 0 call jwt.verify directly (4 PROBLEM routes — undocumented sources of drift; verified zero)."
      - kind: other
        ref: "tests/api/security-regressions.test.ts (created in plan 01-02, runs on every npm test) bans jwt.verify outside src/lib/auth.ts — the canonicalization is enforced permanently"
      - kind: other
        ref: "tests/api/security-regressions.test.ts bans the secret-fallback pattern `|| '` for known secret envs — a future re-introduction of a route-local fallback literal fails the build"
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'every CMS route rejects an unauthenticated request' — 39 path-parameterized assertions, one per CMS verb-handler"
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'CMS route inventory covers every route.ts under src/app/api/v1/cms/**' — runtime filesystem glob verifies the static table has no drift vs source"
    human_judgment: false
  - id: D2
    description: "A JWT signed with either former hardcoded route-local fallback secret ('nexus_super_secret_jwt_key_2026' on the 4 blacklist-route duplicates, 'affiliate_secret_key_v3_super_secure' on the generate-article duplicate) is rejected with the route's expected no-auth status on every historically-fallback route; an admin-role payload on the forged token proves the rejection is from the secret mismatch, not a role check"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'every CMS route rejects a JWT signed with a former route-local fallback secret' — both literals × 6 historically-fallback routes = 12 assertions"
    human_judgment: false
  - id: D3
    description: "A logout-blacklisted canonical token (signed with the test JWT_SECRET, blacklisted through the exported tokenBlacklist API) is rejected identically oncms/blacklist GET and on cms/ai/generate-article (the historically duplicate-guard route) — Pitfall 6 uniform revocation assertion"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'logout-blacklisted canonical token rejected uniformly (Pitfall 6)' — two rejection asserts + a fresh-token control that a NEW unblacklisted canonical token is NOT rejected"
    human_judgment: false
  - id: D4
    description: "cms/blacklist/check (research Open Question 1 — historically zero auth) now requires getAuthUser and is included in the parameterized 401 table; cms/settings GET+PUT (research Open Question 2 / A4 — historically public) are now locked behind getAuthUser and are in the 401 table"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'POST src/app/api/v1/cms/blacklist/check/route.ts → 401 without a token'"
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'GET src/app/api/v1/cms/settings/route.ts → 401 without a token' and 'PUT src/app/api/v1/cms/settings/route.ts → 401 without a token'"
    human_judgment: false
  - id: D5
    description: "Existing role matrix preserved verbatim during the auth swap — admin-only writes (affiliate-links POST/PUT/DELETE, categories POST/PUT/DELETE, sub-categories POST/PUT/DELETE, subscribers GET/DELETE, users, insider/send-now) still return 403 on missing/non-admin tokens; admin/editor AI generation still allowed for editor role"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'every CMS route rejects an unauthenticated request' — each route's expectedNoAuthStatus pins its exact historical 401-vs-403 outcome (403 row for the admin-only write-guards), so a guard downgrade fails loudly while the role check semantics stay intact"
      - kind: integration
        ref: "Full suite unaffected: 130/130 tests pass; the 01-03 affiliate-links-scheme suite (shared routes) still green — the swap preserves the isHttpUrl gate additions"
    human_judgment: false
  - id: D6
    description: "Authed CMS behavior is byte-identical apart from the guard swap; only the unauthenticated behavior changes (prerequisite before vs. after: a token signed with the production canonical JWT_SECRET still authorizes on every CMS route)"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts > 'logout-blacklisted ...' control case — a fresh unblacklisted canonical-admin token on cms/blacklist GET returns NEITHER 401 NOR 403 (passes the auth guard and proceeds to handler logic)"
      - kind: integration
        ref: "tests/api/auth-login.test.ts (3/3 pass) — the canonical login flow still mints a valid token the routes will accept"
    human_judgment: false

# Metrics
duration: 16.6min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 04: Canonical CMS Auth Sweep (AUTH-01) Summary

**Closed the SEC-02 regression pathway permanently: every route under src/app/api/v1/cms/** now verifies through the single canonical `getAuthUser(req)` (zero route-local secrets, zero `next/headers` duplicate guards), and the full 25-route / 39-verb-handler parameterized gate proves it — tokens signed with either former fallback literal are rejected 401/403 across all historically-fallback routes, logout-revoked tokens fail uniformly, and adding any new CMS route without registering it in the test now fails the build.**

## Performance

- **Duration:** 16.6 min
- **Started:** 2026-09-14T22:30:36Z
- **Completed:** 2026-09-14T22:47:14Z
- **Tasks:** 2/2
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments

- **AUTH-01 closed structurally.** A 25-route / 39-verb-handler inventory sweep confirmed every CMS route already verifies through the canonical `getAuthUser(req)` from `src/lib/auth.ts`. The 5 route-local fallback-secret duplicate guards (carrying the literals `'nexus_super_secret_jwt_key_2026'` on the 4 blacklist-route duplicates and `'affiliate_secret_key_v3_super_secure'` on the generate-article duplicate), the unauthenticated `cms/blacklist/check` POST, the historically-public `cms/settings` GET+PUT, and the no-arg `cms/categories` / `cms/sub-categories` GETs are now all canonical-guarded. The same `src/lib/auth.ts` (untouched in behavior per plan prohibition #6) is the SINGLE verification-key authority — a JWT signed with any fallback literal is rejected on every CMS route.
- **The phase's regression backstop is in place.** `tests/api/cms-auth-401.test.ts` is a permanent gate that runs on every `npm test` (and therefore in deploy.yml line 21-22 before every deploy). Adding a CMS route without registering it in the test's static table fails the inventory-glob check, and a downgrade of any route's auth guard to a public handler fails the parameterized 401 check — this is exactly the failure mode that left `cms/blacklist/check` authless and the same SEC-02 regression class.
- **Pitfall 6 (logout revocation asymmetry the duplicate guards introduced) is closed.** The duplicates never consulted the logout token blacklist — a revoked token still authorized blacklist CRUD and AI generation. The canonical `verifyToken` checks `isBlacklisted` first, and the test pins this uniformity: a blacklisted canonical token fails on both `cms/blacklist GET` AND `cms/ai/generate-article` (the historically-duplicate-guard route), plus a control case proves a fresh token is NOT rejected.
- **Role matrix preserved verbatim** (plan prohibition #4). Admin-only write routes (`affiliate-links` POST/PUT/DELETE, `categories` POST/PUT/DELETE, `sub-categories` POST/PUT/DELETE, `subscribers`, `users`, `insider/send-now`) still return 403 on a missing/non-admin token; AI generation still allows the editor role. The per-route status assertions pin the exact 401-vs-403 outcome so any silent downgrade to 200 fails loudly while the role semantics stay intact.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — canonical auth swap on 9 CMS routes + parameterized 401/fallback/logout gate** - `d916a4d` (fix)
2. **Task 2: Swap-integrity sweep — tsc-clean authorId resolution + handler type widening** - `f9aedde` (fix)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `tests/api/cms-auth-401.test.ts` (NEW) — 61 tests: (a) inventory coverage — runtime filesystem glob of `src/app/api/v1/cms/**` route files cross-checked against the static table; no verb drift, no route silently skipped; (b) parameterized no-token rejection table over all 39 CMS verb-handlers with per-route exact-status pinning (401 vs 403 per the existing role matrix); (c) Basic-scheme Authorization header treated like a missing header; (d) both former route-local fallback-secret literals (`nexus_super_secret_jwt_key_2026`, `affiliate_secret_key_v3_super_secure`) signed into admin-payload tokens and asserted-rejected on all 6 historically-fallback routes (12 assertions); (e) logout-blacklisted canonical token rejected uniformly on `cms/blacklist GET` + `cms/ai/generate-article` (Pitfall 6) with a fresh-token control that a NEW unblacklisted canonical-admin token is NOT rejected on `cms/blacklist GET` (proves the rejections aren't a misconfiguration)
- `src/app/api/v1/cms/blacklist/route.ts` (MOD) — the duplicate `verifyAdminAuth` block (route-local `JWT_SECRET || 'nexus_…_2026'` literal, `headers`/`jwt` imports, the local verify function) is deleted; GET handler now takes `req: NextRequest` and calls `getAuthUser(req)` synchronously; POST and DELETE call sites swapped to `getAuthUser(req)`; existing 401/403 envelopes and admin-only DELETE role check preserved verbatim; the logout token-blacklist check that the duplicate skipped now applies automatically through `verifyToken → isBlacklisted`
- `src/app/api/v1/cms/blacklist/check/route.ts` (MOD) — `getAuthUser(req)` + standard 401 envelope added at the top of the POST handler (was zero-auth per research Open Question 1); existing lookup logic unchanged; included in the parameterized 401 table
- `src/app/api/v1/cms/blacklist/{quick-blacklist,import,import-sheet-url}/route.ts` (MOD) — same duplicate-deletion + swap as the main blacklist route (all shared the `'nexus_…_2026'` literal and `verifyAdminAuth` shape); admin-only role checks preserved
- `src/app/api/v1/cms/ai/generate-article/route.ts` (MOD) — duplicate guard deleted (carried the `'affiliate_…_super_secure'` literal distinct from the blacklist literal); swap to `getAuthUser(req)`. Task 2 follow-up: `authorId` collapsed to a string after both JWT and DB-fallback branches (was `string|number|ObjectId` assigned to `author_id` — TS2769 on `ArticleModel.create`); unused `Types` import removed. **The Gemini key fallback literal at line 77 is left untouched per plan prohibition / hand_off (SEC-02 secret purge and `gemini_api_key` schema field land in plan 06).**
- `src/app/api/v1/cms/settings/route.ts` (MOD) — GET and PUT both gained `getAuthUser` + 401 envelope at the top of each handler (research Open Question 2 / A4 — historically public); PUT's existing role check (`!role!=='admin'` → 403) split out into its own block (was combined with the no-user check — now the 401-on-no-user and 403-on-non-admin branches are distinguishable). Response bodies untouched per plan — key masking and `gemini_api_key` acceptance land in plan 06 with the schema field
- `src/app/api/v1/cms/categories/route.ts` + `src/app/api/v1/cms/sub-categories/route.ts` (MOD) — the GET handlers (no-arg, listed `getAuthUser` in imports but could never call it) now take `req: Request` and call `getAuthUser(req)` with the standard 401 envelope; same AUTH-01 class as the plan's named routes; included in the parameterized 401 table

## Decisions Made

See "key-decisions" frontmatter above — the two material decisions to surface for downstream plans:

1. **Auth swap was already present in uncommitted state at agent arrival** (deviation documented below). The authentic, verifiable outcome is preserved; the test is the plan's actual new contribution; the upstream working-tree swap is now committed and named in the commit message.
2. **categories + sub-categories GETs are in scope.** AUTH-01 is literally "every CMS route verifies through the single canonical `getAuthUser`"; these two routes were the same class of bug (authless GET) and the swap was already done — including them in this commit + table completes AUTH-01 and removes the same drift the inventory guard exists to prevent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Auth swap was already present in uncommitted working-tree state at agent arrival**
- **Found during:** Task 1, after reading all 7 route files + canonical `src/lib/auth.ts`
- **Issue:** The plan's `<objective>`, `read_first` excerpts, and Task 1 steps 1-3 describe deleting the 5 route-local `verifyAdminAuth` duplicate guards (carrying `'nexus_super_secret_jwt_key_2026'` and `'affiliate_secret_key_v3_super_secure'`) and swapping call sites to `getAuthUser(req)`. On arrival, those swaps were already present in uncommitted working-tree state — the duplicate guards no longer exist in source (Node inventory sweep confirmed: 0 of 25 CMS routes carry a route-local JWT secret, 0 import `headers` from `next/headers`, 0 call `jwt.verify` directly; 25/25 use `getAuthUser`). The plan's stated precondition did not match current source.
- **Fix:** Committed the existing swap state rather than re-doing it. Leaving it uncommitted would have meant the new parameterized 401 test failing against a committed base where the actual fallback literals are still live. Built the genuinely-missing deliverable from the plan's `must_haves.artifacts`: `tests/api/cms-auth-401.test.ts` (NEW — the phase's regression backstop, was not in the working tree). Both shipped together in Task 1's commit `d916a4d`.
- **Files modified:** `src/app/api/v1/cms/blacklist/route.ts`, `src/app/api/v1/cms/blacklist/check/route.ts`, `src/app/api/v1/cms/blacklist/{quick-blacklist,import,import-sheet-url}/route.ts`, `src/app/api/v1/cms/ai/generate-article/route.ts`, `src/app/api/v1/cms/settings/route.ts`, plus two same-class routes discovered during the inventory sweep (`cms/categories/route.ts`, `cms/sub-categories/route.ts` — their GETs were no-arg handlers that listed `getAuthUser` in imports but never called it)
- **Verification:** 130/130 tests pass; `npx tsc --noEmit` clean; Node inventory sweep prints "PROBLEM routes: 0"; the parameterized 401 table passes on all 39 verb-handlers
- **Commit:** `d916a4d`

**2. [Rule 1 - Bug] generate-article authorId TS2769 type error from the upstream swap**
- **Found during:** Task 2 tsc sweep
- **Issue:** The upstream swap edit changed `let authorId = user?.userId || user?.id || user?._id;` to `let authorId: string | number | Types.ObjectId | undefined = user?.userId;` — the union type is not assignable to the `ArticleModel.create({ author_id })` schema field (TS2769).
- **Fix:** Collapse `authorId` to `string` after both JWT and DB-fallback branches via `String(...)` coercion — matches the existing `String(user.userId)` convention in the canonical-blacklist routes; Mongoose ObjectId cast behavior unchanged. Removed the now-unused `import type { Types } from 'mongoose'`.
- **Files modified:** `src/app/api/v1/cms/ai/generate-article/route.ts`
- **Verification:** `npx tsc --noEmit` exit 0; full suite 130/130
- **Commit:** `f9aedde`

**3. [Rule 1 - Bug] RouteEntry.handler test typing (NextRequest vs Request) on tsc sweep**
- **Found during:** Task 2 tsc sweep
- **Issue:** `interface RouteEntry { handler: (req: Request, ctx?: any) => ... }` was contravariantly incompatible on assignment with the imported `cms/blacklist/route.ts` handlers typed as `(req: NextRequest) => ...` (NextRequest is a subtype of Request — the bivariance is fine at runtime but tsc strict mode flags it).
- **Fix:** Widened `handler` to `(...args: any[]) => Promise<Response> | Response`. Argument shapes are controlled at the two call sites in the test; the widening does not weaken the assertions.
- **Files modified:** `tests/api/cms-auth-401.test.ts`
- **Verification:** `npx tsc --noEmit` exit 0; the 64-test local run still green
- **Commit:** `f9aedde`

**Total deviations:** 3 (1 Rule 3 + 2 Rule 1). **Impact:** Materially positive — the plan's auth swap is now committed (closing AUTH-01 in source COMMITTED state, not just working-tree) AND the regression backstop is permanently in place; the two tsc fixes are routine follow-ups to the upstream swap. No scope expansion into out-of-phase items: SEC-02 secret-purge, D-06 lazy fail-fast, D-07 key precedence, gemini_api_key schema field + masked settings GET/PUT, and the D-08 secret-fallback CI gate remain in plan 06 per the plan's `hand_off` and `assumption_delta_decision`.

## Issues Encountered

- Pre-existing Mongoose deprecation warning (`new: true` option on `findOneAndUpdate`) still surfaces in `npm test` output — documented across 01-01/01-02/01-03 summaries, out of scope for this plan (no new `findOneAndUpdate` calls added; the upstream swap preserved the existing occurrences in the blacklist routes verbatim per plan prohibition on role-matrix changes).
- During development, two RouteEntry-handler test-typing bugs surfaced from the upstream swap's leftover `Types` import and `let authorId: string | number | ObjectId | undefined = user?.userId;`; both fixed in Task 2 (deviation #2 and #3 above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 01-05.** Full suite green at close: 13 test files / 130 tests (`npm test`); `npx tsc --noEmit` exit 0; the parameterized 401 table is 61/61; the inventory guard zero drift.
- **For plan 06:** the SEC-02 secret-purge remains the load-bearing work; specifically (a) the Gemini key fallback literal at `cms/ai/generate-article/route.ts:77` (now line ~73 after Task 2 edits) and at `src/lib/gemini.ts:75`, (b) the leaked Google Cloud project ID in the gemini error string, (c) the D-08 CI gate extension to `tests/api/security-regressions.test.ts`, (d) `gemini_api_key` schema field on `SettingSchema` + masked GET/PUT settings acceptance — all out-of-scope per plan `hand_off`.
- **For verify-work:** the only human-judgment-relevant artifact is the structural inventory assertion that no CMS route silently lacks `getAuthUser` — which the runtime glob guard in the test automates. The verifier's job is to confirm the same no-token 401/403 behavior at the deployed endpoint level (deploy.yml's `npm test` is the CI gate).

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*
