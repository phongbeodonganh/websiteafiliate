# Phase 2: CMS End-to-End (V5.2) - Research

**Researched:** 2026-09-20
**Domain:** Brownfield Next.js 16.2.12 App Router CMS repair — editor consolidation, RBAC, GEO fields, two-level taxonomy, blacklist bulk import + background sweeper
**Confidence:** HIGH (code verified by direct file reads this session; two upstream-contract contradictions surfaced)

## Summary

Phase 2 repairs an already-deployed admin CMS. The codebase was read directly this session (not inferred from training data), so the stack, patterns, and enforcement surfaces are known with high confidence. Most of the phase is *verification + targeted repair* — ownership scoping, affiliate-link 403s, category/sub-category CRUD, and the blacklist import all already exist and work. The genuinely new work is narrow: consolidate three editors into one, background+batch the sweeper, add a restore sweep (Re-sweep), seed the spec taxonomy, make the CMS user-edit flow real, and add a shared auth-fetch/toast helper.

**Two findings contradict the upstream contract and MUST reach the planner:**

1. **FAQPage JSON-LD does not exist anywhere in the codebase.** CONTEXT.md D-10, the UI-SPEC scope note, and requirement CMS-02 all assert the public article page "already renders these as FAQPage JSON-LD — no new public-side work." That is factually wrong: `src/app/article/[slug]/page.tsx` emits only `NewsArticle` and `BreadcrumbList` schema. Success criterion #1 explicitly requires "the public article page renders the content with FAQPage JSON-LD embedded," so this phase **must add public-side work** that D-10 declared out of scope. The `faq_schema` data is stored and round-tripped correctly; only the render is missing.

2. **D-15 (reject inactive users in `getAuthUser`) requires converting `getAuthUser` from sync to async**, which mechanically touches all **30 call sites across 22 route files** plus existing tests. Today `getAuthUser` is synchronous with zero DB access. Checking `user.status` needs a Mongoose read, so the signature becomes `Promise<AuthPayload | null>`. This is a security-critical, cross-cutting change — not a one-line edit — and it breaks at least one existing assertion unless handled deliberately.

A third, softer finding: Next's `after()` **throws** (`E468`) when called outside a request scope, which is exactly the situation in Vitest route-handler tests. Any test that exercises the import path successfully will throw unless `after()` is wrapped or the sweep is tested as a pure function.

**Primary recommendation:** Plan CMS-01/05 (editor consolidation) and AFF-04 (sweep backgrounding + batching + restore) as the substantive workstreams; treat CMS-02's FAQPage JSON-LD as a *required addition* to the public page, not a verification; and sequence D-15's async conversion as its own tightly-scoped plan with the 401-gate test updated in the same commit.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Editor Consolidation (CMS-01, CMS-05)**
- **D-01:** The main admin tab (`src/app/admin/page.tsx`) is the single canonical article create/edit/publish flow. It already works and is wired into URL state.
- **D-02:** Delete both orphaned editor pages in this phase: `src/app/admin/articles/create/page.tsx` (828 lines) and `src/app/admin/articles/edit/[id]/page.tsx` (broken — fetches without an Authorization header, silently 401s, renders an empty editor). Satisfies CMS-05 "no dead-end admin routes." — **Reversibility:** reversible — files are recoverable from git history and no external contract points at these internal admin URLs.
- **D-03:** Centralize CMS auth fetching in the main admin tab behind one shared fetch helper that always attaches the `Authorization: Bearer` token, and surface a visible error toast on any non-2xx response instead of rendering an empty editor. This structurally prevents the exact silent-401 failure the deleted edit page had.
- **D-04:** Success criterion #2 (reopen any published article, change fields, save) is satisfied through the main tab's edit flow. The edit flow must be proven end-to-end, not just assumed: load an existing published article into the editor, mutate fields, save, and reload showing the mutations.

**Blacklist Sweep Execution Model (AFF-04)**
- **D-05:** The retroactive sweeper must NOT run synchronously per-domain inside the `import-sheet-url` request. Import rows are saved and the response returns immediately with the imported/swept counts; the sweep runs after the response via Next's `after()` (or documented fire-and-forget) so a 300-row paste does not block on 300+ sequential DB writes. — **Reversibility:** costly — moving sweep execution off-request changes the response contract (`totalSweptCampaigns` becomes eventual, not final); reverting means re-deriving where callers depend on the synchronous count.
- **D-06:** Batch the sweep's own writes — one `updateMany` per domain instead of per-link `save()` in a loop. Matched `base_url` documents move to `status: 'blacklisted'` (the `AffiliateLink` enum already carries this value).
- **D-07:** Campaign status semantics: a swept campaign becomes `'blacklisted'`, kept distinct from the manually-set `'inactive'`. Reversible by design — a restore sweep can flip `'blacklisted'` back to `'active'` while never touching manually-deactivated `'inactive'` campaigns.
- **D-08:** Add a manual "Re-sweep" admin action (on blacklist import/management) that re-runs the sweep across current blacklist entries AND restores campaigns no longer matching any active blacklist entry back to `'active'` (only those currently `'blacklisted'`). Closes the reversibility loop without a separate phase.

**GEO Fields & Taxonomy (CMS-02, CMS-04)**
- **D-09:** GEO fields are all optional. Only `title`, `slug`, `content` are required to save; `status` must be set. `focus_keyword`, `key_takeaways`, `entities`, `faq_schema` are optional but surfaced prominently in the editor. Matches the existing schema (none of these are required) and existing AI-generated drafts.
- **D-10:** Add a repeating FAQ Q&A row editor (add/remove rows) in the main admin tab, storing to `faq_schema` as `{question, answer}` objects. The public article page already renders these as FAQPage JSON-LD — no new public-side work.
- **D-11:** Seed the spec's exact two-level taxonomy via an idempotent script in `scripts/` (upsert by slug): the 6 top-level AI categories including `AI Use Cases` (`ai-use-cases`) with its 5 sub-categories, plus the standalone categories (`AI Content & Copywriting`, `AI Video & Image Generation`, `AI Automation & Agents`, `AI Marketing & Sales`, `AI Audio & Code`) per V5.2 §1.2. Gives the CMS a working taxonomy on day one.
- **D-12:** In the article editor, a top-level category is required; sub-category is optional and filtered to the chosen category's children. Prevents mismatched category/sub-category pairs.

**RBAC Enforcement Surface (AUTH-02, AUTH-03, AUTH-04)**
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

