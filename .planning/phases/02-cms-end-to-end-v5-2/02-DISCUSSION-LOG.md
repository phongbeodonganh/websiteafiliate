# Phase 2: CMS End-to-End (V5.2) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 2-CMS End-to-End (V5.2)
**Areas discussed:** Editor consolidation strategy, Blacklist sweep execution model, GEO fields + taxonomy seeding, RBAC enforcement surface

---

## Editor Consolidation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Main admin tab is canonical | Delete broken /admin/articles/edit/[id]; create+edit live in the main admin tab | ✓ |
| Dedicated studio pages win | Make create + edit/[id] canonical, fix missing auth header | |
| Shared editor component | Extract shared ArticleEditor used by both | |

**User's choice:** Main admin tab is canonical
**Notes:** The main tab already works and is wired into URL state; fewest moving parts.

| Option | Description | Selected |
|--------|-------------|----------|
| Delete both now | Delete articles/create/page.tsx and articles/edit/[id]/page.tsx | ✓ |
| Delete edit only + redirect create | Keep create as redirect | |
| Fix rather than remove | Repair edit page auth header | |

**User's choice:** Delete both now
**Notes:** Satisfies CMS-05 "no dead-end admin routes."

| Option | Description | Selected |
|--------|-------------|----------|
| Centralize auth fetch + surface errors | Shared fetch helper with Bearer token + visible error toast on non-2xx | ✓ |
| Verify current behavior only | Fix only if a defect found | |

**User's choice:** Centralize auth fetch + surface errors
**Notes:** Structurally prevents the silent-401 empty-editor class of failure.

---

## Blacklist Sweep Execution Model

| Option | Description | Selected |
|--------|-------------|----------|
| Background the sweep + batch updates | after()/fire-and-forget + updateMany per domain | ✓ |
| Stay synchronous, batch queries | Faster but admin still waits | |
| Leave as-is | Correctness over latency | |

**User's choice:** Background the sweep + batch updates
**Notes:** A 300-row paste must not block on 300+ sequential DB round-trips.

| Option | Description | Selected |
|--------|-------------|----------|
| 'blacklisted' status, reversible | Distinct from manual 'inactive'; restore sweep can flip back | ✓ |
| 'inactive' status | Same as manual deactivation | |

**User's choice:** 'blacklisted' status, reversible
**Notes:** Keeps swept vs. manually-deactivated campaigns distinguishable.

| Option | Description | Selected |
|--------|-------------|----------|
| Add manual re-sweep action | Re-runs sweep + restores campaigns no longer matching | ✓ |
| Data-only reversibility | No UI; flip status manually | |

**User's choice:** Add manual re-sweep action
**Notes:** Closes the reversibility loop in this phase.

---

## GEO Fields + Taxonomy Seeding

| Option | Description | Selected |
|--------|-------------|----------|
| GEO fields all optional | Only title/slug/content required; GEO surfaced prominently | ✓ |
| Require on publish only | Require focus_keyword + one takeaway when published | |
| Require on every save | Strictest | |

**User's choice:** GEO fields all optional
**Notes:** Matches existing schema and AI-generated drafts.

| Option | Description | Selected |
|--------|-------------|----------|
| Add FAQ Q&A row editor | Repeating add/remove rows → {question, answer} | ✓ |
| Raw JSON textarea | Paste JSON blob | |

**User's choice:** Add FAQ Q&A row editor

| Option | Description | Selected |
|--------|-------------|----------|
| Seed spec taxonomy tree idempotently | scripts/ upsert by slug per V5.2 §1.2 | ✓ |
| Ship empty, admin builds | No seed | |

**User's choice:** Seed spec taxonomy tree idempotently
**Notes:** 6 top-level categories incl. AI Use Cases with its 5 sub-categories.

| Option | Description | Selected |
|--------|-------------|----------|
| Category required, sub optional + filtered | Sub-category filtered to chosen category's children | ✓ |
| Both optional | Most permissive | |
| Both required on publish | Strictest | |

**User's choice:** Category required, sub optional + filtered

---

## RBAC Enforcement Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Hide admin-only tabs + keep 403s | Editor/author see Dashboard + Articles only; routes still 403 | ✓ |
| API 403s only, show all tabs | Rely on API errors | |

**User's choice:** Hide admin-only tabs + keep 403s
**Notes:** Defense in depth; matches spec RBAC table.

| Option | Description | Selected |
|--------|-------------|----------|
| role/status/name/avatar only (CLI for passwords) | Per AUTH-04 / spec §1.1 | ✓ |
| Add password reset in CMS | Contradicts Phase 1 D-04 | |

**User's choice:** role/status/name/avatar only (CLI for passwords)

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce inactive at auth guard | getAuthUser rejects inactive users' tokens immediately | ✓ |
| Status is display-only | Token valid until expiry | |

**User's choice:** Enforce inactive at auth guard

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current, add regression tests | Ownership scoping stays; pin with 403 tests | ✓ |
| Give editors cross-author access | New behavior beyond spec | |

**User's choice:** Keep current, add regression tests

---

## the agent's Discretion

- Exact shape/signature of the shared auth fetch helper and error-toast mechanism.
- Background-sweep trigger mechanism (`after()` vs. fire-and-forget).
- Exact `updateMany` batching strategy per domain.
- Seed script file name and CLI conventions.
- Placement/handling of the re-sweep action and how restore counts are reported.

## Deferred Ideas

- Password set/reset inside the CMS users tab — password recovery stays CLI-only (Phase 1 D-04).
- Full modularization of the 4,097-line admin page — HYG-02, Phase 5.
- Repo-root cleanup, unused deps, dead components — HYG-01, Phase 5.
- Public presentation / Bento redesign — PUB-02, Phase 4.
