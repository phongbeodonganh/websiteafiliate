---
phase: 02-cms-end-to-end-v5-2
plan: 05
subsystem: api
tags: [cms, rbac, auth-02, auth-03, auth-04, user-management, vitest, d-13, d-14, d-16]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: 02-01 async DB-backed auth guard (inactive-user 401); 02-03 shared `cmsFetch` helper + canonical admin editor
  - phase: 01-security-remediation
    provides: canonical `getAuthUser` guard; CLI-only password recovery (D-04)

provides:
  - "`PUT /api/v1/cms/users/:id` updates role/status/name/avatar and returns avatar; the password path is removed entirely"
  - "Admin edit-team-member modal in the canonical admin shell (role/status/name/avatar, no password control)"
  - "Affiliate-link CRUD proven admin-only (editor/author 403) while GET stays permitted for select-to-attach"
  - "Article collection GET proven scoped to `author_id` for non-admins, with an empty (not 403) result at zero articles"
  - "`renderContent` permission-denied fallback + `ADMIN_ONLY_TABS` set; admin-tab nav gate pinned by a source-contract test"

affects: [02-cms-end-to-end-v5-2, future RBAC work, 05-hygiene]

actuals:
  tokens: 8106
  tasks: 3
  commits: 3
  plan_head_before: 4e608d294881b0ab5cff1208863482b1201b695e

tech-stack:
  added: []
  patterns:
    - "Role-gated action as a Set (`ADMIN_ONLY_TABS`) shared between nav and the content fallback"
    - "Source-contract test: an RBAC UI invariant is pinned by reading the shell source (copy string + gate ordering) so a future edit cannot silently drop it"
    - "Admin-only route enforcement remains primary; UI hiding pinned as defense-in-depth, never as the control"

key-files:
  created:
    - tests/api/cms-users-update.test.ts
    - tests/api/cms-rbac-affiliate-403.test.ts
    - tests/api/articles-list-scoping.test.ts
  modified:
    - src/app/api/v1/cms/users/[id]/route.ts
    - src/app/admin/page.tsx

key-decisions:
  - "PUT /users/:id drops `password` from the destructure and never assigns password_hash — a password-only request is a no-op (D-14, T-02-21); recovery stays CLI-only (Phase 1 D-04)"
  - "`avatar` is now applied and returned by PUT, matching the GET list shape (was previously omitted)"
  - "The edit modal routes its save through `cmsFetch` so a non-2xx surfaces the status-mapped toast instead of an `alert()` — the D-03 helper is used for the save call"
  - "The permission-denied fallback is gated on the requested `activeTab` being in `ADMIN_ONLY_TABS` AND a non-admin role, so the generic `Under Construction...` copy survives only for genuinely unknown tabs"
  - "Admin-only tab enforcement in the nav remains inside `currentUser.role === 'admin'`; `NavItem`'s `requiredRole` null-return is untouched. Routes keep their 403 — the UI is cosmetic (D-13)"

patterns-established:
  - "Admin-only tab ids live in one `Set`; nav gating and the content fallback cannot drift apart"
  - "RBAC regression suites pin route-level enforcement (403/scope) and the UI hiding separately, both auditable"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04]