### Deferred Ideas (OUT OF SCOPE)
- Password set/reset inside the CMS users tab — deliberately excluded; password recovery is CLI-only per Phase 1 D-04. Redundant to iterate on.
- Full modularization of the 4,097-line `src/app/admin/page.tsx` into per-tab modules — that is HYG-02, Phase 5. This phase touches the file for targeted changes only.
- `favicon`/icon and repo-root cleanup, unused deps (`drizzle-orm`, `pg`, `@google/genai`), dead components — HYG-01, Phase 5.
- Public presentation / Bento redesign — PUB-02, Phase 4.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMS-01 | Article CRUD & publishing with title, unique slug, excerpt, rich-text HTML, thumbnail, draft/published, featured | Works in main tab; slugs auto-deduped in POST (route.ts:103-107); canonical flow confirmed D-01. Delete 2 orphan editors (D-02). |
| CMS-02 | SEO/GEO fields (`focus_keyword`, `key_takeaways`, `entities`, `faq_schema`); FAQ pairs auto-embed as FAQPage JSON-LD | Fields + API round-trip exist and verified. **FAQPage JSON-LD render is MISSING on the public page** — must be added (contradicts D-10). |
| CMS-03 | Multi-position affiliate placements `top_cta`/`middle_comparison`/`footer_banner`, rendered data-driven | Placement toggle UI exists (page.tsx:1942-1953, 2297-2345); public page renders `placements[0]` as EditorVerdict and `slice(1)` as CTAs; `AffiliateCtaBlock` maps all three labels. Order is *not* position-sorted — see Pitfall 6. |
| CMS-04 | Two-level AI-niche taxonomy per V5.2 §1.2, manageable in CMS, assignable | Category/sub-category CRUD + admin tab already exist (routes verified). Gap = seed script (D-11) + editor filtering (D-12, already present at page.tsx:2233-2262). |
| CMS-05 | One consolidated editor flow; no dead-end admin routes | Main tab canonical (D-01); two orphan files exist and are unlinked (zero `/admin/articles/{create,edit}` references in src). Delete both (D-02). |
| AUTH-02 | Article data isolation — non-admin scoped to `author_id`; admin sees all | Already enforced AND tested. List filter at articles/route.ts:18; PUT/DELETE ownership at [id]/route.ts:31-36, 92-97, 179-184. Extend tests to GET list scoping. |
| AUTH-03 | Affiliate link store admin-only (403 for editor/author) | Already enforced at affiliate-links/route.ts:49-54 and [id]/route.ts:13-18. Gap = add explicit regression test (no dedicated test today). |
| AUTH-04 | Admin manages `role`/`status`/`name`/`avatar` | API exists but **`avatar` is not updatable** (PUT destructures only `{name, role, status, password}` — users/[id]/route.ts:18); **no edit-user modal exists in the admin UI** (Edit button at page.tsx:1477 has no handler). PUT also still accepts `password` contrary to D-14. |
| AFF-04 | Bulk import + retroactive sweeper (background, batched, reversible) | Import works; sweep runs sum of 4 routes. Must batch (D-06), background (D-05), add restore (D-08). Sweep currently uses per-link `.save()` (blacklist.ts:154-158) and substring regex matching (false-positive risk). |
</phase_requirements>

## Critical Contradictions With Upstream Contract

> These change what the planner must build. Both were verified by reading the source-of-truth files this session.

### C-1: FAQPage JSON-LD is absent from the public article page (contradicts D-10 / UI-SPEC / CMS-02)

CONTEXT.md D-10 states: *"The public article page already renders these as FAQPage JSON-LD - no new public-side work."* The UI-SPEC repeats it (line 15) and even hardcodes empty-state copy referencing it (line 183). CMS-02 in REQUIREMENTS.md says *"FAQ pairs auto-embed as FAQPage JSON-LD on the public page."*

**Verified reality:** `src/app/article/[slug]/page.tsx` emits exactly two JSON-LD blocks, and neither is FAQPage:

```tsx
// src/app/article/[slug]/page.tsx:149-157
const articleSchema = {
  '@context': 'https://schema.org', '@type': 'NewsArticle', headline: doc.title,
  description: doc.meta_description || doc.excerpt || doc.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
  ...(doc.thumbnail_url ? { image: [doc.thumbnail_url] } : {}), datePublished: doc.created_at,
  dateModified: doc.updated_at || doc.created_at,
  ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}),
  mainEntityOfPage: `${normalizeSiteUrl(settings?.canonicalUrl)}/article/${doc.slug}`,
  publisher: { '@type': 'Organization', name: settings?.site_title || 'AIDEALSUK' },
};
```
```tsx
// src/app/article/[slug]/page.tsx:167-176
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbItems.map((item, index) => ({ ... })),
};
```
`[VERIFIED: src/app/article/[slug]/page.tsx:149-182 — read this session]`

A repo-wide grep for `FAQPage` across all `.ts/.tsx` under `src/` returns **zero matches**; the only `FAQPage` occurrences in the repo are in planning/spec docs (`specv2.md`, `.planning/**`). `faq_schema` in source appears only in the model, the CMS API mappers, the admin editor state, and Gemini prompt/schema — never in a public render path. `[VERIFIED: exhaustive grep of src/ this session]`

**Consequence:** Success criterion #1 ("the public article page renders the content with FAQPage JSON-LD embedded") is currently **false**, and the phase must add the render. The `faq_schema` data pipeline is intact, so the addition is localized: build a `FAQPage` JSON-LD object from `doc.faq_schema` in `src/app/article/[slug]/page.tsx` and emit it via the existing `serializeJsonLd()` helper in a third `<script type="application/ld+json">`. Keep the `mainEntity` shape (`Question` → `acceptedAnswer`/`Answer`) and skip/quarantine incomplete pairs consistently with the editor's drop-incomplete rule (D-10).

**Planner action:** Do NOT treat CMS-02 as verify-only. Add an explicit task for public-side FAQPage JSON-LD. Optionally note the UI-SPEC's empty-state copy still reads correctly (it references structured data which will now actually exist).

### C-2: D-15 needs `getAuthUser` to become async — a 30-call-site change

Today the canonical guard is synchronous and does no DB work:

```ts
// src/lib/auth.ts:47-55
// Lấy thông tin user đăng nhập từ Request Header
export function getAuthUser(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}
```
`[VERIFIED: src/lib/auth.ts:47-55 — read this session]`

`verifyToken` is also sync (auth.ts:38-45) and returns the JWT payload — which contains only `userId`, `username`, `role` (`AuthPayload`, auth.ts:16-20), **not** `status`. To reject inactive users, `getAuthUser` must look up the `User` document, which requires an `await`'d Mongoose query. Therefore:

