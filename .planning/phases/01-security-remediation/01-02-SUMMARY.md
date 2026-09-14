---
phase: 01-security-remediation
plan: 02
subsystem: security
tags: [security, seed-deletion, regression-gate, cli, mongoose, bcrypt, vitest, deploy-docs]

# Dependency graph
requires:
  - phase: foundation (pre-existing brownfield) + plan 01-01
    provides: destructive /api/v1/seed route + seed-mongodb.ts + seed.ts (deleted here), scripts/create-admin.ts structural analog, src/lib/auth.ts hashPassword, Vitest 4 + mongodb-memory-server suite, deploy.yml `npm test` step that runs the gate in CI
provides:
  - SEC-01 closure: the unauthenticated destructive seed surface is fully deleted (route, lib implementation, dead wrapper, npm entry point) and locked shut by a permanent regression gate test
  - tests/api/security-regressions.test.ts — the phase's permanent gate file (seed-dir-absence, unfiltered destructive-delete scan over src/app/api, counter-vacuity self-assertion, npm-script-absence); plan 06 extends it with the SEC-02 secret gates
  - scripts/reset-admin.ts — CLI-only admin password recovery (upsert, never echoes the password)
  - DEPLOY.md §13 "Reset admin password (CLI)" — VPS recovery procedure with the explicit no-web-path note
affects: [01-06 (extends this gate file with secret gates), 01-04 (same test suite for canonical-auth 401 tests), verifier UAT for SEC-01/D-04, ops runbook (DEPLOY.md)]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 6767        # chars/4 over the realized code diff (27,068 chars across 2 task commits); plan estimated 42,000
  tasks: 2
  commits: 2          # MEASURED: git rev-list --count 74110929..HEAD
  plan_head_before: 74110929e3b89ceb97f1b0f0f21fe0d8371e5665

