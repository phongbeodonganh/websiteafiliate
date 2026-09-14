---
phase: 01-security-remediation
plan: 06
subsystem: security (secrets + admin CSS injection)
tags: [secrets, gemini-key, settings-api, css-color-validation, regression-gates, tdd, hex-color, sanitize]

requires:
  - phase: 01-04
    provides: every CMS route (incl. cms/settings + cms/ai/generate-article) guarded by single canonical getAuthUser + parameterized 401 gate (cms-auth-401.test.ts)
provides:
  - "gemini_api_key schema field (SettingSchema + ISetting) as D-07 secondary key source"
  - "masked settings GET (raw key never returned; last-4 hint only) + admin-only accepting/clearing PUT"
  - "secret-free src/ (Gemini fallback literal + duplicate + leaked Google Cloud project ID all purged)"
  - "D-07 Gemini key precedence chain: request userApiKey → env GEMINI_API_KEY → settings.gemini_api_key (typed read, no `as any`)"
  - "D-08 regression gates run on every npm test: jwt-locality + secret-fallback-literal + leaked-project-ID, each self-asserted against a planted offender (counter-vacuity)"
  - "isValidCssColor / sanitizeCssColor exports — strict hex color-format gate (3/4/6/8-digit, case-insensitive)"
  - "primary_color/accent_color hex-validated at BOTH boundaries — PUT 400 rejection + render-time sanitizeCssColor fallback"
affects: [SEC-02, SEC-03, security-regressions gate file, settings API consumers, future secrets-touching work]

actuals:
  tokens: 6142       # chars/4 over the realized diff (536 ins + 12 del across 9 files)
  tasks: 4
  commits: 5         # da640ad, 7fc05b4, 92f0b47, 0b4df97 (RED), 191a7fe (GREEN) — plus this docs commit
plan_head_before: da640ad~1

tech-stack:
  added: []                                  # zero packages installed (T-1-SC mitigation)
  patterns:
    - "Strict hex color-format regex gate applied identically at write boundary (PUT, reject 400) and render boundary (layout.tsx, fallback to site default) — defense in depth"
    - "Masked secret GET response: never return raw key, last-4 hint only; explicit clear via empty-string PUT"
    - "Self-asserted regression gate pattern: feed the matcher a synthetic inline-string offender and assert it flags — a too-loose tune fails its own self-test first"

key-files:
  created:
    - tests/api/settings-color-validation.test.ts
  modified:
    - src/lib/db/models.ts                       # gemini_api_key field (schema + interface)
    - src/app/api/v1/cms/settings/route.ts       # masked GET + accepting PUT + hex color PUT validation
    - src/lib/gemini.ts                          # fallback literal removed, fail-fast bilingual message
    - src/app/api/v1/cms/ai/generate-article/route.ts  # D-07 precedence chain (typed settings read)
    - src/app/layout.tsx                         # sanitizeCssColor on primary/accent before <style> interpolation
    - src/lib/sanitize.ts                        # isValidCssColor + sanitizeCssColor exports
    - tests/api/security-regressions.test.ts     # 3 new D-08 gates + counter-vacuity self-assertions
    - tests/lib/sanitize.test.ts                 # color-format cases for both new exports

key-decisions:
  - "Hex-only color validator by design (CONCERNS #11): the stored values are hex literals; strict format makes the <style> interpolation inert. rgb()/url()/named-color parsing surface intentionally NOT provided — no parser to defend"
  - "Render-time sanitizeCssColor is belt-and-braces for historical stored rows that existed before the PUT validator — the write boundary is the primary defense"
  - "D-07 precedence (request key → env → settings) satisfies RESEARCH Pitfall 2: the phantom `(dbSetting as any).geminiApiKey` read this replaces was always undefined, so it was never load-bearing"

patterns-established:
  - "Boundary-paired validator: one regex, applied at write edge (reject) and read edge (fallback) — same source of truth, no drift"
  - "Counter-vacuity self-assertion: every tuned file-walking matcher in security-regressions.test.ts is fed a synthetic offending snippet (built as inline string, never committed) and asserted to flag it — catches a too-loose future tune"

