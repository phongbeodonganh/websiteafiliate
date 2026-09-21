---
phase: 02-cms-end-to-end-v5-2
plan: 04
subsystem: api
tags: [blacklist, sweep, after, next16, mongoose, batch, restore, d-05-d-08, aff-04]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: 02-01 async DB-backed auth guard (`await getAuthUser(req)`); 02-03 shared `cmsFetch` + canonical admin editor; 02-05 admin RBAC + admin-page baseline
  - phase: 01-security-remediation
    provides: canonical `getAuthUser` guard; `escapeRegExp` ReDoS single source (Phase 1 T-1-17)

provides:
  - "`sweepDomains(domains)` — one `updateMany` per domain with boundary-safe hostname matching (exact + subdomain yes; substring look-alikes no)"
  - "`restoreSweep()` — flips only `blacklisted`-and-no-longer-matching links to `active`; `inactive` never enters a filter"
  - "`sweepBlacklistAndRestore()` composite returning `{ swept, restored }`"
  - "`scheduleAfterResponse(fn)` — Next `after()` with a fire-and-forget fallback for the E468 outside-request-scope case"
  - "`POST /api/v1/cms/blacklist/re-sweep` admin-only route on the sibling-blacklist-write 401 contract"
  - "Non-blocking `import-sheet-url`: rows persisted, response returned, sweep scheduled post-response; no synchronous `totalSweptCampaigns`"
  - "Admin blacklist tab Re-sweep control + eventual-count import copy + distinct blacklisted/inactive campaign chips"

affects: [02-cms-end-to-end-v5-2, future blacklist/sweep work]

actuals:
  tokens: 8664
  tasks: 3
  commits: 3
  plan_head_before: 8ddff01611047962019c49d1230e09fa2caf8c73

tech-stack:
  added: []
  patterns:
    - "Boundary-safe domain matching by hostname equality/suffix — no user-supplied text compiled into a RegExp (closes both the over-match and the ReDoS vector)"
    - "One candidate read + one `updateMany` per domain per sweep direction; no per-link `save()` loop"
    - "Post-response work behind a `scheduleAfterResponse` seam that degrades to fire-and-forget outside a request scope (testable route handlers)"
    - "Restore filter is exactly `{ status: 'blacklisted', <no active match> }` — `inactive` is excluded by construction, never by a `$ne`"

key-files:
  created:
    - src/lib/schedule-after-response.ts
    - src/app/api/v1/cms/blacklist/re-sweep/route.ts
    - tests/lib/blacklist-sweep.test.ts
    - tests/api/blacklist-import-async.test.ts
  modified:
    - src/lib/blacklist.ts
    - src/app/api/v1/cms/blacklist/import-sheet-url/route.ts
    - src/app/admin/page.tsx
    - tests/api/cms-auth-401.test.ts

key-decisions:
  - "Boundary-safe matching is done in JS (parse each base_url's hostname, equality/suffix test) rather than via `$regex` — a substring regex over-matches (`notbadsite.com`, `badsite.com.evil.net`) and is a sheet-supplied ReDoS vector (T-02-13/T-02-14, Pitfall 3)"
  - "`scheduleAfterResponse` normalizes the callback's return value away so a `() => sweepDomains(...)` thunk (which resolves to a value) satisfies `after()`'s `void | Promise<void>` contract"
  - "Only the E468 / outside-request-scope error is swallowed into the fallback; any other `after()` registration failure is logged rather than silently dropped"
  - "The re-sweep route copies the sibling blacklist-write combined guard verbatim — 401 for BOTH a missing token and a non-admin principal; no 403 branch invented"
  - "`sweepRetroactiveBlacklist` is kept as a thin single-domain wrapper returning the legacy `{ totalUpdatedLinks, updatedLinks }` shape so `blacklist/route.ts` and `quick-blacklist` response bodies are unchanged"
  - "`blacklist/import` (the sample-data route) was left on the legacy synchronous wrapper — only the sheet import path was reworked, keeping this plan's scope to the D-05 call site"