coverage:
  - id: D1
    description: "An admin updates a user's role/status/name/avatar through `PUT /api/v1/cms/users/:id` and all four persist; the response carries avatar and no password"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-users-update.test.ts#updates and persists role, status, name, and avatar, returning all four"
        status: pass
    human_judgment: false
  - id: D2
    description: "`PUT /api/v1/cms/users/:id` does not accept or apply a password — a password-only PUT leaves password_hash unchanged"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-users-update.test.ts#ignores a password field — password_hash is unchanged and no password is returned"
        status: pass
    human_judgment: false
  - id: D3
    description: "A non-admin PUT returns 403; a PUT for a missing id returns 404"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "tests/api/cms-users-update.test.ts#rejects a non-admin token with 403 and leaves the target untouched"
        status: pass
      - kind: integration
        ref: "tests/api/cms-users-update.test.ts#returns 404 for a missing user id"
        status: pass
    human_judgment: false
  - id: D4
    description: "Affiliate-link POST/PUT/DELETE are admin-only: editor/author get 403 with the link document unchanged; admin succeeds; editor/author GET stays 200 (select-to-attach)"
    requirement: AUTH-03
    verification:
      - kind: integration
        ref: "tests/api/cms-rbac-affiliate-403.test.ts (11 tests: editor/author 403 on POST/PUT/DELETE unchanged document; admin 201/200/200; GET 200 for non-admin)"
        status: pass
    human_judgment: false
  - id: D5
    description: "`GET /api/v1/cms/articles` is scoped to author_id for non-admins: A sees only A, B only B, admin sees both; a zero-article author gets success + empty data (not 403)"
    requirement: AUTH-02
    verification:
      - kind: integration
        ref: "tests/api/articles-list-scoping.test.ts (4 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Editor/author accounts see no admin-only nav items and an admin-only tab reached via URL shows the permission panel instead of Under Construction or another user's data"
    requirement: AUTH-03
    verification:
      - kind: unit
        ref: "tests/api/cms-rbac-affiliate-403.test.ts#D-13 source contract — permission copy present, every admin-only NavItem after the role gate, NavItem null on requiredRole mismatch"
        status: pass
    human_judgment: true
    rationale: "The permission copy, the nav gate, and NavItem's null return are pinned by a source-contract test, but the rendered DOM and the actual editor-session tab visibility are browser-only — vitest runs `environment: 'node'` with no jsdom, so the visual half is manual UAT."

duration: 13min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 5: User Management + RBAC Regression Surface Summary

**Made `avatar` updatable and removed the password path from the users PUT route, added the edit-team-member modal, and pinned the full RBAC surface (article list scoping, affiliate-link 403, admin-tab hiding with a permission-denied fallback) with three new regression suites.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-21T13:15:00Z
- **Completed:** 2026-09-21T13:28:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- Fixed `PUT /api/v1/cms/users/:id`: it now destructures `avatar` and applies it, returns `avatar` in the success body, and no longer destructures or assigns `password` — a password-bearing request cannot change `password_hash` (D-14, T-02-21).
- Added the edit-team-member modal to `UsersView` in the canonical admin shell: wired the previously handler-less Edit button, seeded it with the row's values, and gave it `Name` / `Role` / `Status` / `Avatar` fields, the CLI-recovery password note, the inactive-lockout warning, and a `cmsFetch`-routed save showing `Team member updated.` (D-14, UI-SPEC copy rows).
- Added `tests/api/cms-users-update.test.ts` — four-field persistence, password-ignored (`password_hash` unchanged), non-admin 403, missing-id 404.
- Added `tests/api/cms-rbac-affiliate-403.test.ts` — affiliate-link POST/PUT/DELETE are 403 for editor and author with the link document unchanged, succeed for the admin, and GET remains 200 for non-admins (select-to-attach) (AUTH-03, T-02-18).
- Added `tests/api/articles-list-scoping.test.ts` — author A sees exactly A's article, B exactly B's, admin sees both, and a zero-article author gets `{ status:'success', data: [] }` rather than a 403 (AUTH-02, T-02-19).
- Wired the D-13 UI half: `renderContent` renders `You don't have access to this section.` with a `Back to Articles` link for a non-admin on any `ADMIN_ONLY_TABS` id; the generic `Under Construction...` copy survives only for genuinely unknown tabs; the admin nav block stays inside the `currentUser.role === 'admin'` gate (T-02-20).
- Added a D-13 source-contract test that reads `src/app/admin/page.tsx` and asserts the permission copy, the admin-gate ordering of every admin-only `NavItem`, and the `requiredRole` null return — so a future edit cannot silently drop the fallback.
- Full suite green (26 files / 257 tests) and `npx tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — admin edits a team member's role/status/name/avatar end-to-end** - `7baa09e` (feat)
2. **Task 2: RBAC regression tests — affiliate 403 + article list scoping (AUTH-02, AUTH-03)** - `b2f6689` (test)
3. **Task 3: Admin-tab hiding + permission-denied fallback (D-13)** - `93a40fa` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/app/api/v1/cms/users/[id]/route.ts` - MOD: PUT destructures/applies `avatar`, returns it; `password` removed from destructure and assignment; unused `hashPassword` import dropped
- `src/app/admin/page.tsx` - MOD: edit-user modal state + `openEditUserModal`/`handleEditUser`; wired Edit button with accessible label; `ADMIN_ONLY_TABS` set; `renderContent` permission-denied fallback
- `tests/api/cms-users-update.test.ts` - NEW: 4 tests for AUTH-04/D-14
- `tests/api/cms-rbac-affiliate-403.test.ts` - NEW: 11 route tests for AUTH-03 + 4 D-13 source-contract tests
- `tests/api/articles-list-scoping.test.ts` - NEW: 4 tests for AUTH-02

