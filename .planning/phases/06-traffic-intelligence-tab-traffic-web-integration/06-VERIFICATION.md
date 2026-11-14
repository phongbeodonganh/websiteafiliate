---
phase: 06-traffic-intelligence-tab-traffic-web-integration
verified: 2026-11-14T10:22:45Z
status: human_needed
score: 3/5 must-haves verified
behavior_unverified: 2
overrides_applied: 0
covered_files:
  - .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-01-PLAN.md
  - .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-01-SUMMARY.md
  - .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-02-PLAN.md
  - .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-02-SUMMARY.md
  - .planning/phases/06-traffic-intelligence-tab-traffic-web-integration/06-CONTEXT.md
  - src/app/admin/page.tsx
  - src/app/api/v1/cms/traffic/config/route.ts
  - src/app/api/v1/cms/traffic/domains/[id]/refresh/route.ts
  - src/app/api/v1/cms/traffic/domains/[id]/route.ts
  - src/app/api/v1/cms/traffic/domains/route.ts
  - src/components/admin/traffic/TrafficDetailModal.tsx
  - src/components/admin/traffic/TrafficDomainsTable.tsx
  - src/components/admin/traffic/TrafficSettingsCard.tsx
  - src/components/admin/traffic/traffic-helpers.ts
  - src/lib/db/models.ts
  - src/lib/traffic/caches.ts
  - src/lib/traffic/credentials.ts
  - src/lib/traffic/domain.ts
  - src/lib/traffic/tabapi.ts
  - tests/api/cms-auth-401.test.ts
  - tests/api/cms-traffic-config.test.ts
  - tests/api/cms-traffic-domains.test.ts
  - tests/components/admin-traffic-tab.test.tsx
covered_digest: "v1:sha256:4eaa134889b27befe94d81e487025977bb39d57e0db5cec815098990960b7527"
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
behavior_unverified_items:
  - truth: "SC2 — admin clicks 'Thêm & chạy' and the domain appears in the List table (or a Vietnamese error renders)"
    test: "Manual UAT: open /admin?tab=traffic as admin, type a real domain, click Thêm & chạy; then submit an invalid string (e.g. 'not a domain') and, with no TabAPI key configured, a valid domain"
    expected: "Row appears in the table without reload with visits/rank/bounce/pages/top-country/trend/updated populated; invalid input → inline role=alert 'Tên miền không hợp lệ.'; missing key → 'Chưa cấu hình TABAPI_KEY trên máy chủ.'"
    why_human: "Route behavior is pinned by tests/api/cms-traffic-domains.test.ts (stubbed fetch) and the row-upsert helper by unit tests, but no DOM-render test exists in this repo (vitest environment:'node', no jsdom/@testing-library) — the click→POST→row-appears transition is only observable in a browser, and requires a live TabAPI credential for the populated-report path"
  - truth: "SC4 — 'Chi tiết' opens the modal with the 6 core sections and five click-to-load panels showing 'chưa cấu hình key' states"
    test: "Manual UAT: click Chi tiết on a row with a stored report; verify 6 metric cards + monthly history + sources + top countries + keywords + AI referrals render; expand Whois/Trustpilot/SE Ranking/Ads/Referring panels with keys absent → 'Chưa cấu hình key — vào Cấu hình API'; then with keys present, expand and verify data loads only on click"
    expected: "Modal opens from the stored report (no upstream call on open); panels never auto-fetch; slice errors (soft routes) render Vietnamese error + Thử lại; missing-key panels disable load actions"
    why_human: "Panel state machine (derivePanelPhase) and slice-error extraction (sliceMessage) are unit-tested and section presence is source-contract pinned, but the expand→fetch→render transition in a real browser is not exercised by any automated test and needs a live admin session (+ credentials for the data path)"
