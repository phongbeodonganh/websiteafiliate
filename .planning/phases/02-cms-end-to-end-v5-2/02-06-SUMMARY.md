---
phase: 02-cms-end-to-end-v5-2
plan: 06
subsystem: database
tags: [taxonomy, seed, cms-04, d-09, d-10, d-11, d-12, editor, faq, next16, mongoose]

requires:
  - phase: 02-cms-end-to-end-v5-2
    provides: 02-03 shared `cmsFetch` + canonical admin editor; 02-04 admin blacklist UI baseline; 02-05 admin RBAC/tab + user-management baseline
  - phase: 01-security-remediation
    provides: canonical `getAuthUser` guard; parameterized CMS 401 route inventory

provides:
  - "`SEED_TAXONOMY` + `seedTaxonomy()` in `src/lib/seed-taxonomy.ts` — idempotent upsert-by-slug of the exact V5.2 §1.2 two-level tree (6 categories, 5 `ai-use-cases` children); no `deleteMany`, no overwrite"
  - "`scripts/seed-taxonomy.ts` — thin `npx tsx` CLI wrapper that logs created counts only (never env values)"
  - "Editor category integrity: required Level-1 with inline `Choose a primary category.`, filtered/reset optional Level-2, childless parent hides the sub-select, GEO fields stay optional (D-09, D-12)"
  - "FAQ row editor aligned to the UI-SPEC: `+ Add question`, `Question…`/`Answer…` placeholders, accessible icon-only remove, zero-row empty state, incomplete-rows-ignored helper copy (D-10)"

affects: [02-cms-end-to-end-v5-2, future taxonomy/editor work]

actuals:
  tokens: 9471
  tasks: 3
  commits: 3
  plan_head_before: 18b3bf3b4d7b05a1f0f9a5166b3238b012e1a1c2

tech-stack:
  added: []
  patterns:
    - "Seed tree is data (`SEED_TAXONOMY`), not logic — a callable `seedTaxonomy()` with no top-level side effects so a vitest import does not connect eagerly; the CLI is a thin wrapper"
    - "Idempotency by find-by-slug-then-create-only-when-absent — coexistence with ad-hoc categories is structural, not a policy check"
    - "Editor validation is save-time and inline; the required set is exactly title/slug/content/category/status and never includes a GEO field"
    - "FAQ row state updates are clone-then-set (new array + new row object) so React never sees an aliased mutation"

key-files:
  created:
    - src/lib/seed-taxonomy.ts
    - scripts/seed-taxonomy.ts
    - tests/lib/seed-taxonomy.test.ts
    - tests/api/categories-taxonomy.test.ts
  modified:
    - src/app/admin/page.tsx
    - tests/api/articles-edit-roundtrip.test.ts

key-decisions:
  - "Seed extracted to a callable `seedTaxonomy()` in `src/lib/` so idempotency is unit-testable, with `scripts/seed-taxonomy.ts` as the CLI wrapper (A3, matching the `scripts/seed-*.ts` precedent)"
  - "Upsert is find-by-slug / create-only-when-absent — no `updateOne` on existing docs and no `deleteMany`, so an admin's ad-hoc categories survive the seed unchanged (D-11, T-02-22)"
  - "Editor category guard surfaces both an inline rose error under the Level-1 select and a toast, and is cleared the moment a category is chosen"
  - "GEO fields (`focus_keyword`, `key_takeaways`, `entities`, `faq_schema`) remain entirely outside the save guard — optionality is never silently reversed (D-09)"
  - "FAQ payload filter `faqRows.filter((f) => f.question.trim() && f.answer.trim())` drops incomplete rows silently — no toast, no blocking (D-10)"

patterns-established:
  - "A spec-derived taxonomy constant is the single writer; the CMS reads the same tree through the existing `GET /api/v1/cms/categories` shape with no route change"
  - "Seed CLI logs counts only; credential material never reaches stdout (T-02-23)"

requirements-completed: [CMS-04]

