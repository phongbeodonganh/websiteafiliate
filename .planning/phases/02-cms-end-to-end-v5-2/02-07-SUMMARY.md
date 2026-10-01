---
phase: 02-cms-end-to-end-v5-2
plan: 07
subsystem: api
tags: [rbac, blacklist, security, bearer-token, fail-closed]

requires:
  - phase: 02-cms-end-to-end-v5-2 (plans 01-06)
    provides: async DB-backed getAuthUser, cmsFetch shared bearer helper, admin shell with handleCheckAffUrl
provides:
  - Admin-only guard on POST /api/v1/cms/blacklist (combined sibling guard matching DELETE)
  - handleCheckAffUrl routed through cmsFetch with bearer token + fail-closed branch
  - RBAC regression test proving non-admin rejection + no sweep side-effect
  - Source-contract test pinning cmsFetch usage and fail-closed behavior
affects: [03-theme-integration, 04-go-live]

actuals:
  tokens: 34000
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Combined admin guard (!user || role !== 'admin' → 401) matches every sibling blacklist write"
    - "Fail-closed on cmsFetch !result.ok — a failed blacklist check never clears the warning"

key-files:
  created:
    - tests/api/blacklist-post-rbac.test.ts
    - tests/api/admin-blacklist-check-token.test.ts
  modified:
    - src/app/api/v1/cms/blacklist/route.ts
    - src/app/admin/page.tsx

key-decisions:
  - "Chose the same-file DELETE combined guard form (401 on both no-token and non-admin) over a split 401/403 form — consistency with every sibling blacklist write and zero test churn in cms-auth-401.test.ts"
  - "Fail-closed on !result.ok sets a visible warning with fixed copy ('Blacklist check unavailable. Retry before saving.') — server detail is never surfaced (T-02-04 accept)"
  - "Source contract test (readFileSync) for CR-01 because the node-env vitest suite has no jsdom"

patterns-established:
  - "Combined admin guard on destructive blacklist writes: !user || role !== 'admin' → 401 before req.json()"
  - "Client blacklist check fail-closed: !result.ok → visible warning, return; never clear"

requirements-completed: [AUTH-03, AFF-04]

coverage:
  - id: D1
    description: "POST /api/v1/cms/blacklist rejects non-admin principals (editor/author) with 401 and never runs the retroactive sweep"
    requirement: AUTH-03
    verification:
      - kind: integration
        ref: "tests/api/blacklist-post-rbac.test.ts#editor POST is rejected 401 and the seeded campaign stays active"
        status: pass
      - kind: integration
        ref: "tests/api/blacklist-post-rbac.test.ts#author POST is rejected 401 and the seeded campaign stays active"
        status: pass
    human_judgment: false
  - id: D2
    description: "Admin POST /api/v1/cms/blacklist succeeds (200), creates blacklist entry, and sweeps matching campaigns to 'blacklisted'"
    requirement: AFF-04
    verification:
      - kind: integration
        ref: "tests/api/blacklist-post-rbac.test.ts#admin POST creates a blacklist entry and flips the matching campaign to blacklisted"
        status: pass
    human_judgment: false
  - id: D3
    description: "handleCheckAffUrl routes through cmsFetch with bearer token and fails closed on any non-ok result"
    requirement: AUTH-03
    verification:
      - kind: unit
        ref: "tests/api/admin-blacklist-check-token.test.ts#calls cmsFetch targeting the blacklist check endpoint"
        status: pass
      - kind: unit
        ref: "tests/api/admin-blacklist-check-token.test.ts#does not perform a bare fetch() against the check endpoint"
        status: pass
      - kind: unit
        ref: "tests/api/admin-blacklist-check-token.test.ts#fails closed on !result.ok"
        status: pass
      - kind: unit
        ref: "tests/api/admin-blacklist-check-token.test.ts#passes the token from localStorage to cmsFetch"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit exits 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pre-existing no-token 401 gate on POST /cms/blacklist remains intact"
    requirement: AUTH-03
    verification:
      - kind: integration
        ref: "tests/api/cms-auth-401.test.ts#POST src/app/api/v1/cms/blacklist/route.ts → 401 without a token"
        status: pass
    human_judgment: false