patterns-established:
  - "A pure lib sweep/restore surface with no Next request-context dependency; `after()` lives behind one seam so the suite never sees E468"
  - "Parametric CMS route inventory extended per new route (the fs-glob guard fails on any unregistered route)"

requirements-completed: [AFF-04]

coverage:
  - id: D1
    description: "A sheet import persists blacklist rows and returns immediately with `totalImported`; the sweep runs after the response (no synchronous `totalSweptCampaigns`) and no E468 is thrown in a route-handler test"
    requirement: AFF-04
    verification:
      - kind: integration
        ref: "tests/api/blacklist-import-async.test.ts#returns immediately with a numeric totalImported (no synchronous swept count)"
        status: pass
      - kind: integration
        ref: "tests/api/blacklist-import-async.test.ts#schedules the sweep post-response — a matching active link flips blacklisted, and no E468 is thrown"
        status: pass
    human_judgment: false
  - id: D2
    description: "The sweep is batched and boundary-safe: `badsite.com` marks `badsite.com` + `sub.badsite.com` blacklisted and leaves `notbadsite.com`, `badsite.com.evil.net` and an `inactive` link untouched; a second run reports 0 modified"
    requirement: AFF-04
    verification:
      - kind: unit
        ref: "tests/lib/blacklist-sweep.test.ts#marks exact + subdomain matches blacklisted, leaves substring look-alikes and inactive untouched"
        status: pass
      - kind: unit
        ref: "tests/lib/blacklist-sweep.test.ts#is idempotent — a second run reports 0 modified"
        status: pass
      - kind: unit
        ref: "tests/lib/blacklist-sweep.test.ts#no-ops on an empty domain list and never throws"
        status: pass
    human_judgment: false
  - id: D3
    description: "`restoreSweep()` / `sweepBlacklistAndRestore()` restore only no-longer-matching `blacklisted` campaigns to `active` and never resurrect a manually-`inactive` campaign"
    requirement: AFF-04
    verification:
      - kind: unit
        ref: "tests/lib/blacklist-sweep.test.ts#flips a no-longer-matching blacklisted link to active and leaves inactive alone"
        status: pass
      - kind: unit
        ref: "tests/lib/blacklist-sweep.test.ts#sweepBlacklistAndRestore sweeps matches and restores orphans in one action"
        status: pass
    human_judgment: false
  - id: D4
    description: "`POST /api/v1/cms/blacklist/re-sweep` is admin-only on the sibling-blacklist-write contract: 401 with no token, 401 with an editor token, 200 with an admin; it reports swept/restored and the manually-`inactive` campaign stays `inactive`"
    requirement: AFF-04
    verification:
      - kind: integration
        ref: "tests/api/blacklist-import-async.test.ts#returns 401 with no token"
        status: pass
      - kind: integration
        ref: "tests/api/blacklist-import-async.test.ts#returns 401 with an editor token (sibling blacklist-write guard, not 403)"
        status: pass
      - kind: integration
        ref: "tests/api/blacklist-import-async.test.ts#an admin re-sweep reports both counts and never touches a manually-inactive campaign"
        status: pass
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts#POST src/app/api/v1/cms/blacklist/re-sweep/route.ts → 401 without a token"
        status: pass
    human_judgment: false
  - id: D5
    description: "The admin blacklist tab offers a Re-sweep control with the documented tooltip and a Re-sweeping disabled state, distinct blacklisted/inactive campaign chips, and eventual-count import copy"
    requirement: AFF-04
    verification: []
    human_judgment: true
    rationale: "The copy strings, the control, and the chip branches are present and typecheck-clean, but the rendered DOM, the spinner/disabled state, and the toast presentation are browser-only — vitest runs `environment: 'node'` with no jsdom, so this half is manual UAT."

duration: 20min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 4: Background Batched Blacklist Sweep + Reversible Re-sweep Summary