# Tech tracking
tech-stack:
  added: []           # zero new packages (per RESEARCH.md zero-new-packages phase)
  patterns:
    - fs-walk gate test: a vitest file that walks src/app/api and asserts absence/static invariants — the phase's permanent tripwire pattern (runs on every `npm test`, which deploy.yml already executes before build)
    - counter-vacuity self-assertion: the destructive-op matcher is fed a synthetic inline-string wipe to prove it can flag what it claims to guard against (a too-loose tune fails the gate itself)
    - CLI-recovery-only ops pattern: dangerous account operations live in scripts/*.ts run on-box by an operator, never behind an HTTP route (create-admin.ts analog)

key-files:
  created:
    - tests/api/security-regressions.test.ts
    - scripts/reset-admin.ts
  modified:
    - package.json
    - DEPLOY.md
  deleted:
    - src/app/api/v1/seed/route.ts
    - src/lib/db/seed-mongodb.ts
    - src/lib/db/seed.ts

key-decisions:
  - "All three file deletions + the package.json script removal landed in ONE commit (7fdc87c) — there was never an intermediate state where npm run seed pointed at a deleted file (plan flagged-assumption honored)"
  - "DEPLOY.md recovery docs placed as new §13 before the go-live checklist — no dedicated admin-docs section existed to sit 'next to' (plan's read_first assumption); command semantics, upsert behavior, and the no-web-path-by-design note (SEC-01/D-04) are all stated"
  - "reset-admin $set shape kept exactly as planned ({ password_hash, role: 'admin', status: 'active' }) — User schema has no required fields beyond username/password_hash, so upsert-insert is valid without name/avatar"
  - "Destructive-op scan scoped to user/settings models per D-03, with documented carve-outs (filtered deletes pass; variable-filter and non-API helper blind spots documented in the test)"

patterns-established:
  - "Gate matcher sanity describe-block: every fs/grep gate ships with negative + positive synthetic assertions so tuning drift is caught, not just real violations"
  - "Regression gate as Vitest test (not a CI grep step) — runs locally AND in deploy.yml's existing `npm test` step, with actionable assertion output"

requirements-completed: [SEC-01]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "The unauthenticated destructive seed surface is gone: /api/v1/seed route, seed-mongodb.ts implementation, dead seed.ts wrapper deleted; npm run seed removed in the same commit"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "tests/api/security-regressions.test.ts#the former /api/v1/seed route directory stays deleted (D-01)"
        status: pass
      - kind: other
        ref: "tests/api/security-regressions.test.ts#npm run seed no longer exists as a script (D-02 — Pitfall 1: no broken entry point)"
        status: pass
      - kind: other
        ref: "npm run seed → npm error Missing script: \"seed\" (expected); npx tsc --noEmit exit 0 proves no stale importer"
        status: pass
    human_judgment: false
  - id: D2
    description: "Permanent regression gate (D-03): no API route can perform an unfiltered destructive delete on the user/settings models; the gate runs on every npm test and therefore in deploy.yml before every deploy (T-1-05 mitigation)"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "tests/api/security-regressions.test.ts#no API route performs an unfiltered destructive delete on the user/settings models (D-03)"
        status: pass
      - kind: other
        ref: "tests/api/security-regressions.test.ts counter-vacuity block — synthetic UserModel.deleteMany({}) IS flagged (2 hits); filtered deletes and unrelated models are NOT flagged"
        status: pass
    human_judgment: false
  - id: D3
    description: "CLI-only admin recovery contract: scripts/reset-admin.ts requires <username> <password>, exits 1 with a usage line before any DB connection when args are missing, and never echoes/logs/persists the plaintext password (success log prints username + id only)"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "npx tsx scripts/reset-admin.ts (no args) → prints 'Usage: tsx scripts/reset-admin.ts <username> <password>', exit code 1, no DB connection output"
        status: pass
      - kind: other
        ref: "Select-String audit of scripts/reset-admin.ts: raw password flows only into hashPassword(); console.log contains only user.username + user._id (T-1-06 / D-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "DEPLOY.md §13 'Reset admin password (CLI)': VPS command, upsert (creates-or-resets) semantics, only-prints-user-id note, and the explicit statement that no web path for password recovery exists by design (SEC-01/D-04)"
    requirement: SEC-01
    verification:
      - kind: other
        ref: "Select-String -Path DEPLOY.md -Pattern 'reset-admin' -Quiet → True"
        status: pass
    human_judgment: false
  - id: D5
    description: "reset-admin with-args upsert against the real production Atlas DB (creates-or-resets an admin with a bcrypt hash)"
    requirement: SEC-01
    verification: []
    human_judgment: true
    rationale: "The plan's done criteria explicitly defer the with-args smoke to the VPS (VALIDATION.md manual list) — running it locally would mutate the dev/prod database; verifier should run `npx tsx scripts/reset-admin.ts <user> <pass>` on the VPS and confirm the CMS accepts the new password"

# Metrics
duration: 5min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 02: Seed Surface Deletion + CLI Admin Recovery Summary

**Deleted the unauthenticated `/api/v1/seed` destructive route with its lib implementation, dead wrapper, and npm entry point — locked shut by a permanent regression gate test (seed-dir absence + unfiltered destructive-delete scan + counter-vacuity proof) — and moved admin password recovery to a CLI-only path (`scripts/reset-admin.ts`) documented in DEPLOY.md.**

## Performance

- **Duration:** 5min
- **Started:** 2026-09-14T18:12:20Z
- **Completed:** 2026-09-14T18:16:53Z
- **Tasks:** 2/2
- **Files modified:** 7 (2 created, 2 modified, 3 deleted)

## Accomplishments

- The single most dangerous hole in the audit — one public GET could wipe every collection and reset admin credentials — is closed structurally: nothing web-reachable can bulk-delete users/settings anymore, and `npm test` (which deploy.yml runs before every deploy) now fails if the seed path, the npm entry point, or an unfiltered user/settings wipe ever reappears
- The gate's destructive-op matcher is provably non-vacuous: a synthetic unfiltered `UserModel.deleteMany({})` is flagged (2 hits) while the codebase's real filtered delete (`SubCategoryModel.deleteMany({ category_id: id })`) passes
- Admin recovery is CLI-only per D-04: `npx tsx scripts/reset-admin.ts <username> <password>` upserts (creates-or-resets) the admin on the VPS, prints only the username + user id, and DEPLOY.md §13 states explicitly that no web recovery path exists by design

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — delete the seed surface + prove absence with the regression gate** - `7fdc87c` (fix)
2. **Task 2: CLI admin recovery — scripts/reset-admin.ts + DEPLOY.md (D-04)** - `2f1c79f` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `tests/api/security-regressions.test.ts` (NEW) — 4 fs/static gates: seed-dir-absence (statSync throws), npm-script-absence (`scripts.seed` undefined), unfiltered destructive-delete scan over every `.ts` under `src/app/api/` (empty-or-absent `deleteMany` filter on/near a `UserModel`/`SettingModel` reference, ±200-char proximity window), plus a counter-vacuity sanity describe-block (synthetic wipe flagged ≥2, filtered deletes and unrelated models not flagged); all carve-outs and blind spots documented in the matcher comment
- `scripts/reset-admin.ts` (NEW) — 1:1 structural copy of `scripts/create-admin.ts`: relative `../src/lib/...` imports, argv handling, usage-error + exit 1 BEFORE `connectToDatabase()`, `hashPassword` + `UserModel.findOneAndUpdate({ username }, { $set: { password_hash, role: 'admin', status: 'active' } }, { upsert: true, new: true })`, top-level `.catch`, success log prints ONLY username + id
- `package.json` (MOD) — `"seed": "tsx src/lib/db/seed-mongodb.ts"` removed (Pitfall 1 — no broken npm script); no replacement added, `scripts/seed-*.ts` remain the only content-seeding path
- `DEPLOY.md` (MOD) — new §13 "Reset admin password (CLI)": VPS command, upsert semantics, only-user-id output note, no-web-path-by-design statement
- `src/app/api/v1/seed/route.ts`, `src/lib/db/seed-mongodb.ts`, `src/lib/db/seed.ts` (DELETED) — the entire seed surface (D-01/D-02); zero importers existed (verified by grep pre-deletion and by `tsc --noEmit` + full suite post-deletion)

## Decisions Made

- **One-commit deletions:** the three file deletions, the package.json script removal, and the gate test shipped as a single commit (`7fdc87c`) — the plan's flagged-assumption that no intermediate broken-script state ever exists
- **§13 placement:** no dedicated admin-docs section existed in DEPLOY.md, so the recovery docs went in as new §13 immediately before the go-live checklist (operator-visible, next to deploy/ops procedures)
- **$set shape per plan:** `{ password_hash, role: 'admin', status: 'active' }` without `name`/`avatar` — verified against `UserSchema` (only `username`/`password_hash` are required) that upsert-insert stays valid
- **Scan scope = user/settings models per D-03**, with the codebase's one real filtered delete as the tuned anti-false-positive case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Mongoose deprecation warning (`new: true` option on `findOneAndUpdate`) still surfaces in test output — it also applies to `reset-admin.ts`/`create-admin.ts` because the plan explicitly mandates the `{ upsert: true, new: true }` shape (same as the analog script). Out of scope for this plan; same item already logged in 01-01 for a future hygiene pass (`returnDocument: 'after'`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 01-03 (rate limiting on the three public write endpoints) — the seed surface and its npm entry point no longer exist, and the regression gate file is in place for plan 06 to extend with the SEC-02 secret-fallback gates
- Full suite green at close: 11 test files, 58 tests (`npm test`); `tsc --noEmit` clean
- For verify-work: the only human-judgment item is the with-args `reset-admin` upsert smoke on the VPS (coverage D5) per the plan's done criteria and VALIDATION.md manual list

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*

## Self-Check: PASSED
- Files exist: `tests/api/security-regressions.test.ts`, `scripts/reset-admin.ts`, `DEPLOY.md` (modified), `package.json` (modified)
- Deletions verified on disk: `src/app/api/v1/seed/route.ts`, `src/lib/db/seed-mongodb.ts`, `src/lib/db/seed.ts` all absent
- Commits verified: `7fdc87c` (Task 1), `2f1c79f` (Task 2)
- Full suite at close: 11 files / 58 tests passing; `tsc --noEmit` clean; `npm run seed` → "Missing script" (expected)
