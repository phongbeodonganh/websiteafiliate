---
phase: 02-cms-end-to-end-v5-2
verified: 2026-09-22T14:15:00Z
status: passed
score: 10/10 must-haves verified
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-01-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-01-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-02-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-02-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-03-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-03-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-04-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-04-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-05-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-05-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-06-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-06-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-07-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-07-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-08-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-08-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-09-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-09-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-REVIEW.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-PATTERNS.md
  - src/lib/auth.ts
  - src/lib/cms-fetch.ts
  - src/lib/faq-jsonld.ts
  - src/lib/placement-order.ts
  - src/lib/seed-taxonomy.ts
  - src/lib/schedule-after-response.ts
  - src/lib/blacklist.ts
  - src/app/admin/page.tsx
  - src/app/article/[slug]/page.tsx
  - src/app/api/v1/cms/blacklist/import-sheet-url/route.ts
  - src/app/api/v1/cms/blacklist/re-sweep/route.ts
  - src/app/api/v1/cms/blacklist/route.ts
  - src/app/api/v1/cms/blacklist/check/route.ts
  - src/app/api/v1/cms/users/[id]/route.ts
  - src/app/api/v1/cms/sub-categories/route.ts
  - src/app/api/v1/cms/sub-categories/[id]/route.ts
  - tests/api/cms-auth-inactive.test.ts
  - tests/api/cms-users-update.test.ts
  - tests/api/cms-rbac-affiliate-403.test.ts
  - tests/api/articles-list-scoping.test.ts
  - tests/api/articles-edit-roundtrip.test.ts
  - tests/api/admin-route-absence.test.ts
  - tests/api/blacklist-import-async.test.ts
  - tests/api/categories-taxonomy.test.ts
  - tests/api/blacklist-post-rbac.test.ts
  - tests/api/admin-blacklist-check-token.test.ts
  - tests/api/admin-edit-user-modal.test.ts
  - tests/api/sub-categories-objectid.test.ts
  - tests/lib/faq-jsonld.test.ts
  - tests/lib/placement-order.test.ts
  - tests/lib/placement-verdict-order.test.ts
  - tests/lib/cms-fetch.test.ts
  - tests/lib/seed-taxonomy.test.ts
  - tests/lib/blacklist-sweep.test.ts
covered_digest: "v1:sha256:6e19cd0950a0ecb599f587fec93a14ae35645664cadd81d8937bd4647a85a362"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/10
  gaps_closed:
    - "POST /api/v1/cms/blacklist had no role guard (CR-03) — closed by plan 02-07"
    - "handleCheckAffUrl called blacklist/check without bearer token (CR-01) — closed by plan 02-07"
    - "Edit-user modal nested in BlacklistView, trigger in UsersView (CR-02) — closed by plan 02-08"
    - "handleSaveSubCategory coerced ObjectId with Number() → NaN → null (CR-04) — closed by plan 02-08"
    - "Verdict selected by array index, always consuming top_cta (WR-02) — closed by plan 02-09"
  gaps_remaining: []
  regressions: []
---

# Phase 2: CMS End-to-End (V5.2) Verification Report

