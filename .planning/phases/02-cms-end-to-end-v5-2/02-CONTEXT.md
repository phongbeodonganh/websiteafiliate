# Phase 2: CMS End-to-End (V5.2) - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the admin CMS flow correct and coherent per the governing V5.2 spec: one working create→edit→publish article loop (consolidating three overlapping editors), correct RBAC enforcement, two-level taxonomy and user management, and the blacklist bulk import with a retroactive sweeper. Requirements in scope: CMS-01, CMS-02, CMS-03, CMS-04, CMS-05, AUTH-02, AUTH-03, AUTH-04, AFF-04 (per ROADMAP Phase 2). This phase repairs and consolidates an already-deployed brownfield CMS — it does not redesign auth storage (JWT stays in localStorage per Phase 1 D-15) and does not touch the public presentation layer (that is Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Editor Consolidation (CMS-01, CMS-05)
- **D-01:** The main admin tab (`src/app/admin/page.tsx`) is the single canonical article create/edit/publish flow. It already works and is wired into URL state.
- **D-02:** Delete both orphaned editor pages in this phase: `src/app/admin/articles/create/page.tsx` (828 lines) and `src/app/admin/articles/edit/[id]/page.tsx` (broken — fetches without an Authorization header, silently 401s, renders an empty editor). Satisfies CMS-05 "no dead-end admin routes." — **Reversibility:** reversible — files are recoverable from git history and no external contract points at these internal admin URLs.
- **D-03:** Centralize CMS auth fetching in the main admin tab behind one shared fetch helper that always attaches the `Authorization: Bearer` token, and surface a visible error toast on any non-2xx response instead of rendering an empty editor. This structurally prevents the exact silent-401 failure the deleted edit page had.
- **D-04:** Success criterion #2 (reopen any published article, change fields, save) is satisfied through the main tab's edit flow. The edit flow must be proven end-to-end, not just assumed: load an existing published article into the editor, mutate fields, save, and reload showing the mutations.

### Blacklist Sweep Execution Model (AFF-04)
- **D-05:** The retroactive sweeper must NOT run synchronously per-domain inside the `import-sheet-url` request. Import rows are saved and the response returns immediately with the imported/swept counts; the sweep runs after the response via Next's `after()` (or documented fire-and-forget) so a 300-row paste does not block on 300+ sequential DB writes. — **Reversibility:** costly — moving sweep execution off-request changes the response contract (`totalSweptCampaigns` becomes eventual, not final); reverting means re-deriving where callers depend on the synchronous count.
- **D-06:** Batch the sweep's own writes — one `updateMany` per domain instead of per-link `save()` in a loop. Matched `base_url` documents move to `status: 'blacklisted'` (the `AffiliateLink` enum already carries this value).
- **D-07:** Campaign status semantics: a swept campaign becomes `'blacklisted'`, kept distinct from the manually-set `'inactive'`. Reversible by design — a restore sweep can flip `'blacklisted'` back to `'active'` while never touching manually-deactivated `'inactive'` campaigns.
- **D-08:** Add a manual "Re-sweep" admin action (on blacklist import/management) that re-runs the sweep across current blacklist entries AND restores campaigns no longer matching any active blacklist entry back to `'active'` (only those currently `'blacklisted'`). Closes the reversibility loop without a separate phase.

### GEO Fields & Taxonomy (CMS-02, CMS-04)
- **D-09:** GEO fields are all optional. Only `title`, `slug`, `content` are required to save; `status` must be set. `focus_keyword`, `key_takeaways`, `entities`, `faq_schema` are optional but surfaced prominently in the editor. Matches the existing schema (none of these are required) and existing AI-generated drafts.
- **D-10:** Add a repeating FAQ Q&A row editor (add/remove rows) in the main admin tab, storing to `faq_schema` as `{question, answer}` objects. The public article page already renders these as FAQPage JSON-LD — no new public-side work.
- **D-11:** Seed the spec's exact two-level taxonomy via an idempotent script in `scripts/` (upsert by slug): the 6 top-level AI categories including `AI Use Cases` (`ai-use-cases`) with its 5 sub-categories, plus the standalone categories (`AI Content & Copywriting`, `AI Video & Image Generation`, `AI Automation & Agents`, `AI Marketing & Sales`, `AI Audio & Code`) per V5.2 §1.2. Gives the CMS a working taxonomy on day one.
- **D-12:** In the article editor, a top-level category is required; sub-category is optional and filtered to the chosen category's children. Prevents mismatched category/sub-category pairs.

