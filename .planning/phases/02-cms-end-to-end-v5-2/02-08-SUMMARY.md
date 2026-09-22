---
phase: 02-cms-end-to-end-v5-2
plan: 08
subsystem: ui
tags: [admin-shell, modal, taxonomy, objectid, mongoose]

# Dependency graph
requires:
  - phase: 02-cms-end-to-end-v5-2 (plans 02-05, 02-06)
    provides: "User management PUT route + RBAC + taxonomy seed + sub-category routes — all present and tested but unreachable from the UI before this plan"
provides:
  - "Edit-user modal co-located inside UsersView, rendering on the Users tab (CR-02 closure)"
  - "Sub-category payload passing the ObjectId string through unchanged (CR-04 closure)"
  - "POST /cms/sub-categories validates categoryId as a real 24-hex ObjectId → 400 on malformed (WR-07)"
  - "PUT /cms/sub-categories/:id validates categoryId before assignment → 400, never 500 (WR-07)"
  - "Source-contract test pinning modal co-location + route regression tests pinning 400-not-500"
affects: [phase-02-verification, phase-03, future-admin-ui]

# Actuals (#2632) — pairs with the plan's `estimate` (tokens: 34000)
# Chars/4 over the realized diff (admin/page.tsx modal relocation + 1-line coercion fix,
# two route files with 5-8 line guards, two new test files ~80 + 147 lines).
# Final diff: 323 insertions + 85 deletions; ~33K chars / 4.
actuals:
  tokens: 8500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []  # no new packages (mongoose was already in tree)
  patterns:
    - "Types.ObjectId.isValid(String(x)) → 400 boundary gate on routes accepting a client-supplied ref id, mirroring the fail-closed discipline of getAuthUser"
    - "Source-contract test using readFileSync + indexOf ordering to pin a JSX block's co-location inside a specific view region (no jsdom)"

key-files:
  created:
    - tests/api/admin-edit-user-modal.test.ts
    - tests/api/sub-categories-objectid.test.ts
  modified:
    - src/app/admin/page.tsx
    - src/app/api/v1/cms/sub-categories/route.ts
    - src/app/api/v1/cms/sub-categories/[id]/route.ts

key-decisions:
  - "Modal moved into UsersView (not into renderContent), matching the established co-location pattern of the sibling Add-user modal — keeps the modal and its trigger in one component instance"
  - "ObjectId validation sits AFTER the existing required-field 400 on POST but BEFORE SubCategoryModel.create, so a non-ObjectId string never reaches Mongoose and never becomes a 500 CastError"
  - "PUT preserves 404-first ordering (reject unknown sub-category id before validating the categoryId body field), then validates categoryId before assigning it"
  - "POST returns HTTP 200 by default (no explicit status code in the unchanged success path); tests assert exactly 200, not 201"

patterns-established:
  - "Boundary ObjectId gate: Types.ObjectId.isValid(String(value)) returning the same 400 status + Vietnamese message at every route accepting a client-supplied Mongo ref id (matches auth.ts fail-closed)"
  - "Source-contract co-location pin: assert indexOf(modal-marker) is between indexOf(viewStart) and indexOf(viewEnd) — catches future edits that re-nest modals in the wrong view without a jsdom suite"

requirements-completed: [AUTH-04, CMS-04]

# Coverage (#1602) — per-deliverable traceability matrix
coverage:
  - id: D1
    description: "Edit-user modal renders on the Users tab (CR-02)"
    requirement: AUTH-04
    verification:
      - kind: unit
        ref: "tests/api/admin-edit-user-modal.test.ts#the modal sits inside the UsersView region"
        status: pass
      - kind: unit
        ref: "tests/api/admin-edit-user-modal.test.ts#the modal has not been re-nested inside BlacklistView"
        status: pass
      - kind: unit
        ref: "tests/api/admin-edit-user-modal.test.ts#renders the UI-SPEC D-14 title 'Edit team member' and contains no password input"
        status: pass
    human_judgment: true
    rationale: "Source contract pins position, but the browser-side mount-and-render flow on the Users tab is not exercised by the node-only vitest suite"

  - id: D2
    description: "Sub-category create persists category_id equal to the supplied 24-hex ObjectId (CR-04)"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/sub-categories-objectid.test.ts#persists a sub-category with a real 24-hex categoryId"
        status: pass
    human_judgment: false

  - id: D3
    description: "POST /cms/sub-categories rejects malformed categoryId with 400, never 500 (WR-07)"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/sub-categories-objectid.test.ts#rejects a malformed categoryId with 400, never 500 (WR-07)"
        status: pass
    human_judgment: false

  - id: D4
    description: "PUT /cms/sub-categories/:id rejects malformed categoryId with 400 and leaves stored category_id unchanged (WR-07)"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/sub-categories-objectid.test.ts#rejects a malformed categoryId with 400, never 500, and leaves the stored category_id unchanged"
        status: pass
    human_judgment: false

