---
phase: 02-cms-end-to-end-v5-2
plan: 01
subsystem: auth
tags: [jwt, auth-guard, mongoose, rbac, vitest, d-15]

requires:
  - phase: 01-security-remediation
    provides: AUTH-01 canonical `getAuthUser` guard + parameterized 401 gate, JWT-in-localStorage decision (D-15), token blacklist
provides:
  - Async `getAuthUser(req): Promise<AuthPayload | null>` that verifies the signature AND confirms the principal exists and is `active` in the DB
  - Fail-closed (null, never CastError) handling of malformed/non-ObjectId userId
  - All 41 `getAuthUser` call sites across 27 route files awaited
  - Inactive/missing/malformed/active regression matrix across route classes with a reactivation case
  - Source-contract test proving every `getAuthUser(` call site under `src/app/api/v1/**` is awaited
affects: [02-cms-end-to-end-v5-2, 05-hygiene, all future CMS route work]

actuals:
  tokens: 9846
  tasks: 2
  commits: 2
  plan_head_before: c3b1310ecda0bb32ca524c9d16aec051f4a639e1

tech-stack:
  added: []
  patterns:
    - "Canonical async auth guard: verify signature → fail-closed id-shape check → indexed DB status lookup → status gate"
    - "Test-only principals seeded as real UserModel docs and signed with their ObjectId `_id`; non-ObjectId literals reserved for fail-closed rejection cases"

key-files:
  created:
    - tests/api/cms-auth-inactive.test.ts
  modified:
    - src/lib/auth.ts
    - 27 route files under src/app/api/v1/**
    - tests/api/cms-auth-401.test.ts
    - tests/api/insider-admin.test.ts

key-decisions:
  - "Fail-closed via `Types.ObjectId.isValid()` pre-check rather than try/catch — a non-ObjectId userId returns null before any DB call, so `findById` can never throw CastError into a 500 (T-02-06)"
  - "Missing user and inactive user are one rejection class: both return null from getAuthUser and inherit each route's existing 401/403 — no new status code introduced"
  - "Test files that need a PASS-case principal must seed an active UserModel and sign with its real ObjectId `_id`; the fail-closed path only covers rejection cases"

patterns-established:
  - "Async guard + live DB status: the single canonical guard enforces D-15 across all 27 routes without per-route duplication"
  - "Source-contract test walking `src/app/api/v1/**/route.ts` to fail loudly on any un-awaited guard call (auth-bypass regression gate)"

requirements-completed: [AUTH-04]

coverage:
  - id: D1
    description: "getAuthUser is async and rejects tokens belonging to inactive or deleted users on the next request (D-15, A1)"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-inactive.test.ts#rejects an inactive user token with 401 on GET /api/v1/cms/articles and GET /api/v1/auth/me"
        status: pass
      - kind: integration
        ref: "tests/api/cms-auth-inactive.test.ts#rejects a token for a user document that does not exist with 401 (deleted account, A1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Malformed/non-ObjectId userId fails closed with the route's 401/403, never a 500 (CastError closure)"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-inactive.test.ts#fails closed on a malformed/non-ObjectId userId with 401 — never a 500 (CastError closure)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Inactive lockout proven across route classes: dashboard read, admin-only users write, article resource, logout"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-inactive.test.ts#D-15 — inactive lockout holds across route classes"
        status: pass
    human_judgment: false
  - id: D4
    description: "Reactivation restores access — the guard reads live DB state, not a token-baked value"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-inactive.test.ts#a user rejected while inactive passes the guard after status flips to active"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every getAuthUser call site under src/app/api/v1/** is awaited (no silent auth bypass)"
    requirement: AUTH-04
    verification:
      - kind: unit
        ref: "tests/api/cms-auth-inactive.test.ts#source contract: every getAuthUser( call site under src/app/api/v1/** is awaited"
        status: pass
    human_judgment: false
  - id: D6
    description: "Existing parameterized 401 gate stays green; control case seeds an active user so it exercises the guard's success path"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts (all 61 tests)"
        status: pass
      - kind: integration
        ref: "tests/api/insider-admin.test.ts (all 3 cases: 403 fail-closed, 503 no-cron, 200 cron-set)"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 1: Async DB-Backed Auth Guard (D-15) Summary

**`getAuthUser` converted from signature-only sync to async with a fail-closed, DB-backed active-status check awaited at all 41 call sites across 27 routes — inactive and deleted accounts are locked out on the next request.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-21T10:52:00Z
- **Completed:** 2026-09-21T11:01:47Z
- **Tasks:** 2
- **Files modified:** 31 (1 created, 30 modified)

## Accomplishments
- `getAuthUser(req)` is now `async … Promise<AuthPayload | null>`; after `verifyToken` it performs one indexed `UserModel.findById` lookup and returns `null` for a missing or `inactive` user — closing the existing-token window D-15 targets across the whole CMS surface at once.
- Malformed/non-ObjectId `userId` fails closed via a `Types.ObjectId.isValid()` pre-check: `findById` never runs and can never throw CastError into a 500, so routes calling the guard outside a try/catch (e.g. `insider/send-now`) leak nothing.
- All 41 `getAuthUser(req)` call sites across the 27 route files are awaited; the parameterized AUTH-01 401 gate (61 tests) stays green.
- New regression suite proves inactive → 401, deleted → 401, malformed → 401/403 (never 500), active → pass, across a plain read route, an admin-only write route, a resource route and logout; plus a reactivation case and a source-contract walk over every `route.ts` for awaited calls.
- `insider-admin.test.ts` pass-case tokens now sign a seeded active admin's real ObjectId (test 2 → 503, test 3 → 200), while the `'editor-id'` editor token remains a genuine fail-closed 403.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — deactivated user locked out end-to-end** - `63029ee` (feat)
2. **Task 2: Expansion — inactive/missing matrix across route classes** - `5f36abe` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/lib/auth.ts` - `getAuthUser` async; `Types.ObjectId.isValid` fail-closed pre-check; indexed `UserModel.findById` + `status !== 'active'` gate; lazy `getJwtSecret()` untouched
- 27 route files under `src/app/api/v1/**` - `const user = await getAuthUser(req)` (all 41 call sites, no status/role/message changes)
- `tests/api/cms-auth-inactive.test.ts` - NEW inactive/missing/malformed/active matrix, route-class cases, reactivation, source-contract walk
- `tests/api/cms-auth-401.test.ts` - control case seeds a real active admin; userId is its ObjectId
- `tests/api/insider-admin.test.ts` - seeds active admins (`insider-admin-cron-unset` / `insider-admin-cron-set`); tests 2/3 sign with real ObjectIds