### RBAC Enforcement Surface (AUTH-02, AUTH-03, AUTH-04)
- **D-13:** Hide admin-only CMS tabs (Affiliate Links, Users, Taxonomy, Blacklist, Settings) from editor/author accounts in the UI, AND keep every backing route's 403 enforcement (defense in depth). Admin sees all tabs. Matches the spec RBAC table ("Ẩn hoàn toàn" for affiliate links).
- **D-14:** User management covers `role` (admin/editor/author), `status` (active/inactive), `name`, and `avatar` only — per AUTH-04 / spec §1.1. NO password set/reset in the CMS; password recovery stays CLI-only per Phase 1 D-04 (`scripts/reset-admin.ts`).
- **D-15:** `status: 'inactive'` is enforced at runtime: `getAuthUser` (`src/lib/auth.ts`) rejects tokens belonging to inactive users on the next request, alongside the existing token-blacklist check. A deactivated account is locked out immediately rather than at the 24h token expiry. Benefits every CMS route at once.
- **D-16:** Article ownership behavior stays as-is (non-admin lists/edits scoped to `author_id`; admin sees all). Pin it with regression tests: cross-author edit returns 403; editor/author hitting affiliate-link management returns 403.

### the agent's Discretion
- Exact shape/signature of the shared auth fetch helper and the error-toast mechanism in the main admin tab.
- How the background sweep is triggered (`after()` vs. a documented fire-and-forget helper) as long as it does not block the import response and surfaces its eventual counts.
- Exact `updateMany` batching strategy per domain.
- The seed script's file name and CLI entry conventions (follow the `scripts/seed-*.ts` precedent).
- Whether the re-sweep action is a button on the import panel or the blacklist tab, and how restore counts are reported.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Governing spec (V5.2)
- `specv2.md` §1.1 — `users` collection fields (role/status/name/avatar) — AUTH-04
- `specv2.md` §1.2 — two-level AI-niche taxonomy tree to seed — CMS-04
- `specv2.md` §1.3 — `articles` collection: GEO fields + `affiliate_placements` position labels — CMS-01/CMS-02/CMS-03
- `specv2.md` §1.4, §1.5 — affiliate link store + multi-position article relations — CMS-03/AUTH-03
- `specv2.md` §1.8 — `blacklists` schema
- `specv2.md` §1.9 — Google Sheet import behavior + Retroactive Sweeper Integration — AFF-04
- `specv2.md` §4 — RBAC permission matrix (article ownership, affiliate link 403, reports scoping) — AUTH-02/AUTH-03