coverage:
  - id: D1
    description: "The V5.2 §1.2 two-level taxonomy seeds idempotently: a first run creates 6 categories + 5 sub-categories with the exact spec slugs, a second run reports 0/0, and a pre-existing ad-hoc category/sub-category survives unchanged"
    requirement: CMS-04
    verification:
      - kind: unit
        ref: "tests/lib/seed-taxonomy.test.ts#creates the six top-level categories and five AI Use Cases children with exact slugs"
        status: pass
      - kind: unit
        ref: "tests/lib/seed-taxonomy.test.ts#is idempotent — a second run creates nothing"
        status: pass
      - kind: unit
        ref: "tests/lib/seed-taxonomy.test.ts#coexists with pre-existing ad-hoc taxonomy (never deletes or rewrites)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The seeded taxonomy is served by `GET /api/v1/cms/categories` (6 top-level; `ai-use-cases` carries 5 subCategories) so the CMS tree renders the two-level structure with no route change"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/categories-taxonomy.test.ts#serves the seeded two-level tree from the categories API"
        status: pass
    human_judgment: false
  - id: D3
    description: "Editor: a top-level category is required (save blocked with inline `Choose a primary category.`), the sub-category is filtered to the parent's children and reset on parent change, a childless category hides the sub-select, and GEO fields never block a save"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#save payload round-trips title/slug/content/category + GEO fields and status"
        status: pass
    human_judgment: true
    rationale: "The save guard, the inline copy, and the filter/reset logic are present and typecheck-clean, but the rendered Level-1/Level-2 select behavior and the childless-category hidden state are browser-only — vitest runs `environment: 'node'` with no jsdom, so this half is manual UAT."
  - id: D4
    description: "FAQ row editor matches the UI-SPEC copy/accessibility and stores exactly the filtered-complete `faq_schema` (one complete + one incomplete pair stores only the complete pair; zero pairs stores `[]` and still saves)"
    requirement: CMS-04
    verification:
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#stores exactly the complete FAQ pair when an incomplete row is present"
        status: pass
      - kind: integration
        ref: "tests/api/articles-edit-roundtrip.test.ts#stores an empty faq_schema and still saves when there are zero FAQ rows"
        status: pass
    human_judgment: true
    rationale: "The copy strings, the icon-only remove control with `title`/`aria-label`, and the empty state are present and typecheck-clean, but the rendered DOM, the row add/remove interaction, and the public FAQPage JSON-LD reflected from a saved article are browser-only — manual UAT pending."

duration: 22min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 6: Taxonomy Seed + Editor Contract Alignment Summary

**Seeded the exact V5.2 §1.2 two-level taxonomy idempotently via a testable `seedTaxonomy()` + `tsx` CLI, and aligned the article editor's category and FAQ controls to the UI-SPEC contract while keeping all GEO fields optional.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-21T07:15:00Z (approx, immediately after plan 02-04)
- **Completed:** 2026-09-21T07:37:00Z (approx)
- **Tasks:** 3
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- Added `src/lib/seed-taxonomy.ts` with `SEED_TAXONOMY` (six top-level categories; `AI Use Cases`/`ai-use-cases` carrying the five spec sub-categories) and `seedTaxonomy()` — find-by-slug, create-only-when-absent, returning `{ createdCategories, createdSubCategories }`. No `deleteMany`, no `updateOne` on existing docs, so an admin's ad-hoc taxonomy is never destroyed (D-11, T-02-22). The function has no top-level side effects, so a vitest import does not connect eagerly.
- Added `scripts/seed-taxonomy.ts` as a thin `npx tsx` CLI: run `seedTaxonomy()`, log counts only (never a connection string or credential), exit non-zero on throw (T-02-23).
- Added `tests/lib/seed-taxonomy.test.ts` (idempotency + exact spec slugs + ad-hoc coexistence) and `tests/api/categories-taxonomy.test.ts` (the `GET /api/v1/cms/categories` read path over the seeded tree — 6 top-level, `ai-use-cases` with 5 children), proving the CMS CategoriesView renders the two-level tree with no route change (CMS-04).
- Editor category integrity (D-09, D-12): a top-level category is now required — save is blocked with the inline rose copy `Choose a primary category.` (plus a toast), cleared the instant a category is chosen. The sub-category label reads `Sub-category (optional)`, the select is filtered to `selectedCategoryObj.subCategories`, changing the parent resets `subCategoryId`, and a childless category renders no sub-select. The save guard tests only title/slug/content/category/status; no GEO field participates.
- FAQ row editor aligned to the UI-SPEC (D-10): the add control reads `+ Add question`; inputs are placeholdered `Question…` / `Answer…`; the remove control is an icon-only `Trash2` with `title="Remove this question"` and `aria-label="Remove FAQ row {index}"`; the zero-row empty state reads `No FAQ pairs yet. Add a question to embed FAQPage structured data on the public article.`; the helper line reads `Rows with an empty question or answer are ignored when saving.`. `updateFaqRow` writes clone-then-set (immutable). The payload stays `faqRows.filter((f) => f.question.trim() && f.answer.trim())`.
- Extended `tests/api/articles-edit-roundtrip.test.ts` to persist the render contract: a PUT with one complete and one incomplete FAQ pair stores exactly the complete pair; zero pairs stores `[]` and the article still saves.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — idempotent V5.2 taxonomy seed + categories read-path tests** - `17b0689` (feat)
2. **Task 2: Require Level-1 category + filtered optional sub-category (D-12, D-09)** - `d4ee8b8` (feat)
3. **Task 3: Align FAQ row editor to the UI-SPEC contract (D-10)** - `504266f` (feat)
4. **Plan metadata:** `(this SUMMARY)` (docs: complete plan)

_Note: Task 1 is a tracer task; its feedback gate was evaluated (end-of-phase mode, automated-only verify, no failure) and it expanded as designed._