## Decisions Made
- **Fail-closed mechanism:** `Types.ObjectId.isValid(String(payload.userId))` pre-check (chosen over a try/catch around `findById`) — stated in a Vietnamese rationale comment per repo convention.
- **Rejection class:** missing and inactive users collapse to `null` and inherit the route's existing 401/403; no new status code added.
- **Test principal policy:** any test whose principal must PASS the guard seeds an active `UserModel` and signs with that document's real ObjectId; non-ObjectId literals are reserved for fail-closed REJECTION cases.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `npx tsc --noEmit` is clean and the full suite is green (18 files, 200 tests) after both tasks.

## Threat Surface Known
- T-02-06 mitigated as planned: malformed id → `null` (401/403), never a 500.
- No new network endpoints, auth paths, or trust-boundary surface introduced — the only new DB work is the single indexed `_id` lookup documented in the plan (T-02-05 accepted).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-15 is enforced server-side for every authenticated CMS route; the guard is async so future route work must `await getAuthUser(req)` (enforced by the source-contract test).
- JWT transport/storage is untouched (Phase 1 D-15 lock): localStorage token, 24h expiry, now subject to a live status check.
- Ready for the next plan in Phase 02.

## Self-Check: PASSED

- `src/lib/auth.ts`, `tests/api/cms-auth-inactive.test.ts`, `tests/api/cms-auth-401.test.ts`, `tests/api/insider-admin.test.ts` all present
- Commits `63029ee` (Task 1) and `5f36abe` (Task 2) present in history
- `npm test` → 18 files / 200 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
