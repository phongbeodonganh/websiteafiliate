---
phase: 02-cms-end-to-end-v5-2
verified: 2026-09-21T17:05:00Z
status: gaps_found
score: 5/10 must-haves verified
covered_files:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-01-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-02-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-03-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-04-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-05-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-06-PLAN.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-01-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-02-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-03-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-04-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-05-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-06-SUMMARY.md
  - .planning/phases/02-cms-end-to-end-v5-2/02-REVIEW.md
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
  - tests/lib/faq-jsonld.test.ts
  - tests/lib/placement-order.test.ts
  - tests/lib/cms-fetch.test.ts
  - tests/lib/seed-taxonomy.test.ts
  - tests/lib/blacklist-sweep.test.ts
covered_digest: "v1:sha256:186c1e1a0f26fb0907fcff1f9e107f0e969654b3e629df80debf48d3eb16c21b"
behavior_unverified: 1
overrides_applied: 0
gaps:
  - truth: "An admin manages users (role, status, name, avatar) through the CMS (ROADMAP SC #4 / AUTH-04)"
    status: failed
    reason: "The D-14 'Edit team member' modal is physically rendered inside BlacklistView, but openEditUserModal is only invoked from a row button in UsersView. renderContent mounts exactly one view per tab, so on the Users tab the modal's host component is not mounted — clicking Edit sets state but nothing renders. The API route and its tests pass, but the user-management UI flow added by this phase is unreachable."
    artifacts:
      - path: "src/app/admin/page.tsx"
        issue: "Modal JSX at line 3241 ({showEditUserModal && editingUser && ...}) lives inside BlacklistView (2908–3326); trigger at 1614 is inside UsersView (1545+); renderContent (4229–4241) mounts only one. Confirmed: 0 occurrences of showEditUserModal in the UsersView region."
    missing:
      - "Move the {showEditUserModal && editingUser && (...)} block into UsersView (or the root/renderContent return) so it renders on the Users tab"
      - "Add a source-contract or UI assertion that the modal markup is co-located with the openEditUserModal trigger"
  - truth: "An admin manages the two-level AI-niche taxonomy (categories + sub-categories) in the CMS (ROADMAP SC #4 / CMS-04)"
    status: failed
    reason: "handleSaveSubCategory coerces the Mongo ObjectId string with Number(subCatParentId), producing NaN, which JSON.stringify serializes as null. Sub-category create therefore fails the route's truthiness check (400) and update assigns null to the required ObjectId ref (500). The seeded taxonomy and top-level category CRUD work, but sub-categories cannot be created or re-parented from the admin UI."
    artifacts:
      - path: "src/app/admin/page.tsx"
        issue: "Line 1126: categoryId: Number(subCatParentId). subCatParentId holds a string ObjectId (set from cat.id at 3374/3427 and the parent select at 3559). Node proof: Number('507f1f77bcf86cd799439011') === NaN; JSON.stringify({x:NaN}) === '{\"x\":null}'."
      - path: "src/app/api/v1/cms/sub-categories/route.ts"
        issue: "Line 41: `if (!categoryId || ...)` rejects null with 400; no ObjectId validation (WR-07) so a bad string would 500 instead."
      - path: "src/app/api/v1/cms/sub-categories/[id]/route.ts"
        issue: "Line 25: category_id assigned from body with no validation → save() throws on null → 500."
    missing:
      - "Pass the ObjectId string through unchanged (String(subCatParentId)) instead of Number()"
      - "Add a route test that POSTs a sub-category with a real 24-hex categoryId and asserts 201 + persisted category_id"
  - truth: "Correct RBAC across the CMS surface — non-admin users cannot mass-deactivate affiliate campaigns (phase goal 'correct RBAC')"
    status: failed
    reason: "POST /api/v1/cms/blacklist gates on identity only (`if (!user) 401`). Every sibling blacklist write (DELETE in the same file, quick-blacklist, import, import-sheet-url, re-sweep) is admin-only. POST is the most destructive: after creating the entry it calls sweepRetroactiveBlacklist(domainToSave), flipping every matching active campaign to blacklisted globally. An editor/author can therefore submit { websiteUrl: 'competitor.com', reason: 'x' } and take down campaigns site-wide."
    artifacts:
      - path: "src/app/api/v1/cms/blacklist/route.ts"
        issue: "Lines 37–42: no role check on POST (contrast DELETE at 91–94: `if (!user || user.role !== 'admin')`)."
    missing:
      - "Add the sibling combined guard to POST: `if (!user) 401; if (user.role !== 'admin') 403` (or the 401-on-both sibling contract)"
      - "Add a role-based test for POST /cms/blacklist (the 401 gate pins only the no-token status)"
  - truth: "An editor/author can attach existing links at top/middle/footer positions that render in order on the public page (ROADMAP SC #3)"
    status: partial
    reason: "The canonical sort helper and attach UI are present and unit-tested, but the public page consumes placements[0] as the Editor's Verdict by array index. After sortPlacementsByPosition, placements[0] is always the top_cta placement, so the top CTA never renders at the top — it surfaces mid-article inside EditorVerdict, and a middle_comparison can never be the verdict when a top_cta exists. Render order is deterministic but the intended top/middle/footer semantics are silently changed."
    artifacts:
      - path: "src/app/article/[slug]/page.tsx"
        issue: "Lines 99–113: sortPlacementsByPosition(...) then `const verdictPlacement = placements[0]` / `remainingPlacements = placements.slice(1)`."
    missing:
      - "Select the verdict by position (prefer middle_comparison) rather than by index, keeping top_cta in the remaining/top slot — confirm intended mapping against the UI-SPEC"
  - truth: "The affiliate-link blacklist pre-check warns on blacklisted URLs before save (AFF-03 interceptor, re-wired by this phase's auth swap)"
    status: partial
    reason: "handleCheckAffUrl POSTs to /api/v1/cms/blacklist/check with only Content-Type and no Authorization header. Phase 02-01 added `getAuthUser` to that route, so the token-less call now always returns 401; the client's `data.status === 'success' && …isBlacklisted` is never true and the else branch clears the warning. A known-blacklisted base_url can be saved. (The affiliate-links POST route itself does not blacklist-check.)"
    artifacts:
      - path: "src/app/admin/page.tsx"
        issue: "Lines 517–544 (call 524–528): raw fetch with no bearer token; failure path clears the warning instead of failing closed."
    missing:
      - "Route the check through cmsFetch (which attaches the token) and fail closed on !ok instead of clearing the banner"