# Metrics
duration: 84min
completed: 2026-09-22
status: complete
---

# Phase 02 Plan 08: Edit-user Modal Relocation + Sub-category ObjectId Fix Summary

**Edit-user modal moved into UsersView and sub-category ObjectId coercion/route validation fixed: taxonomy and user management flows are now reachable from the admin UI and reject bad ids at the boundary instead of 500ing.**

## Performance

- **Duration:** ~84 min (includes ~25 min of MongoMemoryServer cold-start flakiness investigation on first test run)
- **Started:** 2026-09-22T12:12:05Z
- **Completed:** 2026-09-22T13:36:07Z
- **Tasks:** 2
- **Files modified:** 5 (2 source + 2 test new + 1 source modified across both tasks)

## Accomplishments

- **CR-02 closed:** the `{showEditUserModal && editingUser && (...)}` JSX block was moved out of `BlacklistView` and into `UsersView`'s returned JSX, positioned right after the existing Add-user modal. The Users-tab Edit button now opens the modal because the modal's host view is mounted. The block appears exactly once in the source.
- **CR-04 closed:** `handleSaveSubCategory` no longer coerces the parent category id via `Number(subCatParentId)` (which produced `NaN` → JSON `null` and broke both sub-category create and re-parent). It now passes the ObjectId string through unchanged via `subCatParentId ? String(subCatParentId) : undefined`, mirroring the existing `categoryId: categoryId || undefined` pattern at line 2118.
- **WR-07 closed:** both sub-category routes now validate the client-supplied `categoryId` against `Types.ObjectId.isValid(String(categoryId))` and return `{ status: 'error', message: 'CategoryId không hợp lệ' }` with HTTP 400 — before any DB write attempt. POST validates after the existing required-field 400 but before `SubCategoryModel.create`; PUT validates after the 404 lookup but before assigning `category_id`. A malformed id never reaches Mongoose and never becomes a 500 CastError.
- Two regression tests added that pin these contracts.

## Task Commits

Each task was committed atomically:

1. **Task 1: relocate Edit-user modal into UsersView + source contract test** — `408538e` (fix)
2. **Task 2: pass ObjectId through sub-category payload + route validation + tests** — `1c92652` (fix)

## Files Created/Modified

- `src/app/admin/page.tsx` — Edit-user modal moved from `BlacklistView` region to `UsersView` region (after Add-user modal, before `ArticlesView` marker); `handleSaveSubCategory` payload `categoryId: Number(subCatParentId)` → `categoryId: subCatParentId ? String(subCatParentId) : undefined`.
- `src/app/api/v1/cms/sub-categories/route.ts` — Added `import { Types } from 'mongoose'`; added ObjectId validation gate between the existing required-field 400 check and `SubCategoryModel.create`.
- `src/app/api/v1/cms/sub-categories/[id]/route.ts` — Added `import { Types } from 'mongoose'`; guarded the `category_id` assignment on PUT with the same ObjectId validation gate. 404-first ordering preserved.
- `tests/api/admin-edit-user-modal.test.ts` (NEW) — Source contract: modal block count (exactly once), ordering assertions (modal > UsersView marker, modal < ArticlesView marker, modal < BlacklistView marker), `openEditUserModal(u)` trigger presence, and the UI-SPEC D-14 contents check (title + no password input inside the modal region).
- `tests/api/sub-categories-objectid.test.ts` (NEW) — Route regression using `seedScenario`/`jsonRequest`/`params` factories after `tests/api/cms-users-update.test.ts`: real 24-hex id → 200 + persisted `category_id`; `'not-an-object-id'` on POST → 400 and `not.toBe(500)`; `'not-an-object-id'` on PUT → 400 and the stored `category_id` is unchanged.

