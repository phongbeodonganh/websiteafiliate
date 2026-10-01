---
phase: 02-cms-end-to-end-v5-2
plan: 03
subsystem: ui
tags: [cms, editor-consolidation, auth-fetch, error-handling, vitest, cms-01, cms-05, d-01-d-04]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: 02-01 async DB-backed auth guard; 02-02 FAQPage JSON-LD + placement order (adjacent, not consumed)
  - phase: 01-security-remediation
    provides: canonical `getAuthUser` guard + token blacklist; JWT-in-localStorage (D-15)
provides:
  - "Shared `cmsFetch<T>(path, { method, body, token, signal })` returning `{ ok:true, data } | { ok:false, status, message }`"
  - "`errorMessageForResponse(status, serverMessage)` mapping 401/403/404/400/500/0 to the UI-SPEC Copywriting strings"
  - "Canonical editor (`src/app/admin/page.tsx`) load/save/upload routed through the shared helper; shell-level error toast; inline no-empty-editor panel"
  - "Orphan `src/app/admin/articles/create` and `.../edit/[id]` routes deleted and proven unreachable"
  - "API round-trip tests proving GEO fields + three placements persist across create → read → update → read"
affects: [02-cms-end-to-end-v5-2, 05-hygiene, all future admin editor work]

actuals:
  tokens: 8508
  tasks: 3
  commits: 3
  plan_head_before: 1b81a75a2a86e8ea898b9b11dc2bc2af86219600

tech-stack:
  added: []
  patterns:
    - "Discriminated-union fetch result (`ok:true|false`) + status-mapped error copy; step-function never throws for HTTP errors"
    - "Falsy `ok` forces an explicit branch — a non-2xx cannot be mistaken for success (T-02-09 structural fix)"
    - "Load-failure guard: a failed editor load sets an error state and returns the inline panel before the form ever renders"
    - "Shell-level toast duplicated from the `insiderDispatchNotice` shape; error persists, success auto-dismisses"

key-files:
  created:
    - src/lib/cms-fetch.ts
    - tests/lib/cms-fetch.test.ts
    - tests/api/admin-route-absence.test.ts
    - tests/api/articles-edit-roundtrip.test.ts
  modified:
    - src/app/admin/page.tsx
  deleted:
    - src/app/admin/articles/create/page.tsx
    - src/app/admin/articles/edit/[id]/page.tsx

key-decisions:
  - "cmsFetch also treats an HTTP-200 body with `status:'error'` as a failure — the existing API envelope carries errors on mixed statuses, so `res.ok` alone would leak a silent success"
  - "cmsFetch passes FormData through untouched (no JSON.stringify, no Content-Type) so the thumbnail upload shares the same helper and bearer handling"
  - "The load path re-fetches the article through the helper rather than trusting `editingArticle` from `articlesList` — the 404/403/401 detector and the authoritative copy are the same call"
  - "The editor load effect is guarded by a `didLoadRef` so the authoritative fetch runs once per editor mount; `buildAdminUrl`/`navigate`/restore useEffect are untouched (HYG-02 boundary)"
  - "`next typegen` regenerated `.next/types/validator.ts` after the deletions — the stale generated route types were the only tsc failures"

patterns-established:
  - "One auth-fetch helper for the whole admin editor: bearer attachment + status mapping in one place"
  - "No-empty-editor invariant enforced at the render boundary (early `return` on loadError, before the form)"
  - "Unreachability as a test contract: fs-absence + src-wide substring grep for deleted route paths"

requirements-completed: [CMS-01, CMS-05]

coverage:
  - id: D1
    description: "A full create→read→update→read round trip through the CMS article API persists every GEO field (focusKeyword, keyTakeaways, entities, faqSchema) and a later mutation, with updatedAt advancing"
    requirement: CMS-01
    verification:
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#persists GEO fields on create and returns them on read"
        status: pass
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#persists a mutation to title and key takeaways, and advances updatedAt"
        status: pass
    human_judgment: false
  - id: D2
    description: "Three affiliate placements with position_label top_cta/middle_comparison/footer_banner round-trip through create and both reads (CMS-03 attach path)"
    requirement: CMS-01
    verification:
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#round-trips the three canonical affiliate placements through create and both reads (CMS-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The two orphaned admin editor routes are absent on disk and unreferenced anywhere under src/ (no dead-end admin routes)"
    requirement: CMS-05
    verification:
      - kind: unit
        ref: "tests/api/admin-route-absence.test.ts#the /admin/articles/create page file does not exist on disk"
        status: pass
      - kind: unit
        ref: "tests/api/admin-route-absence.test.ts#the /admin/articles/edit/[id] page file does not exist on disk"
        status: pass
      - kind: unit
        ref: "tests/api/admin-route-absence.test.ts#no .ts/.tsx file under src/ references either deleted admin route path"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every editor call routes through one shared helper that attaches Authorization: Bearer and returns a normalized result; a non-2xx yields a status-mapped error, never a silent success; the helper never throws for HTTP errors"
    requirement: CMS-01
    verification:
      - kind: unit
        ref: "tests/lib/cms-fetch.test.ts (15 tests: header attachment, body serialization, 401/403/404/400/500/0 matrix, thrown fetch, error-envelope-on-200)"
        status: pass
      - kind: other
        ref: "grep src/app/admin/page.tsx: article load/save/upload call sites use cmsFetch; 'Article saved successfully with GEO & SEO metadata!' retained"
        status: pass
    human_judgment: false
  - id: D5
    description: "A failed article load renders the documented inline error panel ('This article couldn't be loaded.') instead of a blank editor, and a cleared token shows the session-expired toast with a Sign in action"
    requirement: CMS-05
    verification: []
    human_judgment: true
    rationale: "The guard and copy are present and typecheck-clean, but the rendered DOM and the token-cleared toast behaviour are browser-only — vitest runs `environment: 'node'` with no jsdom (RESEARCH Sampling Rate), so this half is manual UAT."