human_verification:
  - test: "Create an article in the CMS with focus keyword, key takeaways, entities and FAQ Q&A pairs; publish it; open the public /article/[slug] page and inspect the rendered head + Editor's Verdict / offer blocks"
    expected: "Content renders; a third application/ld+json block of @type FAQPage is present; affiliate placements appear (and top_cta appears at the top rather than inside mid-article Editor's Verdict)"
    why_human: "The FAQPage builder is unit-tested and the script tag is grep-wired, but the RSC render is not exercised by the node-environment suite; the rendered DOM and the intended placement positions need a browser/devtools check."
  - test: "Reopen a published article in the editor, clear the token (or sign out) and trigger a load/save; also edit a team member from the Users tab and create/edit a sub-category"
    expected: "Session-expired toast with a Sign in action (no blank editor); Edit modal opens; sub-category saves"
    why_human: "Browser-only interaction states; vitest runs environment:'node' with no jsdom. (The Edit modal and sub-category save are also implicated by the gaps above.)"
  - test: "Log in as an editor: confirm no admin tabs appear, navigate to ?tab=users, and attempt affiliate-link management"
    expected: "Access-denied panel (not 'Under Construction' or another user's data); 403 on affiliate writes; GET permitted for select-to-attach"
    why_human: "Rendered DOM/permission panel visibility is browser-only; the route 403 and list scoping are already pinned by automated tests."
  - test: "Paste a Google Sheet URL in the blacklist tab and click Re-sweep; confirm a manually-inactive campaign stays inactive"
    expected: "Import returns immediately with an eventual-count notice; Re-sweep reports swept/restored; blacklisted and inactive chips are visually distinct"
    why_human: "Spinner/disabled state and toast presentation are browser-only; the import/sweep/restore behavior is covered by automated tests."