**Phase Goal:** An admin can create and publish an SEO+GEO-ready article end-to-end through one coherent CMS flow per the governing V5.2 spec — correct RBAC, working edit loop, taxonomy and user management, and the blacklist import with retroactive sweeper.
**Verified:** 2026-09-22T14:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (5 gaps closed across 3 plans: 02-07, 02-08, 02-09)

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | SC1 — Admin creates an SEO+GEO article (focus keyword, key takeaways, entities, FAQ Q&A), publishes it, and the public page embeds FAQPage JSON-LD | ✓ VERIFIED | Editor payload includes focusKeyword/keyTakeaways/entities/faqSchema (page.tsx:2110–2117); API persists them (articles/route.ts:130–133); `buildFaqPageSchema` + guarded third `application/ld+json` script wired (page.tsx:183,190–192); faq-jsonld tests pass — regression confirmed |
| 2   | SC2 — Reopen a published article, change fields, save: no empty editor, no silent 401 | ✓ VERIFIED | Authoritative load via `cmsFetch` with `didLoadRef`; `loadError` renders inline panel before the form (page.tsx:1931–1948, 2187–2201); save POST/PUT via `cmsFetch` (2119–2124); `articles-edit-roundtrip.test.ts` green — regression confirmed |
| 3   | SC3a — Editor/author sees only their own articles | ✓ VERIFIED | `filter = user.role === 'admin' ? {} : { author_id: user.userId.toString() }` (articles/route.ts:18); `articles-list-scoping.test.ts` green — regression confirmed |
| 4   | SC3b — Editor/author 403 on affiliate-link management; can GET to select-to-attach | ✓ VERIFIED | POST/PUT/DELETE guard `if (!user || user.role !== 'admin') 403` (affiliate-links/route.ts:49, [id]/route.ts:13,83); `cms-rbac-affiliate-403.test.ts` green — regression confirmed |
| 5   | SC3c — Placements at top/middle/footer render in order on the public page | ✓ VERIFIED | **WR-02 closed (plan 02-09):** `splitPlacementsByVerdict` now consumed in page.tsx:113 (`const { verdict: verdictPlacement, remaining: remainingPlacements } = splitPlacementsByVerdict(placements)`). No `placements[0]` or `placements.slice(1)` remains. Pure selector prefers `middle_comparison` so top_cta stays in remaining/offers slot. `placement-verdict-order.test.ts` (18 tests) + `placement-order.test.ts` (12 tests) both green |
| 6   | SC4a — Admin manages users (role, status, name, avatar) via the CMS | ✓ VERIFIED | **CR-02 closed (plan 02-08):** Edit-user modal is now co-located inside UsersView. Line indices confirmed: `const UsersView = () => (` at line 1560; `{showEditUserModal && editingUser && (` at line 1714; `const ArticlesView = () => (` at line 1800; `const BlacklistView = () => {` at line 3006. Modal is between UsersView and ArticlesView (not in BlacklistView). Appears exactly once. Source-contract test `admin-edit-user-modal.test.ts` (5 tests) green. API PUT route unchanged and tested |
| 7   | SC4b — Admin manages the two-level taxonomy (categories + sub-categories) in the CMS | ✓ VERIFIED | **CR-04 + WR-07 closed (plan 02-08):** `Number(subCatParentId)` grep returns zero results. Line 1141 now uses `categoryId: subCatParentId ? String(subCatParentId) : undefined`. POST route validates `Types.ObjectId.isValid(String(categoryId))` → 400 on malformed (route.ts:46-48). PUT route validates same before assignment ([id]/route.ts:27-29). `sub-categories-objectid.test.ts` (3 tests) green — happy path persists category_id, invalid id → 400 not 500 |
| 8   | SC5 — Paste a Google Sheet URL: import with root domains extracted; matching active campaigns deactivated by the retroactive sweeper | ✓ VERIFIED | `import-sheet-url` persists rows, extracts root domains, schedules `sweepDomains` post-response (route.ts:130); boundary-safe batch sweep + restore (`blacklist.ts:142–249`); `blacklist-import-async` + `blacklist-sweep` tests green — regression confirmed |
| 9   | Goal "correct RBAC" — non-admins cannot mass-deactivate campaigns through blacklist writes | ✓ VERIFIED | **CR-03 closed (plan 02-07):** POST /api/v1/cms/blacklist now has combined admin guard identical to sibling DELETE: `if (!user || user.role !== 'admin') return 401` (route.ts:42-45). Guard sits before `req.json()` so sweep is unreachable for non-admin. `blacklist-post-rbac.test.ts` (3 tests) green — editor/author rejected with 401 and campaign stays active; admin succeeds and campaign flips to blacklisted |
| 10  | Blacklist pre-check warns before saving a blacklisted affiliate URL | ✓ VERIFIED | **CR-01 closed (plan 02-07):** `handleCheckAffUrl` now routes through `cmsFetch` with bearer token from localStorage (page.tsx:526-537). Fail-closed: `if (!result.ok)` sets visible warning "Blacklist check unavailable. Retry before saving." and returns without clearing (page.tsx:538-547). `admin-blacklist-check-token.test.ts` (4 tests) green — source contract pins cmsFetch usage, no bare fetch, fail-closed branch, token from localStorage |