requirements-completed: [SEC-02, SEC-03]

coverage:
  - id: D1
    description: "SettingSchema + ISetting carry gemini_api_key; GET masks/omits the raw key; admin-only PUT persists (or empty-string clears) it"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "npx vitest run tests/api/cms-auth-401.test.ts  →  74 tests pass (guards from 01-04 intact, masking shadows the masked field)"
        status: pass
      - kind: unit
        ref: "manual: GET ·•••••••<last4> shape in src/app/api/v1/cms/settings/route.ts:30-38,180-183 — raw key never serialized"
        status: pass
      - kind: build
        ref: "npx tsc --noEmit  →  exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Secret-free src/: Gemini fallback literal purged from gemini.ts and the AI route; leaked Google Cloud project ID purged from error strings; D-07 precedence chain (request → env → settings) is live with typed reads"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "npx vitest run tests/api/security-regressions.test.ts  →  all D-08 gates green incl. jwt-locality, secret-fallback-literal, leaked-project-ID; counter-vacuity self-assertions pass"
        status: pass
      - kind: static-analysis
        ref: "grep jwt\\.(verify|sign) src/  →  no matches (all JWT logic confined to src/lib/auth.ts)"
        status: pass
      - kind: static-analysis
        ref: "grep AIza[A-Za-z0-9_-]{35}|354609 src/  →  no matches (no Gemini key literal, no leaked project ID)"
        status: pass
      - kind: build
        ref: "npm run build  →  succeeds with no secrets in env (D-06 lazy-failure honored)"
        status: pass
      - kind: manual
        ref: "git diff HEAD~5 HEAD -- src/lib/db/mongodb.ts  →  0 lines (prohibition honored; env-file fallback untouched)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-08 regression gates run on every npm test: JWT verify/sign locality, secret-fallback-literal on every secret env read, leaked-project-ID absence — each self-asserted against a synthetic planted offender (counter-vacuity)"
    requirement: SEC-02
    verification:
      - kind: unit
        ref: "tests/api/security-regressions.test.ts > describe('D-08 gate counter-vacuity - a too-loose matcher fails its own self-assertion')"
        status: pass
      - kind: regression
        ref: "Full npm test run  →  173/173 tests green (15 files); the security-regressions file is part of the suite"
        status: pass
    human_judgment: false
  - id: D4
    description: "isValidCssColor (strict hex regex: # + 3/4/6/8 hex digits, case-insensitive; non-strings, named colors, url(), trailing context all false) + sanitizeCssColor (returns valid value or fallback) exports"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "tests/lib/sanitize.test.ts > describe('isValidCssColor — strict hex color-format gate (SEC-03 / CONCERNS #11)') — 18 cases including all <behavior> contract rows"
        status: pass
      - kind: unit
        ref: "tests/lib/sanitize.test.ts > describe('sanitizeCssColor — render-time fallback (SEC-03 / CONCERNS #11)') — 4 cases"
        status: pass
    human_judgment: false
  - id: D5
    description: "primary_color/accent_color are hex-validated at the write boundary (PUT /api/v1/cms/settings rejects malformed values with 400 naming the field, BEFORE any mutation/save so DB document is unchanged) and sanitized at the render boundary (layout.tsx sanitizeCssColor fallback)"
    requirement: SEC-03
    verification:
      - kind: integration
        ref: "tests/api/settings-color-validation.test.ts — 5 cases: invalid primary→400+unchanged, invalid accent→400+unchanged, valid primary persists, valid accent persists, absent-from-body leaves colors untouched"
        status: pass
      - kind: unit
        ref: "manual: src/app/api/v1/cms/settings/route.ts:141-167 — gate runs BEFORE any currentSettings mutation; src/app/layout.tsx:123-124 — reads pass through sanitizeCssColor"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 06: Secrets Purge + D-08 Regression Gates + Admin Color Validation Summary