**Reworked the Google Sheet blacklist import to return immediately while a batched, boundary-safe sweep runs post-response via `after()`, and added an admin-only `re-sweep` route + UI that restores no-longer-blocked campaigns to `active` without ever touching a manually-`inactive` one.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-21T06:53:59Z
- **Completed:** 2026-09-21T07:14:00Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Added `sweepDomains(domains)` — one `updateMany` per unique domain over a single candidate read, replacing the old per-link `save()` loop (D-06). Domain matching is boundary-safe by hostname equality/subdomain suffix: `badsite.com` matches `https://badsite.com/x` and `https://sub.badsite.com/x`, but NOT `notbadsite.com` or `badsite.com.evil.net` (T-02-14, Pitfall 3). No user-supplied text is compiled into a RegExp, which also closes the sheet-supplied ReDoS path (T-02-13).
- Added `restoreSweep()` and `sweepBlacklistAndRestore()` (D-07/D-08): the restore filter is exactly `{ status: 'blacklisted', <no active blacklist match> }` — `inactive` never enters a filter, so a manually-deactivated campaign is never resurrected (T-02-15, Pitfall 4).
- Added `src/lib/schedule-after-response.ts`: `scheduleAfterResponse(fn)` calls Next's `after(fn)` and, on the E468 "outside a request scope" error (exactly what a direct Vitest route-handler invocation produces), falls back to a detached fire-and-forget promise — so a successful import in a test does not throw (RESEARCH Pitfall 1).
- Reworked `import-sheet-url/route.ts`: rows are persisted into an array, the in-loop `await sweepRetroactiveBlacklist(...)` is gone, and the sweep is scheduled after the response on the success path. The response is `{ status:'success', data:{ totalImported, csvExportUrl } }` with no synchronous `totalSweptCampaigns` (D-05). `sweepRetroactiveBlacklist` survives as a thin single-domain wrapper so `blacklist/route.ts` and `quick-blacklist` keep their response contract.
- Added `POST /api/v1/cms/blacklist/re-sweep` (D-08) with the exact sibling blacklist-write combined guard — 401 for both a missing token and a non-admin principal — returning `{ swept, restored }`; registered in the parameterized CMS 401 route inventory.
- Wired the admin blacklist tab: a cyan `Re-sweep blacklist` control with the documented tooltip and a `Re-sweeping…` disabled state, the eventual-count import copy, the swept/restored result copy (singular/plural, and the no-change copy at 0/0), and distinct rose `BLACKLISTED` / slate `INACTIVE` campaign chips (UI-SPEC Interaction Contract 12). Both new calls route through the shared `cmsFetch` helper so a non-2xx surfaces a toast.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — import a sheet, get the response immediately, sweep lands after** - `a72bbde` (feat)
2. **Task 2: Re-sweep admin route — sweep + restore in one admin-only action (D-08)** - `e80b7c2` (feat)
3. **Task 3: Admin blacklist UI — eventual import copy + Re-sweep control** - `478b360` (feat)

**Plan metadata:** (pending docs commit)

_Note: Task 1 is a tracer task; its feedback gate was evaluated (end-of-phase mode, automated-only verify, no failure) and it expanded as designed._

## Files Created/Modified
- `src/lib/blacklist.ts` - MOD: `buildDomainMatcher`, `sweepDomains`, `restoreSweep`, `sweepBlacklistAndRestore`; `sweepRetroactiveBlacklist` becomes a single-domain wrapper; raw `$regex`/`escapeRegExp` import removed
- `src/lib/schedule-after-response.ts` - NEW: `after()` with an E468 fire-and-forget fallback
- `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts` - MOD: persist rows, return immediately, schedule sweep post-response
- `src/app/api/v1/cms/blacklist/re-sweep/route.ts` - NEW: admin-only sweep + restore `POST`
- `src/app/admin/page.tsx` - MOD: `handleReSweepBlacklist`, `isReSweeping`; Re-sweep control; eventual import copy; blacklisted/inactive chips
- `tests/lib/blacklist-sweep.test.ts` - NEW: 5 tests (boundary, idempotency, empty, restore, composite)
- `tests/api/blacklist-import-async.test.ts` - NEW: 5 tests (import immediacy, post-response sweep, re-sweep auth + behavior)
- `tests/api/cms-auth-401.test.ts` - MOD: re-sweep route registered in the ROUTES inventory