duration: 33min
completed: 2026-09-22
status: complete
---

# Phase 02 Plan 07: Blacklist RBAC + Pre-check Token Fix Summary

**Combined admin guard on POST /cms/blacklist (CR-03) and fail-closed bearer-token pre-check via cmsFetch on the affiliate-link interceptor (CR-01)**

## Performance

- **Duration:** 33 min
- **Started:** 2026-09-22T04:14:27Z
- **Completed:** 2026-09-22T04:47:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Closed CR-03: POST /api/v1/cms/blacklist now carries the same combined admin guard as its sibling DELETE — editor/author tokens get 401 and the retroactive sweep never runs, preventing a non-admin from mass-deactivating campaigns
- Closed CR-01: the affiliate-link blacklist pre-check now routes through cmsFetch with the bearer token attached and fails closed on any non-ok result — a blacklisted base_url can no longer be saved silently
- 69 tests green across the three relevant test files (new + pre-existing) and tsc --noEmit exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Close CR-03 — admin-only guard on POST** - `911b7f5` (feat)
2. **Task 2: Close CR-01 — route pre-check through cmsFetch + fail closed** - `608adeb` (fix)

## Files Created/Modified
- `src/app/api/v1/cms/blacklist/route.ts` - POST handler gains combined admin guard (CR-03)
- `src/app/admin/page.tsx` - handleCheckAffUrl re-wired through cmsFetch with fail-closed (CR-01)
- `tests/api/blacklist-post-rbac.test.ts` - Role-based POST regression + no-sweep side-effect proof (new)
- `tests/api/admin-blacklist-check-token.test.ts` - Source contract pinning cmsFetch + fail-closed branch (new)

## Decisions Made
- Chose the same-file DELETE combined guard form (`!user || role !== 'admin' → 401`) over a split 401/403 form. This matches every sibling blacklist write (DELETE, quick-blacklist, import, import-sheet-url, re-sweep) and keeps the no-token path at 401, satisfying `cms-auth-401.test.ts:176` with zero churn.
- The fail-closed banner shows fixed copy ("Blacklist check unavailable. Retry before saving.") and discards server detail (T-02-04: accept disposition — the check response only drives a boolean warning, so internal detail is never surfaced).
- Source-contract test for CR-01 because the vitest suite runs `environment: 'node'` with no jsdom (VERIFICATION.md human-verification #2).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- TypeScript type mismatch: the blacklist POST handler signature uses `NextRequest` but the analog test pattern builds plain `Request` objects. Fixed by casting the return of `jsonRequest()` to `Parameters<typeof blacklistPOST>[0]` — the auth guard only reads `.headers`, so a plain Request is functionally sufficient. Same technique as the `any[]` relaxation in `cms-auth-401.test.ts`.

## Known Stubs

None — both deliverables are fully wired with no placeholder data.

## Next Phase Readiness
- CR-03 (blacklist RBAC) and CR-01 (pre-check token) are closed
- The phase's two remaining gaps (CR-02 edit-user modal co-location, CR-04 sub-category ObjectId coercion, WR-02 placement verdict order) are addressed by plans 02-08..02-10 if present; this plan is scoped to CR-01 and CR-03 only
- No blockers introduced by this plan

## Self-Check: PASSED

- FOUND: src/app/api/v1/cms/blacklist/route.ts (modified)
- FOUND: src/app/admin/page.tsx (modified)
- FOUND: tests/api/blacklist-post-rbac.test.ts (created)
- FOUND: tests/api/admin-blacklist-check-token.test.ts (created)
- FOUND: 911b7f5 (Task 1 commit)
- FOUND: 608adeb (Task 2 commit)

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-22*