behavior_unverified_items:
  - truth: "Affiliate placements render in canonical top_cta → middle_comparison → footer_banner order on the public page (ROADMAP SC #3)"
    test: "Publish an article with one placement at each of the three positions, then view the public page"
    expected: "top_cta renders at the top, middle_comparison in the middle (verdict), footer_banner last"
    why_human: "sortPlacementsByPosition is unit-tested, but the page's verdict-by-index split means the rendered position of top_cta is not what the ordering implies; no test exercises the rendered layout."
---

# Phase 2: CMS End-to-End (V5.2) Verification Report

**Phase Goal:** An admin can create and publish an SEO+GEO-ready article end-to-end through one coherent CMS flow per the governing V5.2 spec — correct RBAC, working edit loop, taxonomy and user management, and the blacklist import with retroactive sweeper.
**Verified:** 2026-09-21T17:05:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | SC1 — Admin creates an SEO+GEO article (focus keyword, key takeaways, entities, FAQ Q&A), publishes it, and the public page embeds FAQPage JSON-LD | ✓ VERIFIED | Editor payload includes focusKeyword/keyTakeaways/entities/faqSchema (page.tsx:2110–2117); API persists them (articles/route.ts:130–133); `buildFaqPageSchema` + guarded third `application/ld+json` script wired (page.tsx:183,190–192); faq-jsonld tests pass |
| 2   | SC2 — Reopen a published article, change fields, save: no empty editor, no silent 401 | ✓ VERIFIED | Authoritative load via `cmsFetch` with `didLoadRef`; `loadError` renders inline panel before the form (page.tsx:1931–1948, 2187–2201); save POST/PUT via `cmsFetch` (2119–2124); `articles-edit-roundtrip.test.ts` green |
| 3   | SC3a — Editor/author sees only their own articles | ✓ VERIFIED | `filter = user.role === 'admin' ? {} : { author_id: user.userId.toString() }` (articles/route.ts:7); `articles-list-scoping.test.ts` (4 tests) green |
| 4   | SC3b — Editor/author 403 on affiliate-link management; can GET to select-to-attach | ✓ VERIFIED | POST/PUT/DELETE guard `if (!user || user.role !== 'admin') 403` (affiliate-links/route.ts:48–54, [id]/route.ts:12–18,82–88); `cms-rbac-affiliate-403.test.ts` (11 tests) green |
| 5   | SC3c — Placements at top/middle/footer render in order on the public page | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED / partial | `sortPlacementsByPosition` is unit-tested and wired (page.tsx:99), but `verdictPlacement = placements[0]` always consumes top_cta (WR-02); intended render order not exercised by any test — see Human Verification |
| 6   | SC4a — Admin manages users (role, status, name, avatar) via the CMS | ✗ FAILED | API PUT correct (users/[id]/route.ts:22–46) and tested, but the Edit modal lives inside BlacklistView while its trigger is in UsersView → Edit opens nothing (CR-02) |
| 7   | SC4b — Admin manages the two-level taxonomy (categories + sub-categories) in the CMS | ✗ FAILED | Seed + categories GET + top-level CRUD work; sub-category create/update broken by `Number(subCatParentId)` → NaN/null (CR-04; page.tsx:1126) |
| 8   | SC5 — Paste a Google Sheet URL: import with root domains extracted; matching active campaigns deactivated by the retroactive sweeper | ✓ VERIFIED | `import-sheet-url` persists rows, extracts root domains, schedules `sweepDomains` post-response (route.ts:101–131); boundary-safe batch sweep + restore (`blacklist.ts:142–249`); `blacklist-import-async` + `blacklist-sweep` tests green |
| 9   | Goal "correct RBAC" — non-admins cannot mass-deactivate campaigns through blacklist writes | ✗ FAILED | `POST /api/v1/cms/blacklist` has no role guard (route.ts:37–42) unlike every sibling write; editor/author can blacklist a domain and globally sweep campaigns (CR-03) |
| 10  | Blacklist pre-check warns before saving a blacklisted affiliate URL | ✗ FAILED | `handleCheckAffUrl` calls `blacklist/check` without a bearer token → always 401 → warning silently cleared (CR-01; page.tsx:517–544) |