**Score:** 10/10 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/lib/auth.ts` | Async DB-backed guard | ✓ VERIFIED | Async, ObjectId pre-check, live status gate (58–81); all 27 routes awaited (source-contract test green) |
| 27 route files under `src/app/api/v1/**` | `await getAuthUser(req)` | ✓ VERIFIED | `cms-auth-inactive.test.ts` source-contract walk passes |
| `src/lib/faq-jsonld.ts` | FAQPage builder | ✓ VERIFIED | Pure builder, filters incomplete pairs, returns null on empty; unit-tested |
| `src/lib/placement-order.ts` | Canonical stable sort + verdict selector | ✓ VERIFIED | `ORDERED_POSITION_LABELS`/`positionRank`/`sortPlacementsByPosition` + new `selectVerdictPlacement`/`splitPlacementsByVerdict` (WR-02); unit-tested (30 tests across two files) |
| `src/lib/cms-fetch.ts` | Shared bearer helper | ✓ VERIFIED | Bearer attach, envelope normalization, never throws on HTTP error; 15 tests |
| `src/lib/seed-taxonomy.ts` + `scripts/seed-taxonomy.ts` | Idempotent V5.2 tree seed | ✓ VERIFIED | Exact 6 categories + 5 AI-Use-Cases children; find-by-slug/create-only; unit-tested |
| `src/lib/blacklist.ts` | Batch sweep + restore + wrapper | ✓ VERIFIED | Boundary-safe matcher, updateMany per domain; `sweepRetroactiveBlacklist` wrapper preserved |
| `src/lib/schedule-after-response.ts` | `after()` + fallback | ✓ VERIFIED | Present; E468 fallback |
| `src/app/api/v1/cms/blacklist/re-sweep/route.ts` | Admin-only sweep+restore | ✓ VERIFIED | Combined sibling guard; registered in 401 inventory |
| `src/app/admin/page.tsx` | Consolidated editor + tabs + modals | ✓ VERIFIED | All flows wired: editor, blacklist, re-sweep, user edit modal (co-located in UsersView), sub-category (ObjectId pass-through), pre-check (cmsFetch + fail-closed) |
| `src/app/article/[slug]/page.tsx` | FAQPage emission + placement verdict order | ✓ VERIFIED | FAQPage ✓; verdict now selected by position via `splitPlacementsByVerdict` |
| `src/app/api/v1/cms/blacklist/route.ts` | POST with admin guard | ✓ VERIFIED | Combined guard identical to sibling DELETE (CR-03 closed) |
| `src/app/api/v1/cms/sub-categories/route.ts` | ObjectId validation | ✓ VERIFIED | `Types.ObjectId.isValid` gate before create (CR-04/WR-07 closed) |
| `src/app/api/v1/cms/sub-categories/[id]/route.ts` | ObjectId validation | ✓ VERIFIED | `Types.ObjectId.isValid` gate before assignment (CR-04/WR-07 closed) |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| Editor save handler | `/api/v1/cms/articles[/id]` | `cmsFetch` (POST/PUT) | ✓ WIRED | Headers attach bearer; non-2xx → toast |
| `doc.faq_schema` | third `application/ld+json` | `buildFaqPageSchema` → `serializeJsonLd` | ✓ WIRED | page.tsx:183, 190–192 |
| `articlesList` row → Editor | `?edit=<id>` restore effect → authoritative `cmsFetch` GET | ✓ WIRED | page.tsx:427–459, 1931–1994 |
| Taxonomy seed | `GET /cms/categories` → CategoriesView → editor selects | ✓ WIRED | `categories-taxonomy.test.ts` green |
| Sheet import | `scheduleAfterResponse(() => sweepDomains(...))` | ✓ WIRED | route.ts:130 |
| Users-tab Edit button | Edit-user modal | ✓ WIRED | **Fixed (CR-02):** modal now co-located inside UsersView (line 1714, between UsersView@1560 and ArticlesView@1800) |
| `handleCheckAffUrl` | `/cms/blacklist/check` | `cmsFetch` w/ bearer token | ✓ WIRED | **Fixed (CR-01):** routes through cmsFetch with token from localStorage (page.tsx:526-537); fail-closed on !result.ok |
| Sub-category form | `/cms/sub-categories` write | `String(subCatParentId)` pass-through | ✓ WIRED | **Fixed (CR-04):** page.tsx:1141 passes ObjectId string; routes validate with Types.ObjectId.isValid |
| `placements` sorted | `splitPlacementsByVerdict` → verdict + remaining | ✓ WIRED | **Fixed (WR-02):** page.tsx:113 consumes pure selector from placement-order.ts |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `article/[slug]/page.tsx` | `faqPageSchema` | `doc.faq_schema` via Mongo query populates | Yes | ✓ FLOWING |
| `article/[slug]/page.tsx` | `placements` | populated `affiliate_placement` | Yes | ✓ FLOWING (verdict now selected by position) |
| `admin/page.tsx` article editor | form fields | authoritative `cmsFetch` GET | Yes | ✓ FLOWING |
| `admin/page.tsx` Users edit modal | `editingUser` | row data from `UsersView`, modal in same view | Yes | ✓ FLOWING (modal co-located in UsersView) |
| `admin/page.tsx` sub-category form | `categoryId` | `String(subCatParentId)` pass-through | Yes | ✓ FLOWING (ObjectId preserved, route-validated) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `npx vitest run` | 35 files / 309 tests passed | ✓ PASS |
| Typecheck clean | `node node_modules/typescript/bin/tsc --noEmit` | exit 0 (no output) | ✓ PASS |
| Verdict selector unit tests | `npx vitest run tests/lib/placement-verdict-order.test.ts` | 18 tests passed | ✓ PASS |
| RBAC POST /blacklist | `npx vitest run tests/api/blacklist-post-rbac.test.ts` | 3 tests passed | ✓ PASS |
| Pre-check source contract | `npx vitest run tests/api/admin-blacklist-check-token.test.ts` | 4 tests passed | ✓ PASS |
| Edit-user modal co-location | `npx vitest run tests/api/admin-edit-user-modal.test.ts` | 5 tests passed | ✓ PASS |
| Sub-category ObjectId | `npx vitest run tests/api/sub-categories-objectid.test.ts` | 3 tests passed | ✓ PASS |
| No `Number(subCatParentId)` in source | grep `Number\(subCatParentId\)` in admin/page.tsx | 0 results | ✓ PASS |
| No `placements[0]` / `placements.slice(1)` in RSC | grep in article/[slug]/page.tsx | 0 results | ✓ PASS |
| Edit-user modal appears exactly once | grep `showEditUserModal && editingUser` in admin/page.tsx | 1 match at line 1714 | ✓ PASS |
| Modal inside UsersView region | Line indices: UsersView@1560 < modal@1714 < ArticlesView@1800 | Correct ordering | ✓ PASS |

### Probe Execution

N/A — no probe scripts declared in this phase's plans or SUMMARY files.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CMS-01 | 02-03 | Article CRUD & publishing CRUD round trip | ✓ SATISFIED | `articles-edit-roundtrip.test.ts`; GEO fields persist |
| CMS-02 | 02-02, 02-06 | SEO/GEO fields + FAQPage JSON-LD | ✓ SATISFIED | Builder + wired script + tests |
| CMS-03 | 02-02, 02-09 | Multi-position placements rendered in order | ✓ SATISFIED | `splitPlacementsByVerdict` pure selector consumed in RSC; 18+12 unit tests green |
| CMS-04 | 02-06, 02-08 | Two-level taxonomy manageable in CMS | ✓ SATISFIED | Seed/categories GET ✓; sub-category create/update pass ObjectId through; routes validate with Types.ObjectId.isValid → 400 not 500 |
| CMS-05 | 02-03 | One consolidated editor flow, no dead-end routes | ✓ SATISFIED | Orphan routes deleted + absence test |
| AUTH-02 | 02-05 | Article data isolation | ✓ SATISFIED | List scoping test |
| AUTH-03 | 02-05, 02-07 | Affiliate link store admin-only | ✓ SATISFIED | Affiliate 403 test (11 cases) + blacklist POST RBAC test (3 cases) |
| AUTH-04 | 02-01, 02-05, 02-08 | Admin user management | ✓ SATISFIED | Guard + PUT API ✓; edit-user modal co-located inside UsersView with source-contract test |
| AFF-04 | 02-04, 02-07 | Blacklist bulk import + retroactive sweeper | ✓ SATISFIED | Import/sweep/restore tests green; POST /blacklist now admin-guarded |

All 9 phase requirement IDs appear in PLAN frontmatter and are accounted for above. No orphaned requirements.

### Anti-Patterns Found

No unresolved `TBD`/`FIXME`/`XXX` debt markers were found in any phase-modified files. The only grep match (`G-XXXXXXXXXX` on admin/page.tsx:4007) is a Google Analytics ID placeholder, not a debt marker.

Previously identified warnings (WR-01 through WR-09) remain advisory and do not affect phase-goal truths. They are noted for future phases:
- WR-01 (`auth.ts:80` token-baked role) — advisory, Phase 5 scope
- WR-03 (non-atomic view_count increment) — Phase 3 scope (PERF-02)
- WR-04/WR-05/WR-09 (error detail leaks, startsWith over-block, sweep error swallowing) — advisory warnings

### Advisory (New Scope, Unevidenced)

None — all findings in this re-verification are gap-closure confirmations on previously identified items. No new-scope concerns surfaced.

### Human Verification Required

All 10 must-have truths are verified through automated tests and source-level evidence. The remaining human-verification items from the prior pass were tied to the gaps that are now closed (placement render order, edit modal, sub-category save). The phase's vitest suite runs `environment: 'node'` with no jsdom, so the following browser-only interactions are still recommended as smoke tests before launch — they are not gap-closure items, and the underlying behaviors are already pinned by automated tests:

1. **Smoke test: end-to-end publish + placement render** — Publish an article with one placement at each position and visually confirm top_cta renders at top, not as the verdict. Expected: top_cta in offers area, middle_comparison in Editor's Verdict.
2. **Smoke test: Edit a team member from the Users tab** — Click the Edit button and confirm the modal opens. Expected: modal renders with role/status/name/avatar fields.

---

### Gaps Summary

All 5 gaps from the initial verification are closed:

- **CR-03** (truth 9): POST /api/v1/cms/blacklist now has the combined admin guard (`!user || role !== 'admin' → 401`), identical to the sibling DELETE. Pinned by `blacklist-post-rbac.test.ts` (3 tests).
- **CR-01** (truth 10): `handleCheckAffUrl` now routes through `cmsFetch` with the bearer token and fails closed. Pinned by `admin-blacklist-check-token.test.ts` (4 tests).
- **CR-02** (truth 6): Edit-user modal relocated from BlacklistView into UsersView. Pinned by `admin-edit-user-modal.test.ts` (5 tests).
- **CR-04** (truth 7): `Number(subCatParentId)` replaced with `String(subCatParentId)` pass-through; routes hardened with `Types.ObjectId.isValid`. Pinned by `sub-categories-objectid.test.ts` (3 tests).
- **WR-02** (truth 5): Index-based verdict selection (`placements[0]`) replaced with pure `splitPlacementsByVerdict` selector. Pinned by `placement-verdict-order.test.ts` (18 tests).

Full suite: 35 files / 309 tests passing. Typecheck: 0 errors. Phase goal achieved.

---

_Verified: 2026-09-22T14:15:00Z_
_Verifier: the agent (gsd-verifier)_