duration: 49min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 3: Editor Consolidation + Shared Auth-Fetch Helper Summary

**Deleted the two orphaned admin editor pages, added a shared `cmsFetch` bearer-token helper with status-mapped error copy, and wired the canonical editor's load/save/upload through it behind an inline no-empty-editor guard.**

## Performance

- **Duration:** 49 min
- **Started:** 2026-09-21T04:46:46Z
- **Completed:** 2026-09-21T05:35:18Z
- **Tasks:** 3
- **Files modified:** 7 (4 created, 1 modified, 2 deleted)

## Accomplishments
- Deleted `src/app/admin/articles/create/page.tsx` (828 lines) and `src/app/admin/articles/edit/[id]/page.tsx` (711 lines) via `git rm`; the canonical `src/app/admin/page.tsx` tab is now the only create/edit/publish surface (D-01/D-02, CMS-05).
- Added `tests/api/admin-route-absence.test.ts` — an fs-absence gate plus a src-wide substring grep (`/admin/articles/create`, `/admin/articles/edit`) that makes the deleted paths unreachable by construction, not merely unlinked (T-02-10).
- Added `tests/api/articles-edit-roundtrip.test.ts` — proves `POST(201) → GET (GEO fields) → PUT(200, mutated title + takeaways) → GET (mutations persisted, `updatedAt` advanced)`, including all three canonical affiliate placements round-tripping with their exact `position_label` values (CMS-01/CMS-03, D-04).
- Added `src/lib/cms-fetch.ts` with `cmsFetch<T>` and `errorMessageForResponse`, plus 15 unit tests covering header attachment (present/absent/null token), JSON body serialization, the full 401/403/404/400/500/0 status matrix, a thrown fetch → `status:0`, and an error envelope on HTTP 200 (D-03).
- Wired the canonical editor's article load, save (POST/PUT), and thumbnail upload through `cmsFetch`; a failed load sets an inline error state and returns the `This article couldn't be loaded.` panel before the form renders; the shell-level `cmsToast` maps every non-2xx via `errorMessageForResponse` and, on 401, clears the token and shows a `Sign in` link (D-03/D-04, T-02-09/T-02-11).
- Full suite green (23 files / 235 tests) and `npx tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — reopen a published article, mutate it, save, reload sees the mutation** - `9027b0a` (feat)
2. **Task 2: Shared auth-fetch helper with status-mapped errors (D-03)** - `203cba7` (feat)
3. **Task 3: Wire the editor through the helper + no-empty-editor guard** - `bc02275` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/lib/cms-fetch.ts` - NEW: `cmsFetch<T>` (bearer attach, JSON/FormData body, envelope normalization, never throws for HTTP errors) + `errorMessageForResponse`
- `tests/lib/cms-fetch.test.ts` - NEW: 15 tests across header/body/status matrix/network paths
- `tests/api/admin-route-absence.test.ts` - NEW: fs-absence + src-wide reference gate for the deleted admin routes
- `tests/api/articles-edit-roundtrip.test.ts` - NEW: giant API round trip incl. GEO fields + three placements
- `src/app/admin/page.tsx` - MOD: import `cmsFetch`; shell toast state + `showCmsToast`/`handleCmsFailure`; authoritative load effect with load-error/loading panels; save + thumbnail upload through the helper
- `src/app/admin/articles/create/page.tsx` - DELETED (828 lines)
- `src/app/admin/articles/edit/[id]/page.tsx` - DELETED (711 lines)

## Decisions Made
- **Error envelope on HTTP 200 = failure.** `cmsFetch` treats `res.ok === false` OR envelope `status === 'error'` as failure; the repo's API envelope does not guarantee error semantics follow the status code, so `res.ok` alone would permit a silent success.
- **FormData passthrough.** The helper detects `FormData` and skips `JSON.stringify`/`Content-Type` so the multipart thumbnail upload shares the same bearer handling — one helper, no bypass (supports prohibition #2).
- **Authoritative re-load on editor mount.** The editor fetches the article via `cmsFetch` rather than trusting the `articlesList` snapshot, so the same call is both the 404/403/401 detector and the source of the hydrated form.
- **`didLoadRef` one-shot guard.** The authoritative fetch runs once per editor mount; `buildAdminUrl`/`navigate`/the restore `useEffect` are untouched (UI-SPEC Interaction Contract §2, HYG-02 boundary).
- **`next typegen` after deletions.** `.next/types/validator.ts` is a gitignored generated artifact that still referenced the deleted routes; regenerating it (documented Next 16 command) was required for a clean `tsc --noEmit`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Round-trip test sent a body on GET requests**
- **Found during:** Task 1 (round-trip test RED run)
- **Issue:** A shared `jsonRequest` helper passed a body to `Request` for GET calls; undici throws `TypeError: Request with GET/HEAD method cannot have body`, failing all three tests.
- **Fix:** Added a body-less `getRequest(token, url)` helper and used it for the read calls.
- **Files modified:** tests/api/articles-edit-roundtrip.test.ts
- **Verification:** `npx vitest run tests/api/articles-edit-roundtrip.test.ts` → passing.
- **Committed in:** `9027b0a` (Task 1 commit)

**2. [Rule 1 - Bug] FAQ subdocument assertion compared generated `_id`**
- **Found during:** Task 1 (round-trip test GREEN attempt)
- **Issue:** Mongoose gives each `faq_schema` subdocument an auto-generated `_id`; `toEqual({ question, answer })` failed on the extra key.
- **Fix:** Used `toMatchObject({ question, answer })` to pin the meaningful fields.
- **Files modified:** tests/api/articles-edit-roundtrip.test.ts
- **Verification:** round-trip suite green.
- **Committed in:** `9027b0a` (Task 1 commit)

**3. [Rule 3 - Blocking] Stale `.next/types/validator.ts` referenced the deleted routes**
- **Found during:** Task 3 (`npx tsc --noEmit`)
- **Issue:** The gitignored generated route-type validator still imported `../../src/app/admin/articles/create/page.js` and `.../edit/[id]/page.js`, failing typecheck after the deletions.
- **Fix:** Ran the documented `npx next typegen` to regenerate route types; `tsc --noEmit` then exited 0.
- **Files modified:** `.next/types/**` (generated, gitignored)
- **Verification:** `npx tsc --noEmit` → exit 0.
- **Committed in:** `bc02275` (Task 3 commit)

**4. [Rule 2 - Missing Critical] cmsFetch FormData handling + error-envelope-on-200 detection**
- **Found during:** Task 3 (thumbnail upload wiring)
- **Issue:** The planned helper signature assumed JSON bodies only; the editor's thumbnail upload is multipart, and the repo's error envelope can arrive on a 200.
- **Fix:** Added a `FormData` passthrough branch and an `isSuccessEnvelope` check so a `status:'error'` body is never a silent success.
- **Files modified:** src/lib/cms-fetch.ts
- **Verification:** `tests/lib/cms-fetch.test.ts#treats an error envelope on an HTTP 200 as a failure` passes.
- **Committed in:** `bc02275` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 blocking, 1 missing critical)
**Impact on plan:** All four were necessary for a green suite / clean typecheck and for the helper to cover the editor's real call shapes. No scope creep — no other call site in the admin monolith was touched (full modularization stays Phase 5 / HYG-02).

## Issues Encountered
- Pre-existing eslint errors in `src/app/admin/page.tsx` (48 errors: `no-explicit-any`, unescaped entities) are untouched baseline debt on an unmodularized monolith; the change introduced no new lint errors (verified against a stashed baseline). Not fixed — out of scope (Phase 5 HYG-02).

## Threat Surface Known
- T-02-09 (silent 401 → empty editor) mitigated: every non-2xx maps to a visible toast and a failed load renders the inline panel (Tasks 2-3).
- T-02-10 (second editor surface with weaker auth wiring) mitigated: orphan routes deleted + unreachability grep gate (Task 1).
- T-02-11 (overwriting an article it failed to load) mitigated: the load-error panel returns before the form renders, so save is unreachable while the article is unloaded (Task 3).
- T-02-SC (package legitimacy) not applicable: this plan installs zero packages.
- No new network endpoints, auth paths, or trust-boundary surface introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CMS-05's "no dead-end admin routes" is now true by absence AND proven unreachable in CI; CMS-01's round trip is proven at the API boundary with GEO fields intact.
- The canonical editor's calls all share one bearer-attaching helper; the silent-401 class is structurally unrecreatable.
- Manual UAT pending (browser-only): create an article in the tab, reopen it, mutate, save, reload → mutations persist; a cleared token shows the session-expired toast + `Sign in` instead of a blank editor.
- Ready for the next plan in Phase 02.

## Self-Check: PASSED

- `src/lib/cms-fetch.ts`, `tests/lib/cms-fetch.test.ts`, `tests/api/admin-route-absence.test.ts`, `tests/api/articles-edit-roundtrip.test.ts` all present
- `src/app/admin/articles/create/page.tsx` and `src/app/admin/articles/edit/[id]/page.tsx` confirmed absent
- Commits `9027b0a` (Task 1), `203cba7` (Task 2), `bc02275` (Task 3) present in history
- `npx vitest run` on the three new files → 21 passed; `npm test` → 23 files / 235 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