## Decisions Made
- **Boundary-safe matching in JS, not `$regex`.** Parsing each candidate's hostname and doing equality/suffix tests avoids both the substring over-match and the ReDoS vector that a sheet-supplied `$regex` would carry; the plan explicitly permitted this and forbade a raw substring match.
- **`scheduleAfterResponse` normalizes the return value.** A `() => sweepDomains(...)` thunk resolves to a value, but `after()` requires `void | Promise<void>`; the helper wraps the callback so callers can pass a value-returning function.
- **Only E468 is swallowed.** A different `after()` registration failure is `console.error`-ed rather than silently degraded, so a real scheduling bug is not hidden.
- **Re-sweep guard copies the sibling verbatim.** The combined `!user || role !== 'admin'` returns 401 for both a missing token and a non-admin principal; no 403 branch was invented (documented in `cms-auth-401.test.ts:170-180`).
- **Legacy wrapper preserved.** `sweepRetroactiveBlacklist` keeps its `{ totalUpdatedLinks, updatedLinks }` shape (with `updatedLinks: []`) so the two existing single-domain callers are untouched. The sample-data `blacklist/import` route was deliberately left on it — only the D-05 sheet-import call site was reworked.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The tracer gate confirmed the end-to-end slice first: import returns immediately, and a seeded matching link flips to `blacklisted` after the background promise settles — with no E468 in the output.
- Pre-existing mongoose `findOneAndUpdate` `new`-option deprecation warnings appear in test output; they are baseline and out of scope.
- Full suite green after all three tasks: 28 files / 268 tests; `npx tsc --noEmit` exit 0.

## Threat Surface Scan
- T-02-12 (non-admin triggering import/re-sweep): mitigated — both routes carry the combined admin guard; the new re-sweep route is in the parameterized 401 inventory.
- T-02-13 (sheet-supplied domain → ReDoS): mitigated — matching is hostname equality/suffix; no RegExp is compiled from sheet text.
- T-02-14 (over-broad match blacklists unrelated campaigns): mitigated — boundary-safe matcher with explicit negative tests.
- T-02-15 (restore resurrects a manually-disabled campaign): mitigated — restore filter is exactly `{ status:'blacklisted', ... }`; `inactive` excluded by construction.
- T-02-16 (import blocked behind N sequential writes): mitigated — sweep runs post-response via `after()` with a request-scope fallback.
- T-02-17 (background sweep failure invisible to client): accepted — success copy is eventual; the sweep logs with a context prefix.
- T-02-SC (package legitimacy): not applicable — zero packages installed.
- No new network endpoints beyond the planned admin re-sweep route; no new auth paths.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AFF-04's import contract is delivered: a large sheet returns immediately, the sweep is batched and boundary-safe, and the sweep is reversible through an admin action that never touches manual deactivations.
- The sweep/restore functions are pure lib exports with direct unit tests; no request context is required, so future work can test them without a Next harness.
- Manual UAT pending (browser-only): paste a sheet and confirm the response returns immediately with the "sweep is running" notice; click Re-sweep and see swept/restored counts with a manually-inactive campaign left inactive.
- Ready for the next plan in Phase 02.

## Self-Check: PASSED

- `src/lib/schedule-after-response.ts`, `src/app/api/v1/cms/blacklist/re-sweep/route.ts`, `tests/lib/blacklist-sweep.test.ts`, `tests/api/blacklist-import-async.test.ts` all present
- `git log --oneline --all --grep="02-04"` returns the three task commits
- Plan verification: `npx vitest run tests/lib/blacklist-sweep.test.ts tests/api/blacklist-import-async.test.ts tests/api/cms-auth-401.test.ts` → green; full `npx vitest run` → 28 files / 268 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