human_verification:
  - test: "End-to-end Traffic tab UAT with a live TabAPI key (carries deferred-items #3/#4): save all five credentials + months in the settings card, add a real domain via Thêm & chạy, open Chi tiết, expand Whois + Trustpilot + SE Ranking + Ads + Referring panels, click Làm mới, then Xóa a domain"
    expected: "Keys show masked (••••••last4) with Đã lưu/Từ env chips; row appears with populated metrics; modal sections render; panels load only on click; refresh updates the row + modal; delete (after confirm) removes the row"
    why_human: "Requires live upstream credentials + browser session; deferred-items #3/#4 recorded this as the deliberate closure step"
  - test: "Deep link /admin?tab=traffic as admin, and as editor/author"
    expected: "Admin sees the Traffic Intelligence tab with the Globe nav item; non-admin gets the existing access-denied contract (nav item hidden, direct URL denied)"
    why_human: "Auth gating logic is source-pinned (ADMIN_ONLY_TABS, requiredRole='admin', renderContent admin gate) but visual access behavior is a browser check"
  - test: "Verify no credential value is ever visible in the UI: open devtools network tab on GET /api/v1/cms/traffic/config and inspect the settings card DOM"
    expected: "Response contains masked values only (••••••last4); DOM contains no full key strings"
    why_human: "Masking is behavior-tested server-side (cms-traffic-config.test.ts: 'không bao giờ lộ key thô') and the card reads only config.masked, but final visual confirmation belongs to UAT"
---

# Phase 6: Traffic Intelligence Tab (traffic-web integration) Verification Report

