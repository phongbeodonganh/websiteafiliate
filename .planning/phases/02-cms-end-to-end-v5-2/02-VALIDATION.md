---
phase: "2"
slug: "cms-end-to-end-v5-2"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-20"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + mongodb-memory-server 11.2.0 |
| **Config file** | `vitest.config.mts` (node env, `tests/setup.ts`, `fileParallelism: false`, 20s timeout) |
| **Quick run command** | `npx vitest run tests/api/articles-ownership.test.ts tests/api/cms-auth-401.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~180 seconds (23 test files, serial) |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}` (focused suite for the touched area)
- **After every plan wave:** Run `npm test` — the 401 gate and security-regression gate must be green
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-04/D-15 | stale/deleted/malformed token (Spoofing) | Inactive or missing user token → rejection; malformed userId → 401/403, never 500; pass-case tokens sign with a seeded active user's ObjectId | integration | `npm test; if ($?) { npx tsc --noEmit }` | ❌ W0 (inactive suite) | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-04/D-15 | un-awaited guard (EoP) | Every `getAuthUser(` call site also `await getAuthUser(`; full suite + tsc green | integration + source assert | `npm test; if ($?) { npx tsc --noEmit }` | ✅ (extend) | ⬜ pending |
| 02-02-01 | 02 | 1 | CMS-02 | stored XSS via JSON-LD | FAQPage JSON-LD present when `faq_schema` non-empty; escaping proven | unit (pure builder) | `npx vitest run tests/lib/faq-jsonld.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | CMS-03 | — | Placements render in canonical position order, stable, unknown-label safe | unit (pure fn) | `npx vitest run tests/lib/placement-order.test.ts tests/lib/faq-jsonld.test.ts; if ($?) { npx tsc --noEmit }` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | CMS-01/CMS-05 | dead-end route (EoP) | Orphan editors deleted + unreachable; create→GET→PUT→GET round trip persists GEO fields | integration (fs + API) | `npx vitest run tests/api/articles-edit-roundtrip.test.ts tests/api/admin-route-absence.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | CMS-01/D-03 | silent 401 (Info disclosure) | Shared helper attaches bearer token; every status maps to a message | unit | `npx vitest run tests/lib/cms-fetch.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 1 | CMS-05/D-03 | empty-editor overwrite (Tampering) | Failed load renders error panel, never blank form; tsc clean | unit + tsc | `npx vitest run tests/lib/cms-fetch.test.ts tests/api/admin-route-absence.test.ts tests/api/articles-edit-roundtrip.test.ts; if ($?) { npx tsc --noEmit }` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 3 | AFF-04/D-05..07 | ReDoS from domain → RegExp; blocking import | Batch sweep boundary-safe; restore leaves `inactive`; import returns before sweep | unit/integration | `npx vitest run tests/lib/blacklist-sweep.test.ts tests/api/blacklist-import-async.test.ts` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 3 | AFF-04/D-08 | non-admin re-sweep (EoP) | re-sweep: 401 no token, 401 non-admin, 200 admin; registered in gate at 401 | integration | `npx vitest run tests/api/cms-auth-401.test.ts tests/api/blacklist-import-async.test.ts` | ✅ (register route) | ⬜ pending |
| 02-04-03 | 04 | 3 | AFF-04/D-08 | — | Eventual-count import copy; Re-sweep control; distinct chips; tsc clean | integration + tsc | `npx vitest run tests/api/blacklist-import-async.test.ts tests/api/cms-auth-401.test.ts; if ($?) { npx tsc --noEmit }` | ✅ (extend) | ⬜ pending |
| 02-05-01 | 05 | 2 | AUTH-04/D-14 | privilege change | PUT user updates role/status/name/avatar; password ignored; 403 non-admin | integration | `npx vitest run tests/api/cms-users-update.test.ts` | ❌ W0 | ⬜ pending |
| 02-05-02 | 05 | 2 | AUTH-02/AUTH-03/D-16 | cross-author edit + non-admin link mgmt (EoP) | Editor/author 403 on affiliate-link CRUD; non-admin article list scoped to `author_id` | integration | `npx vitest run tests/api/cms-rbac-affiliate-403.test.ts tests/api/articles-list-scoping.test.ts tests/api/articles-ownership.test.ts` | ❌ W0 | ⬜ pending |
| 02-05-03 | 05 | 2 | AUTH-02/D-13 | privilege change | Admin-only tabs hidden for editor/author; permission-denied fallback; tsc clean | integration + source assert | `npx vitest run tests/api/cms-rbac-affiliate-403.test.ts tests/api/cms-auth-401.test.ts; if ($?) { npx tsc --noEmit }` | ✅ (extend) | ⬜ pending |
| 02-06-01 | 06 | 4 | CMS-04/D-11 | — | Seed idempotent: run twice → same counts, no dupes; exact tree in CMS GET | integration | `npx vitest run tests/lib/seed-taxonomy.test.ts tests/api/categories-taxonomy.test.ts` | ❌ W0 | ⬜ pending |
| 02-06-02 | 06 | 4 | CMS-04/D-09/D-12 | — | Required Level-1, filtered/reset Level-2, GEO optional | integration + tsc | `npx vitest run tests/api/articles-edit-roundtrip.test.ts; if ($?) { npx tsc --noEmit }` | ✅ (extend) | ⬜ pending |
| 02-06-03 | 06 | 4 | CMS-02/CMS-04/D-10 | — | FAQ row editor persists filtered-complete set; empty set saves | integration + tsc | `npx vitest run tests/api/articles-edit-roundtrip.test.ts tests/lib/faq-jsonld.test.ts; if ($?) { npx tsc --noEmit }` | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/cms-auth-inactive.test.ts` — AUTH-04/D-15 inactive/missing/malformed-tenant 401 matrix (plan 02-01)
- [ ] `tests/lib/faq-jsonld.test.ts` — CMS-02 render + escaping (plan 02-02)
- [ ] `tests/lib/placement-order.test.ts` — CMS-03 canonical placement order (plan 02-02)
- [ ] `tests/api/articles-edit-roundtrip.test.ts` — CMS-01/D-04 API round trip + GEO + FAQ persistence (plan 02-03)
- [ ] `tests/api/admin-route-absence.test.ts` — CMS-05 deleted-route absence + unreachability grep (plan 02-03)
- [ ] `tests/lib/cms-fetch.test.ts` — D-03 shared auth-fetch helper status matrix (plan 02-03)
- [ ] `tests/lib/blacklist-sweep.test.ts` — D-06/D-07/D-08 batch + restore + boundary match (plan 02-04)
- [ ] `tests/api/blacklist-import-async.test.ts` — AFF-04 response contract + eventual sweep + re-sweep route (plan 02-04)
- [ ] `tests/api/cms-users-update.test.ts` — AUTH-04 avatar/role/status/name, no password (plan 02-05)
- [ ] `tests/api/cms-rbac-affiliate-403.test.ts` — AUTH-03 affiliate-link 403 (plan 02-05)
- [ ] `tests/api/articles-list-scoping.test.ts` — AUTH-02 list path scoping (plan 02-05)
- [ ] `tests/lib/seed-taxonomy.test.ts` — CMS-04 idempotency + exact tree (plan 02-06)
- [ ] `tests/api/categories-taxonomy.test.ts` — CMS-04 taxonomy GET shape (plan 02-06)
- [ ] Update `tests/api/cms-auth-401.test.ts` — async guard + seeded control user + re-sweep route registration (plans 02-01, 02-04)
- [ ] Update `tests/api/insider-admin.test.ts` — seed one active admin user and sign the admin tokens with its `_id`; keep test 1's `'editor-id'` editor token as a fail-closed 403 (plan 02-01)
- [ ] No framework install needed — Vitest + mongodb-memory-server already configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| D-04 edit round trip (reopen published article → mutate → save → reload shows mutations) | CMS-01/CMS-05 | No E2E/component framework exists (`environment: 'node'`, no jsdom) | 1. Log in as admin, open the main admin tab. 2. Load a published article into the editor. 3. Change title + a GEO field, Save. 4. Reload the page and confirm mutations persisted. |
| RBAC UI hiding (admin-only tabs hidden for editor/author) | AUTH-02/D-13 | Visual/UI-only behavior | 1. Log in as an editor/author. 2. Confirm Affiliate Links, Users, Taxonomy, Blacklist, Settings tabs are absent. 3. Confirm admin sees all tabs. |
| 300+ row sheet import responsiveness | AFF-04/D-05 | Requires a live/pasted Google Sheet URL | 1. Paste a 300+ row sheet URL in the blacklist import. 2. Confirm the request returns promptly with imported counts. 3. Confirm the sweep eventually marks matching campaigns `blacklisted`. |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