### Project contracts
- `.planning/PROJECT.md` — Target Runtime; Constraints (esp. #2 Next.js 16 contract, #5 model registration, #6 sanitization gate); D-003 aidealsuk.com brand overrides spec branding
- `.planning/REQUIREMENTS.md` — CMS-01..05, AUTH-02..04, AFF-04 definitions + statuses
- `.planning/ROADMAP.md` — Phase 2 goal + 5 success criteria

### Known defects driving this phase
- `.planning/codebase/CONCERNS.md` — Known Bugs #1 (broken edit page silent 401s), Tech Debt #1 (4,097-line single-file admin), Tech Debt #2 (three overlapping editors), Tech Debt #6 (hardcoded sheet URL in admin state)
- `GO_LIVE_TASKLIST.md` — project audit context

### Framework contract (breaking changes — NOT training-data Next.js)
- `AGENTS.md` — read bundled Next docs before writing code; `proxy.ts` replaces `middleware.ts`; `params`/`searchParams` are Promises; `next lint` is gone
- `node_modules/next/dist/docs/` — authoritative Next.js 16.2.12 API docs (esp. `after()` for post-response work)

### Existing map docs (evidence base)
- `.planning/codebase/ARCHITECTURE.md` — Admin Write Path, route groups, auth flow, admin monolith anti-pattern
- `.planning/codebase/STRUCTURE.md` — where to add endpoints/models/tests; admin file layout
- `.planning/codebase/CONVENTIONS.md` — response envelope, error handling, snake_case↔camelCase mapping, kebab-case lib naming

### Phase 1 locked decisions (carry forward)
- `.planning/phases/01-security-remediation/01-CONTEXT.md` — D-04 (CLI-only password recovery), D-15 (JWT stays in localStorage), AUTH-01 canonical guard done

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth.ts` `getAuthUser(req)` — canonical guard; D-15 extends it with the inactive-user check
- `src/lib/blacklist.ts` `extractDomainFromUrl()` + `sweepRetroactiveBlacklist()` — sweep exists; D-05/D-06 change execution + batching, D-07 changes target status, D-08 adds restore
- `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts` — working Google Sheet→CSV import; rework the sweep call site
- `src/lib/db/models.ts` — `ArticleModel` already has `focus_keyword`, `key_takeaways`, `entities`, `faq_schema`, `affiliate_placements`; `AffiliateLinkModel.status` enum already includes `'blacklisted'`; `CategoryModel`/`SubCategoryModel` for taxonomy
- `src/components/admin/RichTextEditor.tsx` — Tiptap editor used by the admin
- `tests/` Vitest + `mongodb-memory-server` suite — extend with RBAC regression tests (ownership 403, affiliate-link 403, inactive-user 401)
- `scripts/` CLI precedent (`create-admin.ts`/`reset-admin.ts`, existing seed scripts) — model for the taxonomy seed script

### Established Patterns
- API response envelope `{ status: 'success'|'error', data?, message? }`; guard clauses return early (401/403/400/404/429/500)
- snake_case DB fields → camelCase API mapping done manually in handlers
- Lazy env getters that throw descriptive errors on first use
- CMS writers call `revalidatePublicArticles()` from `src/lib/cache-revalidation.ts` after mutating published articles
- Admin pages are all `'use client'` and call the REST API with Bearer tokens; public pages read the DB server-side

### Integration Points
- `src/app/admin/page.tsx` — the canonical admin shell housing all tabs; D-01/D-03/D-10/D-13 modify it
- `src/app/api/v1/cms/articles/route.ts` + `[id]/route.ts` — ownership/RBAC already enforced here (AUTH-02)
- `src/app/api/v1/cms/affiliate-links/**` — already 403 for non-admin (AUTH-03); keep + test
- `src/app/api/v1/cms/users/**` — user CRUD for AUTH-04 (role/status/name/avatar only)
- `src/app/api/v1/cms/categories/**` + `sub-categories/**` — taxonomy management (CMS-04)
- `src/app/article/[slug]/page.tsx` — already renders FAQPage JSON-LD from `faq_schema`; no public-side change needed for CMS-02
- `src/lib/cache-revalidation.ts` — call after article/taxonomy mutations

</code_context>

<specifics>
## Specific Ideas

No particular "I want it like X" references. Notable user emphasis: eliminate the editor multiplicity completely rather than maintaining parallel paths; make the blacklist import responsive for large sheets (300+ rows) without losing sweep correctness; keep password handling CLI-only (consistent with Phase 1); and enforce RBAC in the UI as well as the API for defense in depth.

</specifics>

<deferred>
## Deferred Ideas

- Password set/reset inside the CMS users tab — deliberately excluded; password recovery is CLI-only per Phase 1 D-04. Redundant to iterate on.
- Full modularization of the 4,097-line `src/app/admin/page.tsx` into per-tab modules — that is HYG-02, Phase 5. This phase touches the file for targeted changes only.
- `favicon`/icon and repo-root cleanup, unused deps (`drizzle-orm`, `pg`, `@google/genai`), dead components — HYG-01, Phase 5.
- Public presentation / Bento redesign — PUB-02, Phase 4.

</deferred>

---

*Phase: 2-CMS End-to-End (V5.2)*
*Context gathered: 2026-09-20*