- Signature changes: `getAuthUser(req): AuthPayload | null` → `async getAuthUser(req): Promise<AuthPayload | null>`.
- Every call site must `await`. There are **30 `getAuthUser(` call sites across 22 files** (every `src/app/api/v1/cms/**` route + `auth/me`, `auth/logout`, plus the definition itself). `[VERIFIED: grep of src/ this session — 30 sites, 22 files]`
- Tests that invoke handlers directly still work (handlers are already `async`), but one existing assertion is at risk: `tests/api/cms-auth-401.test.ts:447-465` builds a *fresh, unblacklisted* token with `userId: 4` that **does not exist in the DB**, then asserts `expect(res.status).not.toBe(401)`. With a DB-backed inactive check, a token for a nonexistent user must be rejected — so this control test will need the user to be seeded, or its expectation revised. `[VERIFIED: tests/api/cms-auth-401.test.ts:447-465 — read this session]`
- Design decision the planner must pin: does a **missing** user (deleted account) also get rejected? It should — otherwise a deleted user's token stays valid for up to 24h, which is the same class of hole D-15 closes for inactive users.

**Login already enforces inactive** — `src/app/api/v1/auth/login/route.ts` returns 403 when `user.status === 'inactive'` (verified by reading the file). So D-15 specifically closes the *existing-token* window, not the login path.

**Planner action:** Make the async conversion its own plan (single mechanical commit) that updates all 30 call sites, `src/lib/auth.ts`, and `tests/api/cms-auth-401.test.ts` together, so the suite never sits red between commits. Add a perf note: this introduces one extra DB read per authenticated request on the hot CMS path; the `_id` lookup is indexed by default so it is cheap, but it is a new cost.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Article CRUD + publish (CMS-01/02/03) | API / Backend (`src/app/api/v1/cms/articles/**`) | Browser/Client (admin tab form state) | Ownership/sanitization/validation are server-enforced; the client only holds form state and calls the API with a Bearer token. |
| Shared auth fetch + error toast (D-03) | Browser / Client (`src/app/admin/page.tsx`) | API / Backend (status codes drive mapping) | Purely a client concern; the server already returns correct 401/403/404/400/500 envelopes. |
| RBAC tab hiding (D-13) | Browser / Client (nav render) | API / Backend (403 on every route) | Defense in depth: UI hides, API still enforces. Neither is sufficient alone (UI is bypassable; API is not user-friendly). |
| Inactive-user lockout (D-15) | API / Backend (`src/lib/auth.ts` guard) | — | Must be server-side or it is trivially bypassed; applies to every authenticated route. |
| Taxonomy seed (D-11) | Database / Storage (`scripts/*.ts` → Mongo) | — | One-shot idempotent data task, run out-of-band; not an app route. |
| Blacklist import + sweep (AFF-04) | API / Backend (route + `src/lib/blacklist.ts`) | Database / Storage (batch `updateMany`) | Import acknowledgement is a server response; the sweep is post-response work scheduled by `after()` on the server. |
| Re-sweep / restore (D-08) | API / Backend (new route or reuse) | Browser/Client (button + result copy) | Sweep/restore are DB-batch operations; the client only triggers and displays counts. |
| FAQPage JSON-LD embed (C-1) | Frontend Server / SSR (`src/app/article/[slug]/page.tsx`) | — | Rendered server-side in the RSC alongside the existing NewsArticle/BreadcrumbList JSON-LD; no client JS. |

## Standard Stack

No new packages are added in this phase — the UI-SPEC states this explicitly ("No new packages are added in this phase"), and CONTEXT.md scopes the phase to repairing existing code. Everything needed is already installed.