**Phase Goal:** An admin opens one Traffic tab in the CMS and manages everything the standalone traffic-web app does: enters the traffic-web API keys (TabAPI, SerpApi, WhoisXML, SE Ranking, Trustpilot scraper URL), tracks a persistent list of domains with "Add & run", reads a List-Domain table of core traffic metrics, and opens a detail view per domain (core TabAPI report + click-to-load Whois/Trustpilot/SE Ranking/Google Ads/Referring-sites panels). Data logic ported from `D:\affiliate\traffic-web`; traffic-web itself not modified.
**Verified:** 2026-11-14T10:22:45Z
**Status:** human_needed (all backend truths behavior-verified; 2 UI-render truths present+wired but browser-level transitions not exercised — routed to manual UAT, matching deferred-items #3/#4)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Admin enters/saves all five credentials + TRAFFIC_MONTHS (3–12); GET returns only masked values; DB primary/env fallback; admin-only route | ✓ VERIFIED | `src/lib/traffic/credentials.ts:26-48` (db→env→null resolve, source tags), `:65-69` maskKey; `src/app/api/v1/cms/traffic/config/route.ts:30-40` (GET 401/403), `:71-81` (PUT 401/403), `:47-64` (masked+source+missing payload), `:110-120` (empty string clears, months 3–12 validation), `:124` (clearAllTrafficCaches after save); SettingSchema fields `src/lib/db/models.ts:326-331`; behavior tests `tests/api/cms-traffic-config.test.ts` (7 tests incl. "không bao giờ lộ key thô", env fallback, empty-clears, months 13→400, non-admin 403) — all pass |
| 2 | SC2 — "Thêm & chạy": domain appears in List table with 8 metric columns, or Vietnamese error on TabAPI failure | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Backend fully behavior-tested: `tests/api/cms-traffic-domains.test.ts` lines 97/114/124/134/147 (happy-path stores report; duplicate upserts still 1 doc; invalid_domain 400 Vietnamese; missing key → 500 missing_api_key with zero fetch attempts; 402 → insufficient_credits passthrough). UI wired: `TrafficDomainsTable.tsx:117-137` (POST + upsertRow + role="alert" error), 10 column headers source-pinned by `tests/components/admin-traffic-tab.test.tsx:262+`. **Not exercised:** the click→POST→row-rendered DOM transition (no DOM test infra in repo — see behavior_unverified_items) |
| 3 | SC3 — Domain list persists in MongoDB across restarts; "Làm mới" forces re-fetch; delete removes | ✓ VERIFIED | `TrafficDomainModel` unique domain index `src/lib/db/models.ts:366-394`; `GET /domains/[id]` serves stored report with zero upstream calls (`[id]/route.ts:29-45`; test line 163 "phục vụ báo cáo đã lưu — zero fetch calls"); `POST .../refresh` uses `force:true` (`refresh/route.ts:49`) and **on upstream failure preserves the previous report, recording only lastError** (`refresh/route.ts:64-77`; test line 206 "upstream lỗi → giữ nguyên report cũ, lưu lastError"); `DELETE` removes (`[id]/route.ts:70-73`; test line 229). All pass under mongodb-memory-server |
| 4 | SC4 — "Chi tiết" opens modal with full core report (6 metric cards, monthly history, sources, top countries, keywords, AI referrals) + five click-to-load panels with "chưa cấu hình key" state | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | All 6 core sections present in `TrafficDetailModal.tsx:238-420` (SOURCE_LABELS covers all 13 channels, sorted desc, line 165-171); 5 panels mounted with per-key missing flags (`:431-435`); click-to-load enforced — **zero `useEffect` in any panel** (grep verified) and first-expand guard in `WhoisPanel.tsx:147-154`; 4-state shell `panels/panel-shell.tsx` (PanelLoading/PanelError+Thử lại/PanelMissingKey 'Chưa cấu hình key — vào Cấu hình API'/PanelEmpty); slice `.error` checked before success render (`WhoisPanel.tsx:140-142`); state machine + sliceMessage unit-tested (`admin-traffic-tab.test.tsx:238-256`). **Not exercised:** the actual expand→fetch→render DOM transitions (see behavior_unverified_items) |
| 5 | SC5 — lint/test/build green; every new CMS route in the 401/403 auth-gate inventory | ✓ VERIFIED (caveat on repo lint) | Ran this session: `npx vitest run tests/lib/traffic + 4 traffic test files` → **179/179 passed (9 files)**; `npx tsc --noEmit` → exit 0; scoped eslint over all phase files → **0 errors / 5 unused-catch warnings**; all **16 traffic verbs registered** in `tests/api/cms-auth-401.test.ts:230-249` with the fs-glob inventory guard passing in the suite. Caveat: repo-wide `npm run lint` remains red — pre-existing baseline (128 errors at 06-01 start, 184 after @playwright/test restoration made pre-existing browser tests lintable), none authored by this phase (deferred-items #2/#5; page.tsx error count byte-identical to base commit per 06-02). `npm run build` green per both summaries (not re-run per orchestrator instruction; tsc independently clean) |

**Score:** 3/5 truths verified (2 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Manual UAT of the Traffic tab with a live TabAPI credential | Human step (not a later phase) | deferred-items.md #3/#4 — "Cannot be automated in this environment (no live upstream credential); first manual run of the tab completes it" — surfaced as this report's human_verification items |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/traffic/*.ts` (14 modules) | Ported dependency-free data layer, no env coupling | ✓ VERIFIED | All present; `process.env` only in `credentials.ts` (sanctioned resolver) — 0 matches in routes, 0 in other libs; injectable fetchImpl throughout (`tabapi.ts:37,74`) |
| `src/types/traffic/*` | snake_case DTO modules + index | ✓ VERIFIED | Present, imported by routes, libs and components |
| `src/lib/traffic/credentials.ts` | DB-primary/env-fallback resolver + mask + missing list | ✓ VERIFIED | Wired into config route + domains routes + all panel routes |
| TrafficDomainModel (models.ts) | Persistent collection, unique domain, Mixed report, lastError | ✓ VERIFIED | models.ts:352-394; HMR-safe export |
| 11 route files under `src/app/api/v1/cms/traffic/` | config GET/PUT, domains GET/POST, [id] GET/DELETE, refresh POST, 8 panel routes | ✓ VERIFIED | All present, all guarded (401→403), all registered in cms-auth-401 inventory |
| `src/components/admin/traffic/*` (settings card, table, modal, helpers, 5 panels + shell) | Traffic tab UI | ✓ VERIFIED (wiring) | All present, imported and rendered via page.tsx renderTrafficView (page.tsx:1651-1700, dispatch :3532, NavItem :3595) |
| `tests/lib/traffic/*` (5 test files + fixture) | Ported-lib unit tests | ✓ VERIFIED | 179/179 suite green |
| `tests/api/cms-traffic-{config,domains}.test.ts` | Route behavior tests | ✓ VERIFIED | 7 config tests + 10 domains tests, all green |
| `tests/components/admin-traffic-tab.test.tsx` | UI contract + helper units | ✓ VERIFIED | 45 tests green (source-contract + pure helpers per documented repo constraint) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| page.tsx | Traffic tab components | import + renderTrafficView dispatch + lazy useEffect | WIRED | page.tsx:11-18, 287-290, 850-879, 1651-1700, 3532, 3595 |
| TrafficSettingsCard | PUT/GET /api/v1/cms/traffic/config | trafficFetch (Bearer) | WIRED | TrafficSettingsCard.tsx:120-121; PUT sends only changed fields (`:106-111`) |
| TrafficDomainsTable | POST /domains, POST .../refresh, DELETE /[id] | trafficFetch | WIRED | Table:123, :142-144, :160-162 |
| TrafficDetailModal | GET /domains/[id] + POST refresh | trafficFetch | WIRED | Modal:119, :148-150; stored report on open (zero upstream) |
| Panels (5) | 8 panel routes | trafficFetch with exact route paths | WIRED | Whois:56,136; Trustpilot:69; Seranking:61,125; Ads:104,218; ReferringSites:53 |
| All 16 traffic verbs | cms-auth-401 inventory | handler imports + route table rows | WIRED | cms-auth-401.test.ts:64-75, 230-249; fs-glob guard green |
| Routes | getTraffic/libs | resolveTrafficCredentials (never process.env) | WIRED | grep `process.env` in `src/app/api/v1/cms/traffic/` → 0 matches |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| TrafficDomainsTable rows | `trafficRows` | GET /api/v1/cms/traffic/domains → TrafficDomainModel.find() | Yes — Mongo-backed, behavior-tested | ✓ FLOWING |
| Detail modal report | `report` | GET /domains/[id] → stored TrafficDomain.report | Yes — persisted TabAPI payload | ✓ FLOWING |
| Settings card display | `config.masked/source/months/missing` | GET /traffic/config → SettingModel + env resolve | Yes — behavior-tested masked payload | ✓ FLOWING |
| Panel data | per-panel state | 8 provider routes → ported libs → upstream APIs | Yes at code level (live upstream pending manual UAT) | ✓ FLOWING (upstream live-check deferred) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full phase test set | `npx vitest run tests/lib/traffic tests/api/cms-traffic-domains.test.ts tests/api/cms-traffic-config.test.ts tests/api/cms-auth-401.test.ts tests/components/admin-traffic-tab.test.tsx` (TEMP/TMP → .tmp-mongoms) | 9 files, **179/179 passed**, 16.98s | ✓ PASS |
| TypeScript | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Scoped lint (phase files) | `npx eslint src/lib/traffic/** src/types/traffic/** src/app/api/v1/cms/traffic/** src/components/admin/traffic/** tests/...` | 0 errors, 5 warnings (unused-catch style) | ✓ PASS |
| Refresh-preserves-report invariant | named test `upstream lỗi → giữ nguyên report cũ, lưu lastError` (cms-traffic-domains.test.ts:206) | passed in suite | ✓ PASS |
| Duplicate upsert invariant | named test `domain trùng lặp → upsert (vẫn 1 document)` (:114) | passed in suite | ✓ PASS |
| Missing-key zero-fetch invariant | named test `thiếu TABAPI key → 500 missing_api_key, không gọi upstream` (:134) | passed in suite | ✓ PASS |
| Masked-GET invariant | named test `trả về chỉ giá trị đã mask — không bao giờ lộ key thô` (cms-traffic-config.test.ts:65) | passed in suite | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared or conventional for this phase — SKIPPED (no probes).

### Requirements Coverage (TRF-*)

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TRF-01 | 06-01, 06-02 | Credential management: 5 keys + months, masked GET, DB/env fallback, keys never leave server, admin-only | ✓ SATISFIED | credentials.ts resolve/mask; config route 401/403 + masked payload + clear-on-empty + cache invalidation; SettingSchema fields; 7 behavior tests green; UI masked-only rendering (SettingsCard reads only `config.masked/source`) |
| TRF-02 | 06-01, 06-02 | Add & run: normalize → fetch TabAPI report → upsert; Vietnamese errors | ✓ SATISFIED | domains/route.ts POST chain (normalizeDomain:32, missing-key guard:45-51 pre-fetch, getTraffic:53, upsert:55-59, TrafficApiError passthrough:71-76); 5 behavior tests green incl. 402 passthrough; UI handleAdd wired with role="alert" Vietnamese errors |
| TRF-03 | 06-01 | Persistent list; refresh forces re-fetch preserving previous report on failure; delete removes | ✓ SATISFIED | TrafficDomainModel (unique domain); refresh `force:true` + lastError-only-on-failure (report untouched); [id] GET zero-upstream; DELETE; 5 behavior tests green (persistence under mongodb-memory-server) |
| TRF-04 | 06-02 | List table: 10 columns, client search + sort, null → "—" | ✓ SATISFIED (render pending manual UAT) | filterRows/sortRows/momTrend/formatRelativeTime unit-tested; 10 column headers + aria-sort + empty/skeleton states source-pinned; nulls render "—" (`sortRows` sinks nulls; MetricCell/table null guards) |
| TRF-05 | 06-01, 06-02 | Detail modal: core report + 5 click-to-load panels with slice-error + missing-key states | ✓ SATISFIED (render pending manual UAT) | 8 panel routes ported (soft-slice whois/trustpilot/referring-sites/seranking vs hard-error ads — both spot-checked at source); modal 6 sections present; panels zero-useEffect click-to-load; derivePanelPhase + sliceMessage unit-tested; missing-key states from /config missing list |

No orphaned TRF requirements (REQUIREMENTS.md maps TRF-01..05 → Phase 6; both plans declare them).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TBD/FIXME/XXX/HACK markers in any phase file; no stub returns; no placeholder data paths (only HTML `placeholder=` input attributes) | ℹ️ Info | None |

### Regression / Anti-Goal Checks

| Check | Result | Evidence |
|-------|--------|----------|
| traffic-web untouched | ✓ PASS | `git -C D:\affiliate\traffic-web status`: only staged `.idea/inspectionProfiles/Project_Default.xml` (6-line IDE artifact, not source); `git diff HEAD -- src package.json` → **empty**; last commit d07120c dated 2026-11-03 (predates phase start 2026-11-13) |
| No secrets in client components | ✓ PASS | grep TABAPI_KEY/WHOIS_API_KEY/SERPAPI_KEY/SE_RANKING_API_KEY/TRUSTPILOT_SCRAPER_URL in `src/components/` + `src/app/admin/` → only **env-var NAME literals** consumed from the server's `missing` list (TrafficDetailModal.tsx:176-180, page.tsx:1654) — the designed contract; no key VALUES; SettingsCard renders `config.masked` only |
| No route returns credential values | ✓ PASS | config GET/PUT return masked only; panel/domains routes return provider data or error codes+messages |
| New routes in 401/403 inventory | ✓ PASS | 16 verbs registered (cms-auth-401.test.ts:230-249); fs-glob inventory guard green in the passing suite |
| No `process.env` in route handlers / ported libs | ✓ PASS | grep: 0 matches under `src/app/api/v1/cms/traffic/`; only credentials.ts (sanctioned) in `src/lib/traffic/` |

### Deviations & Gaps Found

**No gaps_found-level failures.** Deviations, all documented and out of blocking scope:

1. **Repo-wide `npm run lint` is red (184 errors)** — pre-existing baseline condition (128 errors before the phase, in files the phase never touched; growth caused by 06-01's @playwright/test restore making pre-existing `tests/browser/*` lintable). Scoped eslint over every phase file: **0 errors**. Logged in deferred-items #2/#5. Phase's own surface is lint-clean.
2. **UI runtime behavior not DOM-tested** — the repo has no jsdom/@testing-library (vitest `environment:'node'`); component tests use the plan-prescribed source-contract + pure-helper approach (06-02 Deviation 1). The click→render transitions of SC2/SC4 are therefore ⚠️ PRESENT_BEHAVIOR_UNVERIFIED and route to the manual UAT already recorded in deferred-items #3/#4.
3. **Manual UAT with live TabAPI credential deferred** — cannot run in this environment; all automatable equivalents are pinned by tests with stubbed fetch.
4. **traffic-web has one staged IDE file** (`.idea/inspectionProfiles/Project_Default.xml`) — cosmetic IDE artifact, zero source impact; not a phase modification.
5. **`npm run build` not re-run** per orchestrator instruction (both summaries report green; `tsc --noEmit` independently verified exit 0 this session).

## Gaps Summary

The backend delivers everything the phase promised, with the strongest automated evidence this repo supports: credentials resolution/masking, add-&-run upsert semantics, persistence with refresh-preserves-report, Vietnamese error mapping, auth gating, and the 401/403 inventory are all **behaviorally proven by 179 passing tests**; the UI is fully wired to those routes with masked-only rendering and click-to-load credit discipline enforced in source. What remains is exactly what the phase itself deferred: one manual UAT pass with a live TabAPI credential to observe the browser-level render transitions (SC2/SC4) — recorded as human verification, not a code gap.

---

_Verified: 2026-11-14T10:22:45Z_
_Verifier: the agent (gsd-verifier)_
