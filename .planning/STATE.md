---
gsd_state_version: "1.0"
milestone: V5.2
current_phase: 03
current_phase_name: SEO/GEO & Performance Hardening
status: executing
stopped_at: Phase 06 executed + verified (179 tests green, VERIFICATION 3 PASS / 2 manual-UAT pending) — resuming Phase 03 Wave 2
last_updated: "2026-11-14T11:05:00.000Z"
last_activity: 2026-11-14
last_activity_desc: Phase 06 complete — traffic-web integration (backend + admin UI), 06-VERIFICATION.md written
state_head: 032c6ac
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 22
  completed_plans: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-11)

**Core value:** Admin can create and publish SEO+GEO-ready affiliate articles end-to-end per the governing V5.2 spec, with every click tracked, attributed, and blacklist-protected.
**Current focus:** Phase 03 — SEO/GEO & Performance Hardening

## Current Position

Phase: 03 (SEO/GEO & Performance Hardening) — EXECUTING (Wave 2 pending: 03-03, 03-04)
Interlude completed: Phase 06 (Traffic Intelligence Tab) — fully executed 2026-11-14, 06-VERIFICATION.md: SC1/SC3/SC5 PASS, SC2/SC4 present-but-behavior-unverified (manual UAT needs a live TabAPI credential — see deferred-items.md #3/#4)
Status: Resuming Phase 03 Wave 2
Last activity: 2026-11-14 — Phase 06 complete (traffic backend + admin Traffic tab)

Progress: [█████████░] 91%

## Performance Metrics

**Velocity:**

- Total plans completed: 19
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 9 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01-01 | 7min | 2 tasks | 5 files |
| Phase 01 P01-02 | 5min | 2 tasks | 7 files |
| Phase 01 P01-03 | 4min | 2 tasks | 4 files |
| Phase 01 P01-04 | 16.6min | 2 tasks | 10 files |
| Phase 01 P01-05 | 11min | 2 tasks | 7 files |
| Phase 01 P01-06 | 4min | 4 tasks | 9 files |
| Phase 01 P01-07 | 7min | 2 tasks | 7 files |
| Phase 02 P01 | 9min | 2 tasks | 31 files |
| Phase 02 P02 | 11min | 2 tasks | 5 files |
| Phase 02 P03 | 49min | 3 tasks | 7 files |
| Phase 02 P05 | 13min | 3 tasks | 5 files |
| Phase 02 P04 | 20min | 3 tasks | 8 files |
| Phase 02 P07 | 33min | 2 tasks | 4 files |
| Phase 02 P08 | 84min | 2 tasks | 5 files |
| Phase 03 P02 | 20min | 3 tasks | 13 files |
| Phase 06 P01 | 75min | 4 tasks | 43 files |
| Phase 06 P02 | 30min | 4 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- No ADR-locked decisions exist (ingest found 0 ADRs) — PROJECT.md records this explicitly
- D-001: V5.2 (specv2.md) governs overlapping spec scope; V3/V4 standing only where V5.2 is silent
- D-002: MongoDB + Mongoose is the datastore (V3/V4 relational schemas superseded)
- [Phase 01]: 01-01: /blocked is a standalone DB-backed RSC; ref is the only URL-borne value (24-hex ClickLog id) validated before any DB call - D-09/D-10/D-11 implemented as planned
- [Phase 01]: 01-01: /blocked styled with Tailwind arbitrary values on globals.css tokens inside page.tsx; CTA uses plain anchor for zero client JS; redirect-route fallback branches normalized to explicit 302
- [Phase 01]: ﻿SEC-01 closed: all three seed files + npm entry point deleted in ONE commit; permanent regression gate (fs-absence + destructive-op scan + counter-vacuity) runs on every npm test
- [Phase 01]: ﻿Admin password recovery is CLI-only (D-04): scripts/reset-admin.ts upserts admin, never echoes the password; DEPLOY.md section 13 documents it and the no-web-path-by-design rule
- [Phase 01]: 01-03: strict isHttpUrl lives next to normalizeHttpUrl without reusing it - display-layer silent fallback and security-boundary reject are an intentional documented pair (AFF-01)
- [Phase 01]: 01-03: POST product_url scheme gate is one combined check (finalProductUrl always falls back to finalBaseUrl once the required-field check passed)
- [Phase 01]: 01-03: PUT scheme gate sits after the 404 check and before the base_url assignment - 404-first semantics preserved, rejected schemes never reach assignment
- [Phase 01]: [Phase 01] 01-04 AUTH-01 closed: every CMS route (25/39 verb-handlers) verifies through single canonical getAuthUser(req); parameterized 401 gate tests/api/cms-auth-401.test.ts (61 tests) prevents SEC-02 recurrence in CI
- [Phase 01]: 01-04: auth swap was already present in uncommitted working tree at arrival — committed the existing swap + built the missing parameterized 401 gate (plan's actual new artifact). Per-route 401-vs-403 status pinning preserves the role matrix while failing loudly on silent downgrade
- [Phase 01]: 01-05: rate-limit all 3 public write endpoints — subscribe hits hard 429+Retry-After at 5/60s/IP (covers /subscribe alias via re-export); click/redirect silent-skip on 60/60s flood cap OR 60s per-IP+link dedupe (no 429 — ClickLog always created on redirect as /blocked ref anchor, only \ skipped on dedupe); failure-lockout login limiter untouched + state-isolated
- [Phase 01]: 01-07: getClientIp last-hop + Nginx overwrite (D-14) closes XFF first-hop spoofing (T-1-16) — code+config pair; escapeRegExp single shared source in utils.ts applied at both remaining user-text→RegExp sites + 100-char cap (T-1-17) closes the unauthenticated ReDoS vector
- [Phase 02]: 02-01: getAuthUser is now async (Promise<AuthPayload|null>) and enforces D-15 with one indexed UserModel.findById status gate; malformed/non-ObjectId userId fails closed via Types.ObjectId.isValid pre-check (null, never CastError into 500) — Closes the 24h existing-token window for deactivated/deleted accounts across all 27 CMS routes without per-route duplication
- [Phase 02]: 02-01: every test whose principal must PASS the guard seeds an active UserModel and signs with its real ObjectId _id; non-ObjectId literals are reserved for fail-closed rejection cases (insider-admin editor-token stays 403) — The fail-closed path only guarantees rejection; it cannot make a pass-case token succeed
- [Phase 02]: 02-02: buildFaqPageSchema is a zero-dependency pure builder; completeness rule mirrors the editor's trim() filter exactly and non-string values are dropped defensively (CMS-02, C-1)
- [Phase 02]: 02-02: canonical placement order pinned as top_cta -> middle_comparison -> footer_banner (A2); unknown/legacy labels rank after the canonical three and are never dropped; stability is explicit via original-index tiebreaker (CMS-03, Pitfall 6)
- [Phase 02]: 02-03: cmsFetch normalizes every CMS call into an explicit { ok } result and also flags an HTTP-200 error envelope as failure — res.ok alone would permit a silent success (D-03, T-02-09)
- [Phase 02]: 02-03: the two orphaned admin editor routes are deleted AND proven unreachable by an fs-absence + src-wide grep gate — CMS-05 is satisfied by absence by construction, not by unlinking (D-01/D-02, T-02-10)
- [Phase 02]: 02-05: RBAC is pinned by dedicated regression suites (affiliate-link 403 with unchanged document, author_id list scoping with empty-not-403 at zero articles) and the D-13 UI half by a source-contract test reading the admin shell — route enforcement stays primary over UI hiding
- [Phase 02]: 02-05: PUT /api/v1/cms/users/:id drops password from the destructure/assignment entirely (no password_hash write) while adding avatar to both the apply step and the response — D-14 + CLI-only recovery (Phase 1 D-04) preserved
- [Phase 02]: 02-04: import returns immediately and the batched sweep runs post-response via a scheduleAfterResponse seam that degrades to fire-and-forget outside a request scope; response reports totalImported only (D-05/D-06)
- [Phase 02]: 02-04: domain matching is hostname equality/subdomain suffix (never a raw substring regex), so badsite.com matches sub.badsite.com but not notbadsite.com or badsite.com.evil.net; restore only flips blacklisted-no-longer-matching links and never touches inactive (D-06/D-07/D-08)
- [Phase 02]: 02-06: callable seedTaxonomy() (create-only-when-absent, never deletes); editor required-category guard leaves GEO optional (D-09); FAQ filter drops incomplete rows (D-10) — D-11 idempotency testable in isolation; D-09/D-10 preserved by omission from the save guard and payload filter
- [Phase 02 Gap]: 02-07: POST /cms/blacklist uses the same combined admin guard as sibling DELETE (no-token→401, non-admin→401 not 403 — sibling contract keeps cms-auth-401 inventory unchanged); guard placed before req.json so a rejected principal never reaches the sweep (CR-03, T-02-01/T-02-02)
- [Phase 02 Gap]: 02-07: handleCheckAffUrl re-wired through cmsFetch with a token and fails closed on !result.ok — a failed check keeps the warning visible instead of clearing it, so a blacklisted base_url can never be silently saved (CR-01, T-02-04)
- [Phase 02 Gap]: 02-08: Edit-user modal moved into UsersView (co-located with its trigger, matching the Add-user modal pattern); a source-contract test pins the co-location by indexOf ordering so it cannot drift back into BlacklistView (CR-02)
- [Phase 02 Gap]: 02-08: handleSaveSubCategory passes the ObjectId string through unchanged (String(subCatParentId) not Number()); sub-category routes validate Types.ObjectId.isValid → 400, never a CastError→500 (CR-04, WR-07, T-02-07/T-02-08)
- [Phase 02 Gap]: 02-09: verdict selected by position (prefer middle_comparison) via pure selectVerdictPlacement/splitPlacementsByVerdict in placement-order.ts, not placements[0] array index — top_cta stays in remaining/offers area so it renders at the top, middle_comparison becomes the mid-article verdict (WR-02, CMS-03)
- [Phase 03]: 03-01: view counting replaced read-modify-write article.save() with after() fire-and-forget + ArticleModel.updateOne $inc atomic increment + consumeDedupe 60s rolling window — five rapid views from same IP within window increment exactly 1; ObjectId guard prevents CastError into after handler (PERF-02, D-01/D-02/D-03)
- [Phase 03]: 03-01: article page data wrapped in React.cache() (per-request dedup between generateMetadata and page body = one DB hit) + unstable_cache() (cross-request cache with per-slug tag article-slug, 60s revalidate); fallback try/catch for vitest without Next runtime (PERF-01, D-04/D-05/D-06/D-07)
- [Phase 03]: 03-02: legacy /bai-viet/ switched to permanentRedirect (308); /?q= search URLs produce noindex metadata via conditional generateMetadata; sitemap/robots switched from force-dynamic to ISR revalidate=3600; list API responses strip content field with excerpt fallback from stripped HTML; Cache-Control: public s-maxage=60 on 3 public GET endpoints (SEO-01/SEO-03/PERF-01, D-08/D-10/D-11/D-12/D-13)
- [Phase 06]: 06-01: separated admin guard (401 no-token / 403 non-admin, insights-style) on all 11 traffic routes; all 16 traffic verbs pinned in the cms-auth-401 fs-glob inventory — no silent public route drift
- [Phase 06]: 06-01: credential resolution centralized in src/lib/traffic/credentials.ts (DB primary, env fallback); routes never read process.env for provider keys (grep-verified) — keys never leave the server, GET config returns masked ••••••last4 only
- [Phase 06]: 06-01: error envelope on traffic routes = { status:'error', error:{code,message}, message } — preserves traffic-web error codes (invalid_domain/missing_api_key/insufficient_credits) + Vietnamese messages while matching the repo cms envelope
- [Phase 06]: 06-01: TrafficDomain upsert-by-domain for Add & run (duplicate updates, never duplicates); refresh uses getTraffic force:true (bypasses cache read); upstream failure persists lastError and keeps the previous report intact; GET /domains returns full stored reports without pagination (admin scale is tens of domains)
- [Phase 06]: 06-02: traffic UI calls go through trafficFetch (Bearer-token pattern) instead of cmsFetch — cmsFetch's English status-mapped copy would replace the routes' actionable Vietnamese messages (missing_api_key/invalid_domain/insufficient_credits) on non-400 statuses
- [Phase 06]: 06-02: component tests are node-environment source-contract (02-08 fs read + indexOf) + pure-helper unit tests (filterRows/sortRows/momTrend/sliceMessage/derivePanelPhase) — repo has no jsdom/@testing-library; behavior pinned without a render stack or new deps
- [Phase 06]: 06-02: click-to-load enforced by construction — zero useEffect in any panel, fetch only from toggle/click handlers; soft-slice {data,error} guarded (sliceMessage) on whois/trustpilot/referring-sites/seranking, hard-error envelope guarded on ads; missing-key states derive from /config missing list, never a doomed fetch
- [Phase 06]: 06-02: react-hooks/set-state-in-effect kept clean in new code — override-state pattern (settings months select), await-gated setState in modal load effect, Date.now() frozen via useState initializer in AdsPanel

### Roadmap Evolution

- Phase 6 added (2026-11-13): Traffic Intelligence Tab (traffic-web integration) — INSERTED feature scope, admin-only Traffic tab with API-key management, persistent domain list, Add & run, List table + detail modal (core + 5 extended panels). Depends on Phase 2 only; independent of Phases 3–5.
- Phase 6 complete (2026-11-14): 2/2 plans, 179 tests green, build clean. Key decisions: [06-01] ported traffic-web libs take credentials/fetch as parameters — zero process.env reads outside credentials.ts; PUT config clears all in-memory traffic caches (cache-not-keyed-by-key anti-pattern fixed); [06-02] repo has no jsdom/DOM test infra — component tests are source-contract + pure-helper unit tests; TrafficDomain stores the full report so detail reads are DB-only (credit-free). Manual UAT with a live TabAPI key deferred (deferred-items #3/#4).

### Pending Todos

None yet.

### Blockers/Concerns

- [Standing] Production Atlas credential leaked in git history and still valid — rotation blocked by third-party cluster ownership (SEC-01 residual). Treat migrations/backups as compromised; eventual fix is migrating to a project-owned cluster
- [Phase 1 gate] Next.js 16 contract: read `node_modules/next/dist/docs/` before writing code; `proxy.ts` is the middleware; params are Promises
- [Phase 4 input] Current public UI is an editorial theme deviating from V5.2 §3; `BreakingNewsTicker` exists but is orphaned — user approval of the Bento direction is implied by roadmap approval

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Feature | "Scheduled" publishing status (mockup-only, no spec) | Deferred | 2026-09-11 | v1.0 init |
| Ops | Staging environment | Deferred | 2026-09-11 | v1.0 init |
| Scale | Redis-backed token blacklist / rate-limit store (needed only at ≥2 instances) | Deferred | 2026-09-11 | v1.0 init |

## Session Continuity

Last session: 2026-11-14T10:15:00.000Z
Stopped at: Plan 06-02 complete (Traffic admin UI: tab wiring, settings card, Add & run + List-Domain table, detail modal + 5 click-to-load panels) — 45 tests green, tsc clean, build green
Resume file: .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-02-SUMMARY.md