## Files Created/Modified
- `src/lib/seed-taxonomy.ts` - NEW: `SEED_TAXONOMY`, `seedTaxonomy()`, `SeedCategory`/`SeedSubCategory`/`SeedTaxonomyResult`
- `scripts/seed-taxonomy.ts` - NEW: thin `tsx` CLI, counts-only logging, non-zero exit on throw
- `src/app/admin/page.tsx` - MOD: `categoryError` state + save-time required-category guard, `Sub-category (optional)` label, FAQ editor copy/a11y, immutable `updateFaqRow`
- `tests/lib/seed-taxonomy.test.ts` - NEW: idempotency + exact tree + coexistence
- `tests/api/categories-taxonomy.test.ts` - NEW: seeded-tree read path over the categories API
- `tests/api/articles-edit-roundtrip.test.ts` - MOD: FAQ filter round-trip (one complete + one incomplete; zero pairs)

## Decisions Made
- **Seed is a callable lib function, not an inline script.** `seedTaxonomy()` in `src/lib/` makes idempotency unit-testable; `scripts/seed-taxonomy.ts` is the CLI wrapper (A3, matching the `scripts/seed-*.ts` precedent).
- **Create-only-when-absent, never update or delete.** The idempotency guard is `findOne({ slug })` then `create` only when absent — coexistence with ad-hoc categories is structural, not a runtime policy check (D-11, T-02-22).
- **Category error surfaces in two places.** Inline rose copy under the Level-1 select *and* a toast; both clear the moment a category is chosen, mirroring the existing editor error idiom.
- **GEO optionality is defended by omission.** No GEO field appears in the save guard, so D-09 cannot be silently reversed by a later edit to that guard without an obvious diff.
- **FAQ immutability repaired.** `updateFaqRow` clones the array and the target row; a shallow map alone would leave React aliasing the mutated row object.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Executor interruption after all work landed.** The wave-4 executor's provider connection dropped (HTTP 500) after all three task commits were made but before it wrote `02-06-SUMMARY.md` or updated tracking. Per the safe-resume gate, work was verified independently: `git log` shows all three task commits (`17b0689`, `d4ee8b8`, `504266f`), `npx vitest run` → 30 files / 278 tests passed, and `npx tsc --noEmit` → exit 0 with no partial/uncommitted state. The plan was closed out manually (this SUMMARY + tracking update) with no re-execution and no duplicate work.
- Pre-existing mongoose `findOneAndUpdate` `new`-option deprecation warnings appear in test output; baseline and out of scope.

## Threat Surface Scan
- T-02-22 (seed wiping existing taxonomy): mitigated — upsert-only, no `deleteMany`/overwrite; coexistence asserted in `tests/lib/seed-taxonomy.test.ts`.
- T-02-23 (credentials echoed by the seed CLI): mitigated — the script logs counts only; no env value is printed.
- T-02-24 (FAQ/taxonomy text reaching a render as markup): mitigated — stored through the existing sanitized article write path; FAQ rendered only as JSON-LD via `serializeJsonLd` (plan 02-02).
- T-02-25 (documentation drift on seeded slugs vs spec §1.2): mitigated — exact slugs asserted against the spec list.
- T-02-SC (package legitimacy): not applicable — zero packages installed this plan.

## User Setup Required
None - no external service configuration required. The seed is run manually with `npx tsx scripts/seed-taxonomy.ts`.

## Next Phase Readiness
- CMS-04 is delivered: the spec taxonomy seeds idempotently and is immediately manageable in the CMS, and the editor satisfies the category/FAQ UI contract with GEO optionality intact.
- Manual UAT pending (browser-only): run `npx tsx scripts/seed-taxonomy.ts` twice and confirm the second run reports 0 created and CategoriesView shows 6 categories with `AI Use Cases` expanded to 5; in the editor confirm the required-category block, the filtered/reset sub-select, the childless-category hidden state, and that two FAQ rows with one left blank persist only the complete pair and reflect in the public FAQPage JSON-LD.
- This is the final plan of Phase 02 — all six plans now have a SUMMARY on disk, ready for phase verification.

## Self-Check: PASSED

- `src/lib/seed-taxonomy.ts`, `scripts/seed-taxonomy.ts`, `tests/lib/seed-taxonomy.test.ts`, `tests/api/categories-taxonomy.test.ts` all present
- `git log --oneline --all --grep="02-06"` returns the three task commits
- Plan verification: `npx vitest run tests/lib/seed-taxonomy.test.ts tests/api/categories-taxonomy.test.ts tests/api/articles-edit-roundtrip.test.ts tests/lib/faq-jsonld.test.ts` → green; full `npx vitest run` → 30 files / 278 tests passed; `npx tsc --noEmit` → clean

---
*Phase: 02-cms-end-to-end-v5-2*
*Completed: 2026-09-21*
