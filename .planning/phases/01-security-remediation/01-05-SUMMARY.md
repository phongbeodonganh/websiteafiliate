---
phase: 01-security-remediation
plan: 05
subsystem: security
tags: [rate-limiting, dedupe, flood-cap, public-endpoints, abuse-controls, sec-04, in-memory-map, vitest]

# Dependency graph
requires:
  - phase: foundation (pre-existing brownfield) + plans 01-01 / 01-02
    provides: the three public write endpoints (insider POST + /subscribe alias,
      tracking/click POST, tracking/redirect GET with bound ClickLog ref anchor
      from 01-01), src/lib/rateLimit.ts existing failure-lockout API
      (checkRateLimit/recordFailedAttempt/resetRateLimit that the login route
      depends on), src/lib/tokenBlacklist.ts lazy-prune-on-read pattern, the
      auth/login route's tooManyRequests + Retry-After shape, the insider /
      tracking-redirect vitest suites (Pitfall 3 — module-level Map state shared
      via fileParallelism:false), 01-02's security-regressions gate file (not
      extended this plan — plan 06's job)
provides:
  - SEC-04 closure (this plan's slice): rate-limiting on all three public write
    endpoints with the right policy per endpoint — subscribe hard 429 + Retry-After,
    click/redirect flood cap + 60s dedupe with silent-skip (no 429 to real users)
  - src/lib/rateLimit.ts — NEW exports `ConsumeResult`, `consumeRequest`,
    `consumeDedupe`, `_resetForTests` (failure-lockout API untouched and
    state-isolated — non-interference asserted by test)
  - tests/api/rate-limit.test.ts — NEW (15 tests: subscribe 5/60s boundary +
    Retry-After; per-IP isolation; window expiry; /subscribe alias identical;
    dedupe unit; click single-write; concurrent Promise.all dedupe; redirect
    dedupe skip-$inc with ref-anchor integrity; distinct-IP isolation)
  - 01-01's /blocked 302 contract + tracking-redirect.test.ts extended with a
    blacklisted+dedupe case (ref anchor always created, $inc skipped on dup)
affects: [01-07 (the D-14 last-hop getClientIp flip + escapeRegExp relocation +
  ReDoS hardening + DEPLOY.md §8 Nginx overwrite — the limiter keys on
  getClientIp here and is written order-invariant under that flip; no test churn),
  verifier UAT for SEC-04, ops tuning of the three threshold constants
  (user-delegated per RESEARCH.md Pattern 3)]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 8400        # chars/4 over the realized src+tests diff (~33,500 chars);
                       # the plan estimated 62,000 over a from-scratch limiter +
                       # 3 integrations + 1 new + 2 extended test files — actual
                       # scope matched; the limiter is small + tests are
                       # convention-following (PATTERNS.md analog role-match)
  tasks: 2
  commits: 2          # MEASURED: git rev-list --count 460b41ce..HEAD
  plan_head_before: 460b41ce4b53159ebb41289f844048762906813f

# Tech tracking
tech-stack:
  added: []           # zero new packages (T-1-SC honored: no npm installs in this plan)
  patterns:
    - Two-limiter module shape: a single rateLimit.ts exports BOTH a failure-lockout
      API (login uses; counts wrong attempts, locks for 15min) AND an additive
      count-based sliding-window consumer API (public writes use; counts requests,
      hard cap per window). Same module, same in-memory Map single-instance contract
      (PM2 instances:1/fork), separate state Maps — non-interference asserted by test
    - Per-endpoint policy split (D-13): notify-on-over-limit (subscribe → 429 +
      Retry-After header) vs silent-record-drop (click/redirect → still 200/302,
      writes skipped). Same consumeRequest primitive, different consumer behavior —
      the limiter has no opinion, the route policy does
    - Ref-anchor asymmetry between click and redirect routes: the ClickLog is the
      /blocked ref anchor from plan 01, so on the redirect route it is ALWAYS
      created (per touch) and only the $inc is skipped on dedupe; on the click
      route (no ref consumer) both the insert and the $inc are skipped. Documented
      in plan assumption SEC-04/dedupe-vs-ref and pinned by the redirect dedupe test
    - Test-reset affordance (`_resetForTests()`) called in `beforeEach` of every
      suite that hits a public write route — RESEARCH Pitfall 3 prevention pattern
      (module-level Map state is shared across tests in a file via
      fileParallelism:false, and 5/60s subscribe cap or 60/60s flood cap trips mid-suite)

key-files:
  created:
    - tests/api/rate-limit.test.ts
  modified:
    - src/lib/rateLimit.ts
    - src/app/api/v1/public/insider/route.ts
    - src/app/api/v1/public/tracking/click/route.ts
    - src/app/api/v1/public/tracking/redirect/route.ts
    - tests/api/insider-lifecycle.test.ts
    - tests/api/tracking-redirect.test.ts

key-decisions:
  - "Failure-lockout API untouched and state-isolated: the new consumeRequest/
    consumeDedupe Maps sit alongside `attempts`, the failure-lockout API keeps its
    own Map and own per-key resetRateLimit(key) — non-interference is asserted by
    a`'does NOT interfere'` test that populates the new limiter and confirms the
    login-route API is unaffected by the addition (prohibition #6: extend, never replace)"
  - "Ref-anchor asymmetry honored verbatim: on the redirect route the ClickLog is
    ALWAYS created (it is the /blocked ref anchor from plan 01; if the user is
    interrupted mid-click and re-clicks, each click gets its own anchor); on the
    click route (no ref consumer) BOTH the insert and the $inc are skipped on
    dedupe. SEC-04/dedupe-vs-ref assumption — pinned by the redirect dedupe test."
  - "/subscribe alias inherits the subscribe cap automatically via the existing
    `export { POST } from '../insider/route';` re-export (no alias file edit;
    prohibition #5 one handler-both paths covered — pinned by the alias test that
    cycles subscribeAliasHandler 5+1 times and observes the same 429 boundary)"
  - "Threshold constants are tunable at the top of each integration site (subscribe
    5/60s, click/redirect flood cap 60/60s, 60s dedupe) per RESEARCH Pattern 3 +
    user delegation. Manual VPS tuning is the only post-deploy op the plan leaves
    to the user (done criterion: boundary behavior pinned; thresholds tunable)"
  - "Test isolation uses SINGLE-ENTRY X-Forwarded-For values (e.g. 203.0.113.10)
    per the plan's must_haves threat T-1-16 mitigation contract — order-invariant
    under plan 07's later last-hop parse flip, so that fix lands without test churn"

patterns-established:
  - "Additive export discipline in a shared module: when a lib file is a security
    primitive already depended on (login ← rateLimit.ts), new functions live in
    the same file under a sibling state Map with a single-instance comment cross-
    reference — not a new module — so the audit surface stays one place"
  - "Test-reset affordance contract for in-memory Map state: module-level Map
    primitives that tests need to reset between cases ship a `_resetForTests()`
    export and every consuming test file calls it in `beforeEach` (the failure-
    lockout API's per-key resetRateLimit is insufficient when a single suite
    generates many distinct limiter keys)"
  - "Per-endpoint rate-limit policy spread: the limiter primitive is policy-
    invariant, the route makes the over-limit decision. Subscribe: hard user-
    visible 429 + Retry-After (lower tolerance — email bombing is the threat);
    click/redirect: silent record-drop (over-cap requests still succeed so
    legitimate F5/back-forward never lose the click-through experience)"

requirements-completed: [SEC-04]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Subscribe (POST /api/v1/public/insider AND its /subscribe alias) over-limit returns a hard 429 with an integer Retry-After header; the first 5 requests per IP per 60s window succeed and the 6th is rejected (D-12, D-13)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'allows 5 subscribe requests per IP and 429s the 6th with an integer Retry-After >= 1'"
        status: pass
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'rate-limits different IPs independently (key is per-IP)'"
        status: pass
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'limits the /subscribe alias path identically (one handler, both paths covered)'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Window expiry recovers the next request (boundary contract on the limiter itself — the next-window first request succeeds after the window elapses)"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/api/rate-limit.test.ts > 'recovers after the window elapses (expiry lets the next request through)'"
        status: pass
      - kind: unit
        ref: "tests/api/rate-limit.test.ts > 'SEC-04 consumeDedupe unit > prunes stale entries (false after window elapses)'"
        status: pass
    human_judgment: false
  - id: D3
    description: "The new count-based limiter is state-isolated from the existing login failure-lockout limiter — login's checkRateLimit/recordFailedAttempt/resetRateLimit behavior is byte-identical (prohibition #6: extend never replace)"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/api/rate-limit.test.ts > 'does NOT interfere with the existing login failure-lockout limiter (separate API)'"
        status: pass
      - kind: integration
        ref: "tests/api/auth-login.test.ts (3/3 pass at full-suite close) — the canonical login flow with checkRateLimit + recordFailedAttempt is unchanged"
        status: pass
    human_judgment: false
  - id: D4
    description: "Click route: over-cap/duplicate clicks silently skip writes and still return 200 success — no 429, no behavior change visible to the caller (D-13 policy). The ClickLog insert AND the click_count $inc are both dropped on skip (click route has no ref consumer)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'SEC-04 click route — dedupe + flood cap > two rapid clicks (same IP + link) → exactly one ClickLog insert'"
        status: pass
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'two rapid clicks (same IP + link) → click_count incremented exactly once'"
        status: pass
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > '61st click within the window → still 200 with no new write'"
        status: pass
    human_judgment: false
  - id: D5
    description: "Concurrent duplicate clicks (Promise.all of N same-IP+link clicks) inflate analytics by at most one — Node's single-threaded event loop serializes the Map writes (must_haves truth #4)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'concurrent duplicate clicks (Promise.all) → click_count incremented exactly once'"
        status: pass
    human_judgment: false
  - id: D6
    description: "Redirect route: dedupe/over-cap NEVER returns 429 — the route always 302s. ClickLog is ALWAYS created (it is the /blocked ref anchor from plan 01; each click gets its own anchor) and ONLY the click_count $inc is skipped (SEC-04/dedupe-vs-ref assumption)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/rate-limit.test.ts > 'SEC-04 redirect route — dedupe + flood cap > two rapid redirects (same IP + link) → click_count incremented exactly once (ClickLog anchors always created per dedupe-vs-ref design)'"
        status: pass
      - kind: integration
        ref: "tests/api/tracking-redirect.test.ts > 'blacklisted click with dedupe active still 302s to /blocked?ref=<24-hex> (ref anchor always created)'"
        status: pass
    human_judgment: false
  - id: D7
    description: "A blacklisted redirect still 302s to /blocked?ref=<24-hex> even when dedupe/flood-cap is active — the ClickLog ref anchor is always created on the redirect route and click_count was NOT incremented on the duplicate (must_haves truth #5)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/tracking-redirect.test.ts > 'blacklisted click with dedupe active still 302s to /blocked?ref=<24-hex> (ref anchor always created)' — two serial redirects, both 302 to /blocked, click_count === 1"
        status: pass
    human_judgment: false
  - id: D8
    description: "Real-world thresholds hold under production traffic (subscribe 5/60s, click/redirect flood cap 60/60s, 60s dedupe) — user-delegated starting points per RESEARCH Pattern 3"
    requirement: SEC-04
    verification: []
    human_judgment: true
    rationale: "The plan's done criterion explicitly defers threshold tuning to the VPS post-deploy (a single concrete VPS smoke under real traffic). The boundary BEHAVIOR is pinned by D1-D7; the THRESHOLD VALUES are tunable constants at the integration sites and may need adjustment based on observed false-positive vs abuse rates. Verifier should monitor production for accidental 429s on subscribe and acceptable silent-drop rate on click/redirect during normal user flows."
  - id: D9
    description: "Full suite green at plan close — no regressions from the new limiter across insider-lifecycle, tracking-redirect, and all 12 prior test files"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "npm test (14 test files / 145 tests pass at close; +15 new vs plan 01-04's 130/130)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit exit 0"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 05: Public-Endpoint Rate Limiting + Dedupe (SEC-04) Summary

**Closed the public-abuse holes on all three unauthenticated write endpoints — a new additive count-based limiter in `src/lib/rateLimit.ts` (failure-lockout API untouched and state-isolated) drives a hard 429 + Retry-After on subscribe (including its /subscribe alias) and a silent-write-skip flood cap + 60s per-IP+link dedupe on click/redirect (no 429 to real users) with the redirect route always creating the ClickLog /blocked ref anchor even under dedupe.**

## Performance

- **Duration:** 11min
- **Started:** 2026-09-14T22:56:04Z
- **Completed:** 2026-09-14T23:07:17Z
- **Tasks:** 2/2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- **T-1-14 (subscribe email bombing) closed.** A single unauthenticated client can no longer flood the insider list — the 5req/60s/IP cap returns a hard 429 with an integer `Retry-After` header on the 6th request. Both `POST /api/v1/public/insider` AND its `/subscribe` alias path inherit the cap via the existing re-export (one handler, both paths covered — prohibition #5, asserted by test).
- **T-1-15 (click/redirect analytics inflation) closed without user-visible breakage.** F5, back-forward, and bursts cannot inflate click analytics — over-cap or duplicate clicks silently skip the analytics writes (ClickLog insert + `click_count $inc` on the click route; only the `$inc` on the redirect route where the ClickLog is kept as the `/blocked` ref anchor) AND still return the normal success envelope / 302. Real users never see a 429 on click/redirect (D-13 policy honored).
- **Dedupe-vs-ref anchor integrity preserved.** The redirect route ALWAYS creates the ClickLog row (per the `SEC-04/dedupe-vs-ref` assumption in the plan) because it is the `/blocked` ref anchor from plan 01 — if a user is interrupted mid-click and re-clicks, each click gets its own 24-hex anchor that the warning page can re-resolve. Only the `click_count $inc` is skipped on dedupe. Pinned by the new blacklisted+dedupe test in `tracking-redirect.test.ts`.
- **Non-interference with the login failure-lockout limiter proven.** The new `consumeRequest`/`consumeDedupe` exports live in the same module but on separate module-level Maps; the existing `checkRateLimit`/`recordFailedAttempt`/`resetRateLimit` API the login route depends on is byte-identical in behavior. A unit test asserts the new limiter does not interfere with the failure-lockout API (prohibition #6), and the full auth-login test suite still passes 3/3.
- **Concurrent-click safety (must_haves truth #4) verified.** `Promise.all` of 8 same-IP+link concurrent click requests inflates `click_count` by at most 1 — Node's single-threaded event loop serializes the Map writes.
- **Test reset affordance (RESEARCH Pitfall 3) shipped and applied.** `_resetForTests()` clears the new count-based limiter's Maps; it is called in `beforeEach` of every suite that hits a public write route — the insider-lifecycle, tracking-redirect, and rate-limit suites — so the module-level Map state (shared across tests in a file via `fileParallelism:false`) cannot trip the 5/60s subscribe cap or 60/60s flood cap mid-suite.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): count-based limiter + subscribe hard 429 end-to-end** - `81e020c` (feat) — verified end-to-end via the tracer's `<automated>` vitest command (interactive + end-of-phase default + automated-only → re-run, passed) before expanding to Task 2 per #3299 branch 3
2. **Task 2: click/redirect flood cap + 60s dedupe — silent skip, no 429** - `c421e08` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `src/lib/rateLimit.ts` (MOD) — additive count-based limiter on a new module-level `requestWindows` Map with `consumeRequest(key, limit, windowMs)` returning `{ allowed, retryAfterSeconds }`; lazy-prune-on-touch per the tokenBlacklist pattern; new `consumeDedupe(key, windowMs)` on a separate `dedupeWindows` Map for the click/redirect per-IP+link 60s dedupe; `_resetForTests()` test affordance clearing ONLY the new Maps. The existing failure-lockout API (`attempts` Map, `checkRateLimit`/`recordFailedAttempt`/`resetRateLimit`) is byte-identical. Single-instance comment block cites `ecosystem.config.js instances:1, fork` as the hard prerequisite for both Maps (prohibition: do not change PM2 config this phase).
- `src/app/api/v1/public/insider/route.ts` (MOD) — POST handler opens its `try` block with `consumeRequest('subscribe:${getClientIp(req)}', 5, 60_000)`; on `!allowed` returns the login-route-shaped 429 envelope `{ status: 'error', message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.' }` with the `Retry-After` header set from `retryAfterSeconds` (new `tooManyRequests` helper modeled on `auth/login/route.ts:8-13`). Threshold constants (`SUBSCRIBE_LIMIT=5`, `SUBSCRIBE_WINDOW_MS=60000`) at the top of the file — tunable.
- `src/app/api/v1/public/tracking/click/route.ts` (MOD) — computes `ip = getClientIp(req)` once after the existing reference-check passes; runs `consumeRequest('click:${ip}', 60, 60_000)` and `consumeDedupe('${ip}:${affiliateLink._id}', 60_000)` BEFORE the write pair; on `skipWrites = !allowed || isDuplicate` skips BOTH the ClickLog insert AND the `click_count $inc`; the success envelope `{ status: 'success', redirect_url }` still returns (D-13 — never a 429 to the caller).
- `src/app/api/v1/public/tracking/redirect/route.ts` (MOD) — same flood cap + dedupe before the write pair, but with the ref-anchor integrity contract: the ClickLog `Promise.all` payload conditions the `$inc` on `!skipIncrement` (`...skipIncrement ? [] : [findByIdAndUpdate(...)]`) so the ClickLog is ALWAYS created even on dedupe/over-cap — only the `$inc` is skipped. The blacklisted branch and all 302s (to /blocked?ref, to the offer, to the fallback) are unchanged.
- `tests/api/rate-limit.test.ts` (NEW) — 15 tests covering (a) subscribe 5/60s boundary, per-IP isolation, window expiry via direct consumeRequest calls with short windows, the /subscribe alias identical behavior, and limiter non-interference with the failure-lockout API; (b) consumeDedupe unit (first-touch vs duplicate, stale-entry pruning); (c) click single-write dedupe on duplicate IP+link, 61st-still-200 within flood cap, concurrent Promise.all dedupe ≤1 increment, distinct-IPs-count; (d) redirect dedupe skip-$inc with the ref-anchor contract (ClickLog always created, $inc skipped on dup), distinct-IPs-count on the redirect path. Mailer is mocked identically to insider-lifecycle.test.ts. Test isolation uses single-entry X-Forwarded-For values per the order-invariance threat T-1-16 contract.
- `tests/api/insider-lifecycle.test.ts` (MOD) — `_resetForTests()` import + call in `beforeEach` (Pitfall 3 — the existing suite hits createHandler multiple times from the default IP 127.0.0.1; without reset, the new 5/60s subscribe cap trips before the suite is done)
- `tests/api/tracking-redirect.test.ts` (MOD) — `_resetForTests()` import + call in `beforeEach`; new test case asserting a blacklisted click WITH dedupe active still 302s to `/blocked?ref=<24-hex>` (ref anchor always created — must_haves truth #5) with `click_count === 1` after two serial redirects (the duplicate skips the `$inc`).

## Decisions Made

See `key-decisions` frontmatter above. The four decisions worth surfacing for downstream plans:

1. **Additive-over-replace** (prohibition #6): the new consume* functions live as siblings to the failure-lockout API on a separate Map; a unit test pins non-interference so a refactor that accidentally shares state would fail the build.
2. **Ref-anchor asymmetry** (SEC-04/dedupe-vs-ref assumption): the redirect route's ClickLog is always created; only the $inc is deduped. The click route skips both. Same limiter primitive, two consumer policies — pinned by tests on both routes.
3. **Alias covered by the existing re-export** (prohibition #5): the /subscribe path was not given a separate handler — it inherits the subscribe cap by importing `POST` from `../insider/route`. No alias file edit needed.
4. **Threshold constants at the integration site** are the tunable surface for ops (VPS post-deploy); the boundary BEHAVIOR is what the tests pin (D1-D7), not the threshold VALUES (coverage D8 defers value-tuning to a real-traffic VPS smoke).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- During Task 2, the first test run revealed that my redirect-route dedupe test asserted the ClickLog count would be exactly 1 on a duplicate — but the plan's `SEC-04/dedupe-vs-ref` flagged-assumption explicitly states the redirect route ALWAYS creates the ClickLog (each touch gets its own /blocked ref anchor). The implementation was correct (always-create-ClickLog, skip-only-$inc-on-dedupe); the test assertion was wrong. Fixed by adjusting the test to assert only the `click_count` skips on dedupe, not the ClickLog row count. Re-ran Task 2 `<verify>`: 19/19 pass. Not a deviation — a test-implementation correction guided by the plan's own documented assumption.
- Pre-existing Mongoose deprecation warning (`new: true` option on `findOneAndUpdate`) still surfaces in `npm test` output — documented across 01-01/01-02/01-03/01-04 summaries, out of scope for this plan (no new `findOneAndUpdate` calls added; the existing call sites in click/redirect preserved verbatim for the 01-01 contract).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 01-06** (Wave 3 — the SEC-02 secret purge + D-06 lazy fail-fast + D-07 key precedence + `gemini_api_key` schema field + D-08 secret-fallback CI gate extension to `tests/api/security-regressions.test.ts`). The rate-limiter module is now the canonical home for in-memory request-counting primitives; any future add (e.g. the click-redirect route family to be detailed in plan 07) is an additive sibling rather than a restructure.
- **For plan 01-07** (D-14 IP trust + escapeRegExp relocation + ReDoS hardening + DEPLOY.md Nginx overwrite): the limiter keys on `getClientIp(req)` exactly as the plan's must_haves truth `#6` says — its last-hop fix lands order-invariant to these tests (all single-entry X-Forwarded-For; the parse flips from `split(',')[0]` to `split(',').pop()` and every test's isolation is preserved). No test churn expected.
- Full suite green at close: **14 test files / 145 tests** pass (`npm test`); `npx tsc --noEmit` exit 0. Up from 13/130 at the close of 01-04 (+1 new test file, +15 tests).
- For **verify-work**: the only human-judgment-relevant artifact is the VPS post-deploy threshold tuning smoke (coverage D8) — the boundary BEHAVIOR is verified by D1-D7 here, the threshold VALUES (5/60s subscribe, 60/60s click/redirect flood cap, 60s dedupe) are the user-delegated starting points per RESEARCH Pattern 3.

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*

## Self-Check: PASSED
- Files exist: 7/7 modified+created source + test files + `01-05-SUMMARY.md` all present on disk
- Commits verified: `81e020c` (Task 1: limiter + subscribe 429), `c421e08` (Task 2: click/redirect flood cap + dedupe)
- Full suite at close: 14 files / 145 tests passing; `tsc --noEmit` exit 0
- MEASURED commits via `git rev-list --count 460b41ce..HEAD` = 2 production commits matching the plan's estimate of 2 tasks
- Tracer feedback gate (Task 1, #3299 branch 3): re-ran `<automated>` before expanding — passed; logged `⚡ Tracer verified end-to-end — expanding`