**Made `src/` secret-free (Gemini fallback literal + duplicate + leaked project ID purge, D-07 precedence chain, masked settings GET/PUT) and constrained the admin CSS injection points to a strict hex color-format regex at both the write and render boundaries (SEC-02 + SEC-03 / CONCERNS #11).**

## Performance

- **Duration:** ~4 min (continuation executor — prior executor's truncation absorbed most wall-clock; this run was GREEN + verification + SUMMARY)
- **Started:** 2026-09-14 (first 01-06 commit `da640ad`)
- **Completed:** 2026-09-14 (this SUMMARY commit)
- **Tasks:** 4
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments

- **Task 1 — gemini_api_key schema field + masked GET / accepting PUT**: added the optional `gemini_api_key` field to both `ISetting` and `SettingSchema` (plan-04 conventions preserved); GET returns `geminiApiKeyMasked` (`••••••••<last4>`) when a key is set and omits the field entirely when empty — raw key never serialized; admin-only PUT accepts an optional key, persists it, and empty-string clears. The plan-04 `getAuthUser` + role check guards are untouched.
- **Task 2 — secrets purge + D-07 precedence chain**: removed the default-value Gemini key literal from `src/lib/gemini.ts` (activates the existing fail-fast with a sharpened bilingual message naming both remaining sources); removed the duplicated literal in `cms/ai/generate-article/route.ts` and rebuilt the key resolution as `request userApiKey → env GEMINI_API_KEY → settings.gemini_api_key` via typed schema read (no `as any`); scrubbed the leaked Google Cloud project number from the gemini error string. `src/lib/db/mongodb.ts` left untouched per prohibition.
- **Task 3 — D-08 regression gates + self-assertions**: extended `tests/api/security-regressions.test.ts` (plan-02 file) with three file-walking gates — JWT verify/sign locality (only in `src/lib/auth.ts`), secret-fallback-literal on all 5 secret env reads, leaked-project-ID absence across `src/`. Each matcher is self-asserted against a synthetic planted offender built as an inline string (counter-vacuity), so a future too-loose tune fails its own self-test first. Full suite + production build pass with zero real secrets in env.
- **Task 4 — color-format validation on admin CSS injection points**: NEW `isValidCssColor`/`sanitizeCssColor` exports (strict hex regex: # + 3/4/6/8 hex digits); write boundary rejects malformed `primaryColor`/`accentColor` with a 400 envelope naming the field BEFORE any DB mutation; render boundary passes the stored reads through `sanitizeCssColor` (fallback to the `#111111`/`#000000` site defaults) so a dirty historical value cannot reach the sitewide `<style>` interpolation.

## Task Commits (TDD cycles)

1. **Task 1: gemini_api_key schema field + masked settings GET / accepting PUT** — `da640ad` (feat 01-06)
2. **Task 2: secrets purge + leaked project ID + D-07 precedence chain** — `7fc05b4` (fix 01-06)
3. **Task 3: D-08 regression gates (jwt-locality / secret-fallback / leaked-id) + counter-vacuity self-assertions** — `92f0b47` (test 01-06)
4. **Task 4: color-format validation on admin CSS injection points** — RED `0b4df97` (test 01-06 — failing 400-rejection cases), GREEN `191a7fe` (feat 01-06 — `isValidCssColor`/`sanitizeCssColor` + PUT gate + render sanitize + tsc fix)

**Plan metadata:** this commit (docs: complete secrets purge + D-08 gates + color validation plan)

## Files Created/Modified

- `src/lib/db/models.ts` — `gemini_api_key: { type: String }` on SettingSchema + optional `gemini_api_key?: string` on ISetting (D-07 enabler)
- `src/app/api/v1/cms/settings/route.ts` — masked `geminiApiKeyMasked` GET response; PUT accepts/clears the key; PUT rejects invalid `primaryColor`/`accentColor` with 400 before any DB mutation
- `src/lib/gemini.ts` — default-value literal removed; bilingual fail-fast message naming env + settings sources; leaked Google Cloud project ID replaced with generic guidance
- `src/app/api/v1/cms/ai/generate-article/route.ts` — D-07 precedence chain (request → env → settings) with typed schema read; phantom `(dbSetting as any).geminiApiKey` read removed
- `src/lib/sanitize.ts` — `isValidCssColor` + `sanitizeCssColor` exports beside `sanitizeArticleContent` (same module conventions)
- `src/app/layout.tsx` — `sanitizeCssColor` on `primary_color`/`accent_color` reads before the `<style>` CSS-custom-property interpolation (`#111111`/`#000000` fallbacks preserve the happy path)
- `tests/api/security-regressions.test.ts` — 3 new D-08 gates + counter-vacuity self-assertion describe block (synthetic offenders as inline strings, never written to disk)
- `tests/lib/sanitize.test.ts` — 2 new describe blocks (18 + 4 cases) covering the entire `<behavior>` contract for both new exports
- `tests/api/settings-color-validation.test.ts` — NEW: 5-case authed PUT integration test (invalid → 400 + DB unchanged; valid → persists; absent → untouched)

## Decisions Made

- **Hex-only color validator by design (CONCERNS #11):** the stored values are hex literals; a strict format gate is what renders the `<style>` interpolation inert. `rgb()`/`url()`/named-color parsing surface intentionally NOT provided — there is no parser to defend.
- **Render-time `sanitizeCssColor` is belt-and-braces for historical rows:** the write boundary (PUT 400) is the primary defense; the render fallback catches any stored value written before this phase gained the validator.
- **D-07 precedence fixes RESEARCH.md Pitfall 2:** the prior `(dbSetting as any).geminiApiKey` read was always `undefined` (phantom field) — never load-bearing. Replacing it with the typed `settings.gemini_api_key` read is purely additive.

## Deviations from Plan

**[Rule 1 - Bug] Dropped redundant 2nd-argument `{} as any` from Task-4 RED test**

- **Found during:** Task 4 GREEN verification (running `<verify>` block `npx tsc --noEmit`)
- **Issue:** the RED test was authored calling `settingsPutHandler(req, {} as any)` with a second argument. The route handler's signature is `PUT(req: Request)` — a single argument. The extra arg was silently ignored at runtime (tests passed) but `tsc --noEmit` flagged it as TS2554 "Expected 1 arguments, but got 2" in all 5 call sites. This would have failed Task 4's `<verify>` block (`npx tsc --noEmit` must exit 0).
- **Fix:** removed the spurious second argument from all 5 `settingsPutHandler(...)` call sites in `tests/api/settings-color-validation.test.ts`. The runtime behavior is unchanged (Next.js handlers ignore extra args); the fix only satisfies the type system.
- **Files modified:** `tests/api/settings-color-validation.test.ts` (already in Task-4 scope per plan `<files>`)
- **Commit:** `191a7fe` (folded into Task-4 GREEN commit, not a separate deviation commit — fix is intrinsic to making Task-4's `<verify>` pass)

## Issues Encountered

- **Executor truncation mid-Task-4 GREEN:** the prior executor committed Tasks 1-3 and the Task-4 RED cleanly, then was cut off while the GREEN sat uncommitted in working tree. This continuation executor verified the four committed tasks' acceptance criteria (all PASS), finished the GREEN (validator already authored — main missing piece was wiring the PUT boundary gate), fixed the Rule-1 tsc issue, then completed the SUMMARY + close-out. No work was lost; the RED `0b4df97` survived the truncation intact.

## User Setup Required

None. The plan's `user_setup: []` is honored — no manual steps (env vars, API keys, external UI) are required for this plan to ship. Per RESEARCH A5, the admin settings **UI input** for `gemini_api_key` may not exist yet; the API accepts/stores the field (env stays primary), and UI wiring is explicitly out of scope for this phase. The env stays primary; the settings field is the D-07 fallback only.

## Next Phase Readiness

Ready for 01-07 (Phase 1 closeout). SEC-02 + SEC-03 close in this SUMMARY; the full Phase-1 security arc (SEC-01 done 01-02, AUTH-01 done 01-04, AFF-01 done 01-03, SEC-04 done 01-05, SEC-02/SEC-03 done 01-06) is now complete, gated by the now-permanent regression suite (`security-regressions.test.ts` runs on every `npm test` and catches: seed-route re-entry, destructive-op scans, JWT-locality drift, secret-fallback re-introduction, leaked-project-ID presence — all self-asserted against counter-vacuity).

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*