## Decisions Made

- **Modal moved into UsersView, not into renderContent.** The plan and PATTERNS.md CR-02 section both direct this: the sibling Add-user modal is already co-located inside UsersView, so the Edit-user modal follows the same pattern. Putting it at the top level would require lifting state and break the established one-trigger-one-host view invariant.
- **ObjectId validation sits after the existing required-field 400 on POST but before `SubCategoryModel.create`.** This preserves the existing error precedence (missing required fields fail first) and ensures a non-ObjectId string never reaches Mongoose — so the catch block's 500 path (`'Lỗi tạo danh mục con'`) cannot fire for an id shape problem.
- **PUT keeps 404-first ordering.** The existing `findById` + 404 branch runs before the new ObjectId validation on `categoryId`, so a request to an unknown sub-category id still returns 404 even if the request body also has a bad `categoryId`. Both validations return the same 400 envelope/message so the client sees consistent error messaging.
- **POST tests assert exactly 200, not 201.** The unchanged success path uses plain `NextResponse.json({ ... })` with no explicit status code, so the default 200 stands. The plan permitted accepting either code; we assert the code the route actually returns.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes needed.

## Issues Encountered

- **MongoMemoryServer cold-start flakiness:** the first combined run of `npx vitest run tests/api/sub-categories-objectid.test.ts tests/api/categories-taxonomy.test.ts` timed out after 300s with a `Instance failed to start within 10000ms` error from `mongodb-memory-server-core`. Re-running the two files sequentially succeeded with both green (3 + 3 tests). This is an environment-side flake, not a test defect; the file-parallelism=false setting in `vitest.config.ts` already addresses it for sequential runs.
- **tsc latency on Windows:** `npx tsc --noEmit` exceeded the 180s and 300s tool timeouts on this machine on a couple of runs even though it ultimately exits 0; calling `node node_modules/typescript/bin/tsc --noEmit` directly with a longer timeout succeeded cleanly. No type errors were produced by either the modal relocation or the ObjectId validation guards.

## Known Stubs

None — both fixes wire real data end-to-end (modal operates on the real `editingUser` state; sub-category create/persist goes through the real Mongoose model). No placeholder text, no mock-only fields.

## Threat Flags

No new security surface introduced beyond the plan's `<threat_model>`. T-02-07 (Tampering) and T-02-08 (Information Disclosure) mitigations are implemented and tested; T-02-09 (Edit-user modal EoP) stays accepted because the underlying route guard is unchanged.

## Self-Check: PASSED

- Verified `src/app/admin/page.tsx` — modal marker count = 1, ordering: UsersView < modal < ArticlesView < BlacklistView. ✓
- Verified `src/app/api/v1/cms/sub-categories/route.ts` — `Types` imported; ObjectId gate present between required-field check and `SubCategoryModel.create`. ✓
- Verified `src/app/api/v1/cms/sub-categories/[id]/route.ts` — `Types` imported; ObjectId gate present inline before `category_id` assignment; 404 branch untouched. ✓
- Verified `tests/api/admin-edit-user-modal.test.ts` exists and passes (5/5). ✓
- Verified `tests/api/sub-categories-objectid.test.ts` exists and passes (3/3). ✓
- Verified commit `408538e` and commit `1c92652` both in `git log`. ✓
- `npx tsc --noEmit` exits 0. ✓

## Next Phase Readiness

- Both CR-02 and CR-04 are closed; combined with the already-complete 02-07 (CR-01 + CR-03) and 02-09 (WR-02), the four gap-closure plans together address all four blockers from `02-VERIFICATION.md`. AUTH-04 and CMS-04 are now satisfiable in the verify re-run.
- The pattern of boundary ObjectId gates on client-borne ref ids is now established and can be audit-applied to any other route accepting a Mongo ref from a form (catalog for future audit).

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-22*