**Score:** 5/10 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/lib/auth.ts` | Async DB-backed guard | ✓ VERIFIED | Async, ObjectId pre-check, live status gate (58–81); all 27 routes awaited (source-contract test green) |
| 27 route files under `src/app/api/v1/**` | `await getAuthUser(req)` | ✓ VERIFIED | `cms-auth-inactive.test.ts` source-contract walk passes |
| `src/lib/faq-jsonld.ts` | FAQPage builder | ✓ VERIFIED | Pure builder, filters incomplete pairs, returns null on empty; unit-tested |
| `src/lib/placement-order.ts` | Canonical stable sort | ✓ VERIFIED | `ORDERED_POSITION_LABELS`/`positionRank`/`sortPlacementsByPosition`; unit-tested |
| `src/lib/cms-fetch.ts` | Shared bearer helper | ✓ VERIFIED | Bearer attach, envelope normalization, never throws on HTTP error; 15 tests |
| `src/lib/seed-taxonomy.ts` + `scripts/seed-taxonomy.ts` | Idempotent V5.2 tree seed | ✓ VERIFIED | Exact 6 categories + 5 AI-Use-Cases children; find-by-slug/create-only; unit-tested |
| `src/lib/blacklist.ts` | Batch sweep + restore + wrapper | ✓ VERIFIED | Boundary-safe matcher, updateMany per domain; `sweepRetroactiveBlacklist` wrapper preserved |
| `src/lib/schedule-after-response.ts` | `after()` + fallback | ✓ VERIFIED | Present; E468 fallback |
| `src/app/api/v1/cms/blacklist/re-sweep/route.ts` | Admin-only sweep+restore | ✓ VERIFIED | Combined sibling guard; registered in 401 inventory (cms-auth-401.test.ts:185) |
| `src/app/admin/page.tsx` | Consolidated editor + tabs + modals | ⚠️ PARTIAL | Editor/blacklist/re-sweep/user-API wiring good; Edit-user modal misplaced; sub-category coercion bug |
| `src/app/article/[slug]/page.tsx` | FAQPage emission + placement order | ⚠️ PARTIAL | FAQPage ✓; placement sort wired but verdict-by-index deviation |
| `src/app/admin/articles/create/page.tsx` + `.../edit/[id]/page.tsx` | Deleted | ✓ VERIFIED | Both absent; `admin-route-absence.test.ts` green |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| Editor save handler | `/api/v1/cms/articles[/id]` | `cmsFetch` (POST/PUT) | ✓ WIRED | Headers attach bearer; non-2xx → toast (page.tsx:2119–2135) |
| `doc.faq_schema` | third `application/ld+json` | `buildFaqPageSchema` → `serializeJsonLd` | ✓ WIRED | page.tsx:183, 190–192 |
| `doc.faq_schema` | public DOM render | RSC render | ? UNCERTAIN | Not exercised by node-env suite → human |
| `articlesList` row → Editor | `?edit=<id>` restore effect → authoritative `cmsFetch` GET | ✓ WIRED | page.tsx:427–459, 1931–1994 |
| Taxonomy seed | `GET /cms/categories` → CategoriesView → editor selects | ✓ WIRED | `categories-taxonomy.test.ts` green |
| Sheet import | `scheduleAfterResponse(() => sweepDomains(...))` | ✓ WIRED | route.ts:129–131 |
| Users-tab Edit button | Edit-user modal | ✗ NOT_WIRED | Modal nested in BlacklistView (CR-02) |
| `handleCheckAffUrl` | `/cms/blacklist/check` | raw `fetch` w/o bearer | ✗ NOT_WIRED | Always 401 → warn cleared (CR-01) |
| Sub-category form | `/cms/sub-categories` write | `Number(ObjectId)` → null | ✗ NOT_WIRED | Create 400 / update 500 (CR-04) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `article/[slug]/page.tsx` | `faqPageSchema` | `doc.faq_schema` via Mongo query populates | Yes | ✓ FLOWING |
| `article/[slug]/page.tsx` | `placements` | populated `affiliate_placements` | Yes | ✓ FLOWING (order semantics deviation) |
| `admin/page.tsx` article editor | form fields | authoritative `cmsFetch` GET | Yes | ✓ FLOWING |
| `admin/page.tsx` Users edit modal | `editingUser` | row data from `UsersView` | N/A | ✗ HOLLOW_PROP (modal host not mounted) |
| `admin/page.tsx` sub-category form | `categoryId` | `Number(ObjectId)` → NaN/null | No | ✗ DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full suite green | `npx vitest run` | 30 files / 278 tests passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| FAQPage builder + placement order | `npx vitest run tests/lib/faq-jsonld.test.ts tests/lib/placement-order.test.ts` | passed | ✓ PASS |
| RBAC + scoping + user update | `npx vitest run tests/api/cms-users-update.test.ts tests/api/cms-rbac-affiliate-403.test.ts tests/api/articles-list-scoping.test.ts` | passed | ✓ PASS |
| Seed + sweep + import | `npx vitest run tests/lib/seed-taxonomy.test.ts tests/lib/blacklist-sweep.test.ts tests/api/blacklist-import-async.test.ts` | passed | ✓ PASS |
| Orphan routes absent | `Test-Path` on both deleted pages | False / False | ✓ PASS |
| Re-sweep registered in 401 gate | grep `cms-auth-401.test.ts` | line 185 present | ✓ PASS |
| Sub-category ObjectId coercion | `node -e "Number('507f1f77bcf86cd799439011')"` | `NaN` → JSON `null` | ✗ FAIL (confirms CR-04) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| CMS-01 | 02-03 | Article CRUD & publishing CRUD round trip | ✓ SATISFIED | `articles-edit-roundtrip.test.ts`; GEO fields persist |
| CMS-02 | 02-02, 02-06 | SEO/GEO fields + FAQPage JSON-LD | ✓ SATISFIED | Builder + wired script + tests; browser render pending |
| CMS-03 | 02-02 | Multi-position placements rendered in order | ⚠️ PARTIAL | Helper verified; verdict-by-index deviation (WR-02) |
| CMS-04 | 02-06 | Two-level taxonomy manageable in CMS | ✗ BLOCKED | Seed/categories GET ✓; sub-category create/update broken (CR-04) |
| CMS-05 | 02-03 | One consolidated editor flow, no dead-end routes | ✓ SATISFIED | Orphan routes deleted + absence test |
| AUTH-02 | 02-05 | Article data isolation | ✓ SATISFIED | List scoping test |
| AUTH-03 | 02-05 | Affiliate link store admin-only | ✓ SATISFIED | Affiliate 403 test (11 cases) |
| AUTH-04 | 02-01, 02-05 | Admin user management | ⚠️ PARTIAL | Guard + PUT API ✓; edit modal unreachable (CR-02) |
| AFF-04 | 02-04 | Blacklist bulk import + retroactive sweeper | ✓ SATISFIED | Import/sweep/restore tests green (sibling POST guard gap = CR-03) |

All 9 phase requirement IDs appear in PLAN frontmatter and are accounted for above. No orphaned requirements. Note: `REQUIREMENTS.md` traceability still lists **CMS-04 as Pending** while plan 02-06 claims it — a documentation drift to reconcile (CMS-04 is in fact partial).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `src/app/admin/page.tsx` | 1126 | `Number(subCatParentId)` on an ObjectId | 🛑 Blocker | Sub-category create/update broken (CR-04) |
| `src/app/admin/page.tsx` | 3241 | Edit-user modal outside its trigger's view | 🛑 Blocker | Users edit flow dead (CR-02) |
| `src/app/api/v1/cms/blacklist/route.ts` | 37–42 | POST missing role guard | 🛑 Blocker | Non-admin can mass-deactivate campaigns (CR-03) |
| `src/app/admin/page.tsx` | 517–544 | Blacklist pre-check w/o bearer token | 🛑 Blocker | Security pre-check silently disabled (CR-01) |
| `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts` | 141 | `error.message` returned to client | ⚠️ Warning | Internal error detail leak (WR-04) |
| `src/lib/blacklist.ts` | 191–194, 226–229 | Sweep/restore swallow errors → fake success | ⚠️ Warning | Re-sweep can report success on DB failure (WR-09) |
| `src/lib/blacklist.ts` | 94 | `exact_url` uses `startsWith` | ⚠️ Warning | Over-blocks prefix-sharing URLs (WR-05) |
| `src/lib/auth.ts` | 80 | Returns token-baked role, not live DB role | ⚠️ Warning | Demoted admin keeps rights ≤24h (WR-01) |
| `src/app/article/[slug]/page.tsx` | 85–86 | Non-atomic `view_count += 1; save()` | ⚠️ Warning | Lost increments / clobber (WR-03; PERF-02, Phase 3) |
| `src/app/admin/page.tsx` | 679–720 | Dead `handleBatchImportGoogleSheet` w/ stale contract | ℹ️ Info | Dead code (IN-02) |

No unresolved `TBD`/`FIXME`/`XXX` debt markers were found in phase-modified files (only HTML `placeholder=` attributes matched a naive scan).

### Human Verification Required

1. **End-to-end publish + FAQPage JSON-LD render** — Create and publish an article with FAQ pairs; view the public page and confirm the third `ld+json` block is `@type: FAQPage` and placements render at the intended positions. Expected: content + JSON-LD present; top_cta at top. Why human: RSC render not exercised by the node-env suite.

2. **Edit loop UX (session-expired toast / no blank editor)** — Reopen a published article, clear the token, trigger load/save. Expected: session-expired toast + Sign in, never a blank editor. Why human: browser-only state.

3. **Editor RBAC + permission panel** — Log in as editor; confirm no admin tabs, `?tab=users` shows the access-denied panel. Expected: "You don't have access to this section." with Back to Articles. Why human: rendered DOM.

4. **Blacklist import + Re-sweep UI** — Paste a sheet, click Re-sweep, confirm a manually-inactive campaign stays inactive and chips are distinct. Expected: eventual-count notice + swept/restored toast. Why human: spinner/toast presentation.

### Gaps Summary

The phase's core plumbing is genuinely strong and the automated suite (30 files / 278 tests) is green: the async DB-backed guard, editor consolidation, shared auth-fetch helper, FAQPage JSON-LD, canonical placement sort, idempotent taxonomy seed, bounded RBAC route enforcement, and the background batched blacklist sweep/restore are all present, wired, and tested. 5 of 10 must-have truths are fully verified.

However the phase goal — "one coherent CMS flow … correct RBAC … taxonomy and user management" — is **not achieved** because four defects block it:

- **CR-02** (SC4/AUTH-04): the new Edit-user modal is nested in the wrong view, so the user-management UI is dead despite a correct, tested API.
- **CR-04** (SC4/CMS-04): sub-category create/update is broken by an ObjectId→Number coercion, so the two-level taxonomy cannot be managed from the CMS.
- **CR-03** (goal RBAC/AFF-04): the manual blacklist POST has no role guard, letting any authenticated user mass-deactivate campaigns site-wide.
- **CR-01** (SC3/AFF-03): the affiliate-link blacklist pre-check lost its token when the route gained auth, silently disabling the interceptor and allowing blacklisted URLs to be saved.

These are recorded deficiencies confirmed directly in the shipped code (not merely echoed from `02-REVIEW.md`), each with an observable, reproducible failure path. The phase should not proceed until they are fixed; the remaining partial (WR-02 placement/verdict semantics) should be resolved or explicitly accepted at the same time.

---

_Verified: 2026-09-21T17:05:00Z_
_Verifier: the agent (gsd-verifier)_