### Core (existing — reuse, do not add)
| Library | Version | Purpose | Why Standard here |
|---------|---------|---------|-------------------|
| next | 16.2.12 | App Router, Route Handlers, `after()` | Already the framework; `after()` is the documented post-response mechanism (D-05). |
| mongoose | 9.9.1 | Models, `updateMany` batch writes | Canonical data layer (`src/lib/db/models.ts`). Batch sweep (D-06) uses `AffiliateLinkModel.updateMany`. |
| react | 19.2.4 | Client admin shell | Existing admin is a `'use client'` component. |
| @tiptap/* | 3.30.1 | Rich-text article content | `src/components/admin/RichTextEditor.tsx`, reused as-is. |
| lucide-react | 1.28.0 | Icons (Trash2, Plus, RefreshCw, AlertCircle…) | Already used throughout; UI-SPEC names the exact set. |
| sanitize-html | 2.17.6 | Article HTML sanitization gate | Every stored content write passes `sanitizeArticleContent` (PROJECT.md constraint #6). |
| vitest | 4.1.10 | Regression tests | Existing suite + `mongodb-memory-server`. |
| mongodb-memory-server | 11.2.0 | In-memory Mongo for tests | `tests/setup.ts` lifecycle. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | 4.23.5 | Run the taxonomy seed script | `scripts/seed-*.ts` precedent; run manually via `npx tsx`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next `after()` (D-05) | Documented fire-and-forget (`void sweep()`) | `after()` is the framework-supported way and is confirmed supported on self-hosted `next start`; fire-and-forget can be cut off by process restart with no guarantee. `after()` is preferred but see Pitfall 1 (it throws outside a request scope). |
| `updateMany` per domain (D-06) | `bulkWrite` with all domains in one round trip | `bulkWrite` is fewer round trips still; `updateMany` per domain is simpler and matches D-06's stated intent. Either satisfies "no per-link `save()` loop." |
| Sync `getAuthUser` + separate inactive check | Async `getAuthUser` (D-15) | D-15 locked the async approach. Alternative (check status in each route) is 30× duplication — rejected. |

**Installation:** none — no `npm install` in this phase.

**Version verification:** Not applicable (no new packages). Installed versions were read from `package.json` this session: `next 16.2.12`, `mongoose ^9.9.1`, `react 19.2.4`, `@tiptap/* ^3.30.1`, `lucide-react ^1.28.0`, `sanitize-html ^2.17.6`, `vitest ^4.1.10`.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** The UI-SPEC's Registry Safety table records "No new packages are added in this phase." No legitimacy gate required.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────────────── ADMIN (browser, 'use client') ────────────────────────────┐
                         │  src/app/admin/page.tsx  (4,097 lines — single canonical surface, targeted edits only) │
                         │                                                                                        │
  Admin/Editor/Author ──▶│  NavItem (role-gated, D-13)  ──▶  active tab via ?tab= / ?edit= / ?preview=           │
                         │         │                                                                              │
                         │         ├── ArticleEditorForm ── GEO fields (D-09) ─ FAQ rows (D-10) ─ Category (D-12) │
                         │         │        │                                                                     │
                         │         ├── UsersView      (role/status/name/avatar — D-14)                            │
                         │         ├── CategoriesView (two-level taxonomy — CMS-04)                               │
                         │         └── BlacklistView  (import sheet + Re-sweep — AFF-04 / D-08)                   │
                         │                  │                                                                     │
                         │        [shared auth fetch helper + error toast]  ◀── ALL calls go through this (D-03) │
                         └──────────────────┼─────────────────────────────────────────────────────────────────────┘
                                            │  Authorization: Bearer <localStorage token>
                                            ▼
                         ┌──────────────────────── API / BACKEND (src/app/api/v1/cms/**) ──────────────────────┐
                         │  getAuthUser(req)  ──▶ [D-15: async + DB lookup → reject inactive/missing users]      │
                         │      │                                                                               │
                         │      ├── /cms/articles[/id]   ── ownership: author_id scope or admin (AUTH-02)       │
                         │      ├── /cms/affiliate-links[/id] ── admin-only 403 (AUTH-03)                       │
                         │      ├── /cms/users[/id]      ── role/status/name/avatar (AUTH-04)                    │
                         │      ├── /cms/categories, sub-categories ── taxonomy CRUD (CMS-04)                    │
                         │      └── /cms/blacklist/import-sheet-url ─────────────────────────────┐               │
                         │                    │  parse CSV → upsert BlacklistModel            │               │
                         │                    │  return {totalImported} IMMEDIATELY         │  D-05         │
                         │                    └── after(() => sweepAllDomains(domains)) ◀───────┘               │
                         │                              │  one updateMany per domain (D-06)                     │
                         │                              └── active campaigns → status:'blacklisted'             │
                         │                                                                                      │
                         │  Re-sweep (D-08): sweep + restore blacklisted→active where no longer matched         │
                         └───────────────────────────────┬──────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
                                    ┌────────────────── DATABASE / STORAGE (MongoDB Atlas) ──────────────────┐
                                    │  users · categories · sub_categories · articles · affiliate_links      │
                                    │  blacklists · click_logs · settings                                     │
                                    │  sweep writes: AffiliateLinkModel.updateMany({...}, {status:'blacklisted'})│
                                    └────────────────────────────────────────────────────────────────────────┘
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────────────────────┐
                         │  PUBLIC SSR (src/app/article/[slug]/page.tsx) — Phase 2 adds ONE thing        │
                         │  Renders: NewsArticle JSON-LD + BreadcrumbList JSON-LD + [NEW] FAQPage JSON-LD│
                         │  from doc.faq_schema   (C-1 — this render does NOT exist today)               │
                         └───────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (targeted additions only — no reorganization)
```
src/
├── app/
│   ├── admin/page.tsx                      # canonical surface — targeted edits (D-01/D-03/D-10/D-13/D-14/D-08)
│   ├── admin/articles/create/page.tsx      # DELETE (D-02)
│   ├── admin/articles/edit/[id]/page.tsx   # DELETE (D-02)
│   ├── article/[slug]/page.tsx             # ADD FAQPage JSON-LD block (C-1)
│   └── api/v1/cms/
│       ├── blacklist/import-sheet-url/route.ts   # rework sweep call site (D-05/D-06)
│       └── users/[id]/route.ts                   # add avatar, drop password (D-14)
├── lib/
│   ├── auth.ts                             # async getAuthUser + inactive/missing check (D-15)
│   └── blacklist.ts                         # batch sweep + restore sweep (D-06/D-07/D-08)
└── scripts/  (repo root)
    └── seed-taxonomy.ts                    # idempotent V5.2 §1.2 taxonomy seed (D-11)
tests/
├── api/
│   ├── cms-rbac-affiliate-403.test.ts      # NEW — AUTH-03 regression
│   ├── articles-ownership.test.ts          # EXTEND — GET list scoping
│   └── cms-auth-401.test.ts                # UPDATE — async guard + seeded control user (C-2)
└── lib/
    └── blacklist-sweep.test.ts             # NEW — sweep + restore pure-function tests
```

### Pattern 1: Route handler auth guard (existing — every route follows this)
**What:** Guard clause at the top of the handler returns a `{status:'error', message}` envelope with the correct status before any DB work.
**When to use:** Every CMS route, unchanged except for the `await` introduced by D-15.
**Example:**
```ts
// Source: src/app/api/v1/cms/articles/route.ts:10-14 (read this session)
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Please log in' }, { status: 401 });
  }
  // ... after D-15: const user = await getAuthUser(req);
```
`[VERIFIED: src/app/api/v1/cms/articles/route.ts:10-14]`

### Pattern 2: Ownership enforcement (existing — AUTH-02)
**What:** Non-admin is scoped by `author_id`; admin bypasses. Applied on list (filter) and on item GET/PUT/DELETE (post-fetch compare → 403).
**When to use:** Any article-mutating route; the pattern is already correct — only tests are missing.
**Example:**
```ts
// Source: src/app/api/v1/cms/articles/[id]/route.ts:31-36 (read this session)
if (user.role !== 'admin' && existingArticle.author_id.toString() !== user.userId.toString()) {
  return NextResponse.json(
    { status: 'error', message: '403 Forbidden - Access denied' },
    { status: 403 }
  );
}
```
`[VERIFIED: src/app/api/v1/cms/articles/[id]/route.ts:31-36]`

### Pattern 3: Idempotent seed script (precedent to copy — D-11)
**What:** `tsx` script that connects, upserts by slug (find-or-create), and exits. No `deleteMany`.
**When to use:** The taxonomy seed.
**Example:**
```ts
// Source: scripts/seed-affiliate-links-and-reviews.ts:11-21 (read this session)
async function upsertCategory(name: string, slug: string, description: string) {
  const existing = await CategoryModel.findOne({ slug });
  if (existing) return existing;
  return CategoryModel.create({ name, slug, description });
}
async function upsertSubCategory(categoryId: any, name: string, slug: string) {
  const existing = await SubCategoryModel.findOne({ slug });
  if (existing) return existing;
  return SubCategoryModel.create({ category_id: categoryId, name, slug });
}
```
`[VERIFIED: scripts/seed-affiliate-links-and-reviews.ts:11-21]`

### Pattern 4: Post-response work with `after()` (new — D-05)
**What:** Schedule the sweep after the response is sent, so the import returns immediately.
**When to use:** `import-sheet-url` after persisting blacklist rows.
**Example:**
```ts
// Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md:68-91
import { after } from 'next/server'

export async function POST(request: Request) {
  // Perform mutation
  after(async () => {
    // runs after the response is finished
  })
  return new Response(JSON.stringify({ status: 'success' }), { status: 200, ... })
}
```
`[CITED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md]` — stable since `v15.1.0`; fully supported self-hosted with `next start` (`[CITED: docs/01-app/02-guides/self-hosting.md:295-299]`).

### Anti-Patterns to Avoid
- **Three overlapping editors:** the exact tech-debt this phase removes. Never re-introduce a second create/edit surface (D-01/D-02).
- **Rendering an empty editor on load failure:** the original bug (CONCERNS Known Bugs #1). Render the documented inline error panel instead (D-03/D-04, UI-SPEC line 180).
- **Per-link `save()` in a sweep loop:** the current O(n) write pattern (`src/lib/blacklist.ts:154-158`). Use one `updateMany` per domain (D-06).
- **A sweep that blocks the import response:** 300 sequential writes behind one HTTP response (D-05 forbids).
- **A second schema layer:** `src/lib/db/schema.ts` is a dead twin — never import it (PROJECT.md constraint #5; HYG-01 removes it in Phase 5).
- **Adding the V5.2 light palette to the admin surface:** the UI-SPEC explicitly forbids a third admin theme; admin stays dark/gold.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Post-response background work | Custom `setTimeout`/detached promise | Next `after()` from `next/server` | Framework-supported, survives graceful shutdown drain, guaranteed to run (`[CITED: after.md:54]`). |
| CSV line parsing with quotes/commas | A new parser | Existing `parseCsvLine` in `import-sheet-url/route.ts:8-31` | Already handles quoted fields and escaped quotes; it is tested implicitly by the working import. |
| Root-domain extraction | A new URL parser | Existing `extractDomainFromUrl` in `src/lib/blacklist.ts:12-57` | Handles `www.`, two-part TLDs (`co.uk`, `com.vn`), and bare-domain input. |
| Domain→regex matching | Inline `new RegExp(input)` | `escapeRegExp` from `src/lib/utils.ts` | Blacklist input is admin/sheet-supplied text; unescaped regex is a ReDoS vector (Phase 1 T-1-17 fix). |
| HTML sanitization | Any ad-hoc escaping of article content | `sanitizeArticleContent` (`src/lib/sanitize.ts`) | PROJECT.md constraint #6: the single gate; changing the tag allowlist requires updating `tests/lib/sanitize.test.ts` first. |
| JSON-LD serialization | `JSON.stringify` into a script tag | `serializeJsonLd` from `src/lib/seo.ts` | Already used for the two existing schema blocks; consistent escaping. |
| User/role checks per route | Route-local JWT/status logic | `getAuthUser` (`src/lib/auth.ts`) | SEC-02 regressed exactly this way (route-local fallback secrets). One canonical guard only. |
| Slug generation | Manual string munging | `slugify` from `src/lib/utils.ts` | Already applied in article POST/PUT. |

**Key insight:** almost everything this phase needs is already implemented in the repo — the work is *composition and correction*, not construction. The only genuinely new artifacts are the FAQPage JSON-LD block, the batch/restore sweep functions, the taxonomy seed script, the shared fetch helper, and tests.

## Common Pitfalls

### Pitfall 1: `after()` throws outside a request scope — breaks Vitest route tests
**What goes wrong:** Calling `after()` in a route handler invoked directly (as all `tests/api/*` suites do) throws `Error: 'after' was called outside a request scope` (`E468`), because there is no `workAsyncStorage` store.
**Why it happens:** `after()` reads `workAsyncStorage.getStore()` and throws when absent — verified in the installed runtime:
```js
// node_modules/next/dist/server/after/after.js
function after(task) {
    const workStore = _workAsyncStorage.workAsyncStorage.getStore();
    if (!workStore) {
        throw new Error('`after` was called outside a request scope. ...'); // E468
    }
    ...
}
```
`[VERIFIED: node_modules/next/dist/server/after/after.js — read this session]`
**How to avoid:** Two-part approach. (a) Put the actual sweep logic in a plain exported function (`sweepAllDomains`, `restoreSweep`) in `src/lib/blacklist.ts` so it is unit-testable with no Next request context. (b) In the route, wrap the `after(...)` registration in a try/catch (or a tiny helper that falls back to `void sweep()` when `after()` throws) so a successful import inside a test does not blow up. Test the sweep function directly, not through the route.
**Warning signs:** `E468` / "called outside a request scope" in test output after wiring `after()`.

### Pitfall 2: `after()` error semantics — it runs even on failure, and errors are not surfaced to the client
**What goes wrong:** A rejected import still schedules the callback; and if the sweep throws, the client never learns (response already sent).
**Why it happens:** Documented: *"`after` will be executed even if the response didn't complete successfully. Including when an error is thrown or when `notFound` or `redirect` is called."* `[CITED: after.md:54]`
**How to avoid:** Only register `after()` after the blacklist rows are successfully persisted (i.e. on the success path, just before returning). Have the sweep function catch and `console.error` its own failures with a context prefix (repo convention: `console.error('<Owning feature> error:', error)`). Do not rely on the client seeing sweep failures — the UI copy is already eventual (D-05, UI-SPEC line 165).
**Warning signs:** Import returns success but campaigns never flip to `blacklisted`; only `pm2 logs` would show it.

### Pitfall 3: The sweep's substring regex over-matches
**What goes wrong:** `sweepRetroactiveBlacklist` builds `new RegExp(escapeRegExp(rootDomain), 'i')` and matches `base_url` with `$regex` — a substring match. `badsite.com` matches `https://notbadsite.com/...` and `https://badsite.com.evil.net/...`.
**Why it happens:** Existing implementation at `src/lib/blacklist.ts:145-151` uses a raw regex on `base_url`, not a hostname comparison:
```ts
const searchRegexSource = escapeRegExp(rootDomain || hostname || targetDomainOrUrl);
const searchRegex = new RegExp(searchRegexSource, 'i');
const matchingLinks = await AffiliateLinkModel.find({ base_url: { $regex: searchRegex }, status: { $ne: 'blacklisted' } });
```
`[VERIFIED: src/lib/blacklist.ts:145-151]`
**How to avoid:** D-06 rewrites this anyway (batch per domain). While rewriting, decide deliberately between (a) preserving substring semantics, or (b) tightening to hostname-suffix matching consistent with `checkUrlAgainstBlacklist`'s wildcard logic (which correctly handles subdomains via `endsWith('.' + root)` — `src/lib/blacklist.ts:110-116`). Tightening is safer for the restore sweep: an over-broad match risks sweeping legitimate campaigns to `blacklisted`.
**Warning signs:** Re-sweep restores fewer campaigns than expected, or unrelated campaigns show as blacklisted.

### Pitfall 4: The restore sweep must not touch manually-`inactive` campaigns
**What goes wrong:** A naive restore does `updateMany({status: 'blacklisted'}, {status: 'active'})` for everything, or `updateMany({status: {$ne:'active'}}, ...)` which resurrects manually-deactivated campaigns.
**Why it happens:** Two distinct non-active states share the field: `'blacklisted'` (swept, reversible) and `'inactive'` (manual, must never be auto-restored) — D-07.
**How to avoid:** Restore filter must be exactly `{ status: 'blacklisted' }` AND not matching any active blacklist entry. Never `$ne: 'active'`. The enum is `['active','inactive','blacklisted']` (`src/lib/db/models.ts:89`), so `inactive` is representable and must be excluded by construction.
**Warning signs:** Manually-disabled campaigns become active after a Re-sweep.

### Pitfall 5: D-15's DB lookup changes the meaning of a valid token
**What goes wrong:** Existing tests and any flow that forges a token with a non-existent `userId` will now fail (or, worse, silently change behavior). The `cms-auth-401` control test uses `userId: 4` with no seeded user.
**Why it happens:** Adding a DB lookup means "valid signature" is no longer sufficient — the user must exist and be active.
**How to avoid:** Decide and document: token for a **missing** user → 401 (recommended, closes deleted-account window); token for an **inactive** user → 401. Update `tests/api/cms-auth-401.test.ts:447-465` to seed the control user (or adjust the assertion) in the same commit as the async conversion.
**Warning signs:** `cms-auth-401.test.ts` control test goes red; or multiple existing suites start 401-ing because their fixture users are missing.

### Pitfall 6: Affiliate placement render order is not position-ordered
**What goes wrong:** Success criterion #3 requires placements to "render in order on the public page." The public page takes `placements[0]` as the EditorVerdict and the rest as CTAs, preserving the stored array order — but the editor appends on toggle, so order is user-click order, not `top → middle → footer`.
**Why it happens:**
```ts
// src/app/article/[slug]/page.tsx:107-109
const verdictPlacement = placements[0] || null;
const remainingPlacements = placements.slice(1);
```
`[VERIFIED: src/app/article/[slug]/page.tsx:107-109]` — and the editor builds the array via `setAffiliatePlacements([...affiliatePlacements, {...}])` (`src/app/admin/page.tsx:1953`).
**How to avoid:** Decide the canonical order explicitly. Recommended: sort `affiliate_placements` by a defined position order (`top_cta` → `middle_comparison` → `footer_banner`) in the editor payload and/or on render, so the displayed order is deterministic regardless of click order. `AffiliateCtaBlock` already maps all three labels (`src/components/AffiliateCtaBlock.tsx:18-23`).
**Warning signs:** Placements appear in click order; the "top" CTA sometimes renders last.

### Pitfall 7: Admin `admin/page.tsx` is a 4,097-line monolith — high regression risk
**What goes wrong:** A change for one tab breaks an unrelated tab; URL-state effects re-run unexpectedly.
**Why it happens:** 60+ `useState` hooks, all views inline, a `useEffect` keyed on `[searchParams, articlesList]` (page.tsx:371-403), and untested.
**How to avoid:** Targeted edits only (HYG-02/Phase 5 owns modularization). Preserve the `buildAdminUrl`/`navigate`/restore-`useEffect` contract exactly (UI-SPEC Interaction Contract §2). Any new control must go through `navigate()`, never bypass it. After editing, manually exercise the URL-state round trip (`?tab=`, `?edit=`, `?preview=`).
**Warning signs:** Back/Forward navigation stops restoring tab/edit state; a tab renders blank.

## Code Examples

Verified patterns from this session's source reads.

### Auth guard awaiting the async conversion (D-15)
```ts
// Current (sync) — src/lib/auth.ts:47-55
export function getAuthUser(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}
// After D-15 (illustrative): lookup must happen after verifyToken; reject inactive/missing.
// export async function getAuthUser(req: Request): Promise<AuthPayload | null> { ... }
```
`[VERIFIED: src/lib/auth.ts:47-55]` — `AuthPayload` (auth.ts:16-20) carries only `userId`/`username`/`role`, so `status` MUST come from a DB read.

### FAQ rows ↔ payload shape (mirror the existing behavior — D-10)
```ts
// Source: src/app/admin/page.tsx:1856, 1874 (read this session)
const validFaq = faqRows.filter((f) => f.question.trim() && f.answer.trim());
// ...
faqSchema: validFaq,
```
The stored shape is `{question, answer}[]` (`src/lib/db/models.ts:163-168`); the API accepts `faqSchema` and writes `faq_schema` (`articles/route.ts:133`, `[id]/route.ts:140`). Build the FAQPage JSON-LD from the same filtered shape.

### Batch sweep (D-06) — replace the per-link loop
```ts
// Current per-link loop — src/lib/blacklist.ts:153-158 (replace)
const updatedIds: string[] = [];
for (const link of matchingLinks) {
  link.status = 'blacklisted';
  await link.save();
  updatedIds.push(link._id.toString());
}
```
`[VERIFIED: src/lib/blacklist.ts:153-158]` — target is one `AffiliateLinkModel.updateMany({ ...matching... }, { status: 'blacklisted' })` per domain, returning `modifiedCount`.

### The three placement labels (render targets — CMS-03)
```ts
// Source: src/components/AffiliateCtaBlock.tsx:18-23 (read this session)
const POSITION_LABELS: Record<string, string> = {
  top_cta: 'Top Pick',
  middle: 'Featured Deal',
  middle_comparison: 'Partner Offer',
  footer_banner: 'Special Deal',
};
```
`[VERIFIED: src/components/AffiliateCtaBlock.tsx:18-23]` — note the model/edit UI use `top_cta`/`middle_comparison`/`footer_banner` (`src/app/admin/page.tsx:2307-2345`), matching V5.2 §1.5.

### Existing JSON-LD emission (where the FAQPage block goes — C-1)
```tsx
// Source: src/app/article/[slug]/page.tsx:181-182 (read this session)
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} />
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
```
Add a third script for the FAQPage object, guarded by `faq_schema` being non-empty after filtering incomplete pairs.

## Runtime State Inventory

> This is a repair/migration phase: D-07/D-08 change persisted campaign-status semantics and D-11 seeds taxonomy data. Not a pure rename, but runtime state matters.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `affiliate_links.status` already holds values from enum `['active','inactive','blacklisted']` (`src/lib/db/models.ts:89`). Existing production rows may already be `blacklisted` from the current synchronous sweeper. `categories`/`sub_categories` may already contain ad-hoc categories created via the CMS. | Data migration: D-11 seed must be idempotent upsert (find-by-slug, no delete) so it coexists with existing categories. Sweep/restore is code-driven continuous behavior, not a one-time migration. |
| Live service config | None — no external service holds app state. The Google Sheet URL is pasted per-import (a hardcoded default sits in admin state at `src/app/admin/page.tsx:319`; fix deferred to Phase 5 per CONTEXT.md). | None. |
| OS-registered state | None — PM2 runs `app/server.js`; `ecosystem.config.js` embeds no content strings. | None (verified this session). |
| Secrets/env vars | No secret names change. Sweep and auth changes read `MONGODB_URI`/`JWT_SECRET` via existing lazy getters. | None. |
| Build artifacts | Deleting the two orphan pages changes the route manifest; `.next/` (standalone output) is regenerated by CI on deploy. No stale artifact persists after rebuild. | Rebuild in CI (automatic). |

**Nothing found in category:** Live service config, OS-registered state, Secrets/env vars — verified by inspection this session.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test/run | ✓ | 22 LTS (CI), ≥20.9 required | — |
| npm | Install/test | ✓ | repo uses `npm ci` | — |
| MongoDB (in-memory) | Tests | ✓ | `mongodb-memory-server` 11.2.0 | — |
| MongoDB Atlas | Runtime data | ✓ (remote, third-party-owned) | — | None — standing SEC-01 residual risk (credential leaked; ownership blocks rotation). Not a Phase 2 blocker. |
| Vitest | Test suite | ✓ | 4.1.10 | — |
| tsx | Taxonomy seed script | ✓ | 4.23.5 | `npx tsx` |
| Google Sheets (public CSV) | Blacklist import | ✓ (external) | — | Manual add via `POST /cms/blacklist` |

**Missing dependencies with no fallback:** None blocking Phase 2.
**Missing dependencies with fallback:** None — all required tooling present.

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` (file contains only `{"workflow":{"_auto_chain_active":false}}`), so this section is **included** per the default-on rule.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 + mongodb-memory-server 11.2.0 |
| Config file | `vitest.config.mts` (node env, `tests/setup.ts`, `fileParallelism: false`, 20s timeout) |
| Quick run command | `npx vitest run tests/api/articles-ownership.test.ts tests/api/cms-auth-401.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Non-owner PUT/DELETE → 403; admin bypasses | integration | `npx vitest run tests/api/articles-ownership.test.ts` | ✅ (extend with GET-list scoping) |
| AUTH-02 | Non-admin GET list returns only own articles | integration | `npx vitest run tests/api/articles-list-scoping.test.ts` | ❌ Wave 0 |
| AUTH-03 | editor/author POST/PUT/DELETE affiliate-links → 403 | integration | `npx vitest run tests/api/cms-rbac-affiliate-403.test.ts` | ❌ Wave 0 |
| AUTH-04 | PUT user updates role/status/name/avatar; no password path | integration | `npx vitest run tests/api/cms-users-update.test.ts` | ❌ Wave 0 |
| AUTH-04/D-15 | Token of inactive user → 401 on any CMS route | integration | `npx vitest run tests/api/cms-auth-401.test.ts` (extend) | ✅ |
| CMS-01/05 | No `/admin/articles/create` or `/edit/` route files exist (fs-absence) | unit (fs) | `npx vitest run tests/api/security-regressions.test.ts` style check | ❌ Wave 0 |
| CMS-02 | FAQPage JSON-LD present when `faq_schema` non-empty | integration (pure builder) | `npx vitest run tests/lib/faq-jsonld.test.ts` | ❌ Wave 0 |
| CMS-03 | Placements render in canonical position order | integration (pure fn) | `npx vitest run tests/lib/placement-order.test.ts` | ❌ Wave 0 |
| CMS-04 | Seed idempotent: run twice → same counts, no dupes | integration | `npx vitest run tests/lib/seed-taxonomy.test.ts` | ❌ Wave 0 |
| AFF-04 | `sweepAllDomains` batches; restore reverts `blacklisted`→`active`, leaves `inactive` untouched | unit/integration | `npx vitest run tests/lib/blacklist-sweep.test.ts` | ❌ Wave 0 |
| AFF-04 | import-sheet-url persists + returns immediately (no sync sweep) | integration | `npx vitest run tests/api/blacklist-import-async.test.ts` | ❌ Wave 0 |
| — | Every CMS route still 401s without a token (regression gate) | integration (parameterized) | `npx vitest run tests/api/cms-auth-401.test.ts` | ✅ (must stay green through D-15) |

### Sampling Rate
- **Per task commit:** focused suite for the touched area.
- **Per wave merge:** `npm test` — the 401 gate and security-regression gate must be green.
- **Phase gate:** full suite green before `/gsd-verify-work`; manual UAT for the D-04 edit round trip (no E2E/component framework exists — `environment: 'node'`, no jsdom).

### Wave 0 Gaps
- [ ] `tests/api/cms-rbac-affiliate-403.test.ts` — AUTH-03 (no dedicated test today)
- [ ] `tests/api/cms-users-update.test.ts` — AUTH-04 (avatar update, no password)
- [ ] `tests/api/blacklist-import-async.test.ts` — AFF-04 response contract + eventual sweep
- [ ] `tests/lib/blacklist-sweep.test.ts` — D-06/D-07/D-08 batch + restore
- [ ] `tests/lib/seed-taxonomy.test.ts` — CMS-04 idempotency (requires a callable seed export)
- [ ] `tests/lib/faq-jsonld.test.ts` — CMS-02 render (requires a testable FAQPage builder)
- [ ] `tests/api/articles-list-scoping.test.ts` — AUTH-02 list path
- [ ] Update `tests/api/cms-auth-401.test.ts` — async guard + seeded control user (C-2)
- [ ] No framework install needed — Vitest + mongodb-memory-server already configured

## Security Domain

> `security_enforcement` is absent from `.planning/config.json` (absent = enabled), so this section is included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Canonical `getAuthUser` + `jsonwebtoken` + `bcryptjs`; D-15 adds active-status enforcement. Never hand-roll. |
| V3 Session Management | yes | 24h JWT in localStorage (Phase 1 D-15 locked); in-memory token blacklist for logout revocation (single-instance constraint). |
| V4 Access Control | yes | Ownership scoping (`author_id`) + role gates (`admin`-only writes) on every CMS route; UI hiding is secondary (D-13). |
| V5 Input Validation | yes | `sanitizeArticleContent` for article HTML; `isHttpUrl` for affiliate `base_url`; `escapeRegExp` for user/sheet text → RegExp; `slugify` for slugs. |
| V6 Cryptography | yes (existing only) | `bcryptjs` for password hashing, `jsonwebtoken` for tokens — no new crypto; never hand-roll. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-author article edit/delete | Elevation of Privilege | Post-fetch `author_id` compare → 403 (already implemented; add regression tests — AUTH-02). |
| Non-admin managing affiliate links | Elevation of Privilege | Role gate → 403 at the route (AUTH-03); hidden in UI (D-13). |
| Stale token of a deactivated/deleted user | Spoofing | D-15 inactive check in `getAuthUser`; recommend also rejecting missing users (A1). |
| ReDoS from sheet/admin-supplied domain → RegExp | Denial of Service | `escapeRegExp` before `new RegExp` (Phase 1 T-1-17); apply in the rewritten sweep. |
| Stored XSS via article HTML | Tampering | `sanitizeArticleContent` on every write; keep the gate intact. |
| Affiliate `javascript:`/`data:` scheme | Tampering | `isHttpUrl` gate at the CMS write boundary (AFF-01, Phase 1). |
| Silent 401 → empty editor (data-exposure-adjacent UX/auth failure) | Information Disclosure / DoS | Shared fetch helper maps every non-2xx to a visible toast; 401 clears token (D-03). |

**Security-specific note:** D-15 is the only security-surface change and it is defense-deepening (closes the existing-token window). No new auth storage, no new secrets.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-domain synchronous sweep inside the import request | `after()` background sweep + batch `updateMany` (D-05/D-06) | This phase | Import response no longer blocks on N domains; `totalSweptCampaigns` becomes eventual. |
| `middleware.ts` | `src/proxy.ts` | Next 16 | Already migrated; do not reintroduce `middleware.ts`. |
| Sync `params`/`searchParams` | Promise-based `params`/`searchParams` | Next 16 | Already used throughout; route handlers `await params`. |
| `next lint` | ESLint CLI (`npm run lint`) | Next 16 | Already migrated. |
| Single-arg `revalidateTag(tag)` | Two-arg `revalidateTag(tag, 'max')` | Next 16 | Already correct in `cache-revalidation.ts:15`. |
| `unstable_after` | `after` (stable) | v15.1.0 | `after` is the stable API to use (`[CITED: after.md:300-302]`). |

**Deprecated/outdated:**
- Route-local JWT/fallback-secret auth: removed in Phase 1; never reintroduce (the `cms-auth-401` gate enforces this).
- `src/lib/db/schema.ts` twin: dead, never import (HYG-01 removes it).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A token for a **missing** (deleted) user should also 401 under D-15 — recommended, not stated in CONTEXT.md | C-2, Pitfall 5 | Low-medium: if the planner leaves missing users passing, a deleted account's token stays valid up to 24h. |
| A2 | Canonical placement render order should be `top_cta → middle_comparison → footer_banner` | Pitfall 6, CMS-03 | Medium: success criterion #3 says "render in order" without defining it; a wrong order fails UAT. |
| A3 | The taxonomy seed should be extracted to a callable function so idempotency is unit-testable (not only a CLI) | Validation Architecture | Low: testability only. |
| A4 | The FAQPage builder should be extracted to a pure testable function rather than inline in the RSC | C-1, Validation Architecture | Low: testability only; inline is functionally equivalent. |
| A5 | `modifiedCount` from `updateMany` is an acceptable substitute for the sweep's returned count | Code Examples, D-06 | Low: `totalSweptCampaigns` semantics change anyway (D-05). |

**If this table is empty:** not applicable — five assumptions above need confirmation.

## Open Questions

1. **Does the Re-sweep action live on the blacklist import panel or the blacklist tab, and is it a new API route or an extension of an existing one?**
   - What we know: D-08 locks the behavior; CONTEXT.md the agent's Discretion leaves placement to the implementer; UI-SPEC copy suggests it sits beside the amber "Add domain" primary on the blacklist tab.
   - What's unclear: whether to add `POST /cms/blacklist/re-sweep` or fold restore into an existing route.
   - Recommendation: New dedicated route (`blacklist/re-sweep`) — cleanest response contract, easiest to test, no risk of changing existing route semantics. Place the button on the blacklist tab per UI-SPEC.

2. **Should the `after()` fallback (for tests) be a shared helper or an inline try/catch?**
   - What we know: `after()` throws outside a request scope (`E468`), and existing tests call handlers directly.
   - What's unclear: whether a future test will exercise the import route successfully.
   - Recommendation: small `scheduleAfterResponse(fn)` helper in `src/lib/` that try/catches and falls back to `void fn()`. Test the sweep function directly regardless.

3. **Should `avatar` be a free-text field or constrained?**
   - What we know: model has `avatar?: string`; existing create derives it from the first letter of name/username (`users/route.ts:75`); the UI falls back to that letter.
   - What's unclear: whether the admin should type an arbitrary string, an image URL, or a single character.
   - Recommendation: keep it a free string (matches model + existing behavior); no new constraints this phase.

## Sources

### Primary (HIGH confidence — read this session)
- `src/lib/auth.ts` (guard, token shape), `src/app/api/v1/cms/articles/route.ts` + `[id]/route.ts` (ownership, GEO round-trip), `src/lib/blacklist.ts` (sweep), `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts` (import), `src/app/api/v1/cms/users/route.ts` + `[id]/route.ts` (AUTH-04), `src/app/api/v1/cms/categories/**`, `sub-categories/**`, `affiliate-links/**` (RBAC), `src/app/admin/page.tsx` (all tabs/editor state), `src/app/article/[slug]/page.tsx` (public render), `src/lib/db/models.ts` (schemas/enums), `src/components/AffiliateCtaBlock.tsx`, `tests/api/**`, `tests/setup.ts`, `vitest.config.mts`.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` — `after()` semantics.
- `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md:295-299` — `after()` supported self-hosted with `next start`.
- `node_modules/next/dist/server/after/after.js` — runtime throws `E468` outside a request scope.
- `specv2.md` §1.1–§1.5, §1.8, §1.9, §4 — governing schema/RBAC.
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/codebase/{CONVENTIONS,STACK,TESTING,CONCERNS}.md`.

### Secondary (MEDIUM confidence)
- `.planning/phases/02-cms-end-to-end-v5-2/02-UI-SPEC.md` and `02-CONTEXT.md` — treated as binding contract; both contain the C-1 error (FAQPage already rendered) which source disproves.

### Tertiary (LOW confidence)
- None — all findings were verified against source this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; installed versions read from `package.json`.
- Architecture: HIGH — every touched file (routes, lib, admin page, public page, models, tests) was read this session and cited with line ranges.
- Pitfalls: HIGH — each pitfall traces to a specific source line or to the installed Next runtime; the two contract contradictions (C-1, C-2) are directly evidenced.

**Research date:** 2026-09-20
**Valid until:** ~30 days (brownfield repo; versions pinned, spec stable). Re-check if Next.js is bumped off 16.2.12 (AGENTS.md contract).