## Decisions Made
- **Password path removal is total.** The PUT destructure was `{ name, role, status, password }` and assigned `password_hash` via `hashPassword`; both the destructure entry and the assignment were removed and the now-unused `hashPassword` import dropped — a request carrying `password` is a genuine no-op (D-14, prohibition #1).
- **`avatar` applied and returned.** Mirrors the GET list mapping so the edit modal round-trips the value it loaded.
- **Save through `cmsFetch`.** The new modal's save uses the shared D-03 helper (with `handleCmsFailure`) rather than `alert()`, so a non-2xx surfaces the status-mapped toast. The pre-existing add-user flow keeps its legacy `alert()` (untouched control, out of scope).
- **Fallback gated by known-admin-tab membership.** Checking `activeTab` against `ADMIN_ONLY_TABS` (not merely "not handled") keeps `Under Construction...` reachable only for unknown tabs, exactly as the plan requires.
- **Route enforcement stays primary.** No production route in this plan changed affiliate/article enforcement; the UI hiding is pinned as defense-in-depth only (prohibition #2).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None. The three new suites passed on first run; no route code required fixing (the existing affiliate 403 and article-scoping filters were already correct, so Task 2's tests confirmed enforcement rather than repairing it, as the plan anticipated).

## Threat Surface Scan
- T-02-18 (editor/author managing affiliate links): mitigated — admin-only 403 on POST/PUT/DELETE pinned by regression tests.
- T-02-19 (cross-author article visibility): mitigated — `author_id` list filter pinned by list-scoping tests.
- T-02-20 (admin tab reachable by URL): mitigated — permission-denied fallback + untouched route 403.
- T-02-21 (password changed through the CMS): mitigated — PUT no longer accepts password; test asserts `password_hash` unchanged.
- T-02-SC (package legitimacy): not applicable — this plan installed zero packages.
- No new network endpoints, auth paths, or trust-boundary surface introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AUTH-04's "no password path" is now true by absence AND proven by a `password_hash`-unchanged assertion; role/status/name/avatar round-trip through the API and the new edit modal.
- AUTH-02/AUTH-03 are pinned by dedicated regression suites (list scoping + affiliate 403); the D-13 UI half is pinned by a source contract.
- Manual UAT pending (browser-only): log in as an admin and edit a team member's role/status/name/avatar to confirm the row updates without a reload; log in as an editor to confirm no admin tabs appear and that navigating to `?tab=users` shows the access-denied panel, not another user's data.
- Ready for the next plan in Phase 02.

## Self-Check: PASSED

- `tests/api/cms-users-update.test.ts`, `tests/api/cms-rbac-affiliate-403.test.ts`, `tests/api/articles-list-scoping.test.ts` all present
- `src/app/api/v1/cms/users/[id]/route.ts` no longer references `password` in the PUT destructure/assignment
- Commits `7baa09e` (Task 1), `b2f6689` (Task 2), `93a40fa` (Task 3) present in history
- Plan verification: `npx vitest run tests/api/cms-users-update.test.ts tests/api/cms-rbac-affiliate-403.test.ts tests/api/articles-list-scoping.test.ts` → 22 passed; full `npx vitest run` → 26 files / 257 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
