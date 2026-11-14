---
phase: 06-traffic-intelligence-tab-traffic-web-integration
plan: 02
subsystem: traffic-admin-ui
tags: [traffic-web, admin-ui, tabapi, glassmorphism, vietnamese, click-to-load]
requires:
  - Plan 01 routes under /api/v1/cms/traffic/** (config GET/PUT, domains CRUD + refresh, 8 panel routes)
  - Phase 2 admin shell (NavItem/ADMIN_ONLY_TABS/renderContent/lazy-tab-load patterns, showCmsToast, dialog.*)
provides:
  - Traffic tab in the admin panel (?tab=traffic, admin-only) — the only user-facing surface of Phase 6
  - TrafficSettingsCard (masked credential management, PUT only-changed-fields, db/env/missing chips)
  - TrafficDomainsTable (Affiora-style Add & run + 10-column List Domain with search/sort/trend)
  - TrafficDetailModal (6-section core report + 5 click-to-load extended panels)
  - 5 panel components + shared panel shell with the 4-state click-to-load contract
  - src/components/admin/traffic/traffic-helpers.ts (Bearer-token fetch preserving Vietnamese route messages + pure view helpers)
affects:
  - Phase closure (TRF-01/02/04/05 UI halves complete; TRF-03 was backend-only in 06-01)
tech-stack:
  added: []
  patterns:
    - view renderer in page.tsx stays thin — state owned by page, data ops delegated to traffic components
    - Bearer-token fetch helper (trafficFetch) instead of cmsFetch for traffic routes — preserves the routes' Vietnamese error messages on 400/402/500/502
    - click-to-load panels: zero useEffect fetches; expand triggers first load; slice {data,error} guarded before any success render
    - setState-in-effect avoided (react-hooks/set-state-in-effect) — override-state pattern in settings card, await-gated states in modal
key-files:
  created:
    - src/components/admin/traffic/traffic-helpers.ts
    - src/components/admin/traffic/TrafficSettingsCard.tsx
    - src/components/admin/traffic/TrafficDomainsTable.tsx
    - src/components/admin/traffic/TrafficDetailModal.tsx
    - src/components/admin/traffic/panels/panel-shell.tsx
    - src/components/admin/traffic/panels/WhoisPanel.tsx
    - src/components/admin/traffic/panels/TrustpilotPanel.tsx
    - src/components/admin/traffic/panels/SerankingPanel.tsx
    - src/components/admin/traffic/panels/AdsPanel.tsx
    - src/components/admin/traffic/panels/ReferringSitesPanel.tsx
    - tests/components/admin-traffic-tab.test.tsx
  modified:
    - src/app/admin/page.tsx (surgical: ADMIN_ONLY_TABS, imports, traffic state block, lazy useEffect branch, renderContent dispatch, renderTrafficView, NavItem)
key-decisions:
  - Component tests written as node-environment source-contract (fs read + indexOf, 02-08 pattern) + pure-helper unit tests — the repo has NO jsdom/@testing-library and its vitest config is environment:'node'; installing a render stack would have required a package-legitimacy checkpoint for zero added coverage
  - trafficFetch (Bearer-token pattern) replaces cmsFetch for all traffic calls — cmsFetch's status-mapped English copy would discard the routes' actionable Vietnamese messages (missing_api_key/invalid_domain/insufficient_credits) on non-400 statuses
  - Search/sort/trend/MoM/slice-error logic extracted into pure exported helpers (filterRows, sortRows, momTrend, sliceMessage, derivePanelPhase, formatRelativeTime, upsertRow) so behavior is unit-tested without a DOM
  - SE Ranking panel stays collapsed with two per-dataset load buttons (ads/competitors each cost credits) — expands without fetching; only button clicks load
  - Missing-key states derive from /config masked payload missing list (env-var names) — panels show 'Chưa cấu hình key — vào Cấu hình API' with load actions suppressed, never a doomed fetch
  - AdsPanel 'now' captured via useState initializer (render-purity rule) — active/long-running windows frozen at data-load time like traffic-web's AdsResults
requirements-completed: [TRF-01, TRF-02, TRF-04, TRF-05]
estimate:
  tokens: 90000
  tasks: 4
  confidence: med
actuals:
  tokens: 34600   # chars/4 over realized diff: 12 files, 3008 insertions
  tasks: 4
  commits: 4
duration: ~30 min (single session, 2026-11-14)
completed: 2026-11-14
status: complete
---

# Phase 6 Plan 2: Traffic Admin UI (tab wiring + settings + List Domain + detail modal) Summary

Built the complete Traffic Intelligence tab in the admin panel — credential settings card with masked display, Affiora-style Add & run + 10-column List-Domain table with client search/sort/MoM trend, and a detail modal covering the full core report plus five credit-conscious click-to-load extended panels — all Vietnamese copy on the dark glassmorphism theme, consuming exclusively the Plan 01 routes. 12 files, 3008 insertions, 45 tests green, tsc clean, production build green.

## Accomplishments

- **TRF-01** `?tab=traffic` is an admin-only tab: 'traffic' in `ADMIN_ONLY_TABS`, Globe NavItem between Insights and the System group, admin-gated `renderContent` branch (non-admins hit the existing D-13 access-denied contract), lazy useEffect loading `GET /traffic/config` + `GET /traffic/domains` only on tab entry. `TrafficSettingsCard`: collapsible (auto-expanded while keys missing), password-typed key inputs + scraper-URL text input + months 3–12 select, per-key masked value (`••••••last4`) with `Đã lưu`/`Từ env`/`Chưa có` chips, PUT sends **only** changed fields (empty = untouched, per-field X = explicit clear, months only when it differs), success re-syncs config + toast `Đã lưu cấu hình traffic`. Amber banner `Chưa cấu hình TabAPI key — nhập trong phần Cấu hình để sử dụng` renders when `config.missing` includes TABAPI_KEY.
- **TRF-02** Add & run: single-step input + `Thêm & chạy` (spinner + disabled while submitting) → `POST /traffic/domains`; success upserts the row without a reload (upsert-by-id-or-domain) + toast `Đã thêm domain`; failure renders the route's Vietnamese message inline (`role="alert"`) and in a toast.
- **TRF-04** List-Domain table: 10 columns (Domain, Lượt truy cập/tháng, Hạng toàn cầu, Hạng quốc gia code+rank, Bounce rate, Trang/phiên, Top quốc gia code+share, Xu hướng ▲/▼ from last two monthly points, Cập nhật relative vi-VN time, Hành động), client-side domain search, per-column asc/desc sort with `aria-sort` (nulls always last), vi-VN formatting with `—` for nulls, skeleton loading, `Chưa theo dõi domain nào` empty state, hover-revealed Chi tiết/Làm mới/Xóa; refresh POSTs `.../refresh` with a row-level spinner; delete requires `dialog.confirm('Bỏ theo dõi domain này?')` then DELETE.
- **TRF-05** Detail modal: opens from Chi tiết and loads the **stored** report via `GET /traffic/domains/[id]` (zero upstream on open); header shows domain + report month + `Dữ liệu ước tính` badge + `Làm mới` (POST refresh → updates modal + parent row); six core sections — 6 metric cards (visits/global rank/country rank/bounce/pages/duration), Lịch sử theo tháng with client-computed MoM %, Nguồn traffic (13 channels sorted desc with amber bars), Top quốc gia, Từ khóa hàng đầu (volume/CPC/giá trị ước tính), AI referrals (latest % + delta pt) — plus the `Dữ liệu mở rộng` section with five click-to-load panels: Whois (registrar/created/expires/age/privacy cards + nameservers/status + `Xem lịch sử` sub-load of `/whois/history`), Trustpilot (name/TrustScore/stars/review count/categories/rating distribution), SE Ranking (two per-dataset buttons → ads + competitors), Google Ads Transparency (advertisers/creatives/active/longest-running cards + grouped-by-advertiser + `Tải thêm` via next_page_token + per-creative expand → `/ads/detail`), Referring sites (DR/backlinks/referring domains/dofollow + top backlinks + the 5-credit 24h-cache disclosure). Every panel: loading/error(`role="alert"` + Thử lại)/`Chưa cấu hình key — vào Cấu hình API`/ready/empty states, never auto-fetches (zero useEffect in any panel).
- Shared `traffic-helpers.ts`: `trafficFetch` (Bearer token from localStorage, preserves envelope `message`/`error.message` Vietnamese copy) + pure helpers unit-tested directly.

## Tasks

| Task | Name | Commit | Key files |
| ---- | ---- | ------ | --------- |
| 1 | Tab wiring + credential settings card (TRF-01) | 650c889 | page.tsx, TrafficSettingsCard.tsx, traffic-helpers.ts, admin-traffic-tab.test.tsx |
| 2 | Add & run bar + List-Domain table (TRF-02, TRF-04) | f161232 | TrafficDomainsTable.tsx, page.tsx, tests |
| 3 | Detail modal — core report (TRF-05) | 09e9a9b | TrafficDetailModal.tsx, page.tsx, tests |
| 4 | Five click-to-load extended panels (TRF-05) | 032c6ac | panels/* (6 files), TrafficDetailModal.tsx, page.tsx, tests |

## Deviations from Plan

**1. [Rule 3 - Blocking fix] Component tests as source-contract + pure helpers instead of @testing-library renders**
- **Found during:** Task 1 (test-infrastructure check)
- **Issue:** The orchestrator note assumed vitest+jsdom+@testing-library exist; the repo actually has none of them (`vitest.config.mts` is `environment:'node'`, no testing-library in package.json). The plan itself prescribes the "fs read + indexOf pattern like 02-08", which needs no DOM.
- **Fix:** Wrote `tests/components/admin-traffic-tab.test.tsx` as source-contract tests (02-08 pattern) plus direct unit tests of the pure helpers extracted for this purpose (filterRows/sortRows/momTrend/sliceMessage/derivePanelPhase/formatRelativeTime/upsertRow). Behavior-level acceptance criteria (search filters, sort toggles, 4 panel states, slice-error routing) are pinned through these unit tests + per-state source pins; no package install required.
- **Files modified:** tests/components/admin-traffic-tab.test.tsx (approach only)
- **Commit:** 650c889 (approach established), all subsequent tasks

**2. [Rule 1 - Bug] react-hooks/set-state-in-effect violations in new code**
- **Found during:** Tasks 1 & 3 lint
- **Issue:** Initial drafts synced state from props via `useEffect` (settings-card months select) and set loading state synchronously inside the modal's load effect — both flagged as errors by the repo's `react-hooks/set-state-in-effect` rule.
- **Fix:** Months select uses the override-state pattern (`monthsOverride ?? String(config?.months ?? 3)`, no effect); the modal's load effect sets state only after the `await` with an `active` cleanup flag; AdsPanel's `Date.now()` moved into a `useState` initializer (render-purity rule).
- **Files modified:** TrafficSettingsCard.tsx, TrafficDetailModal.tsx, AdsPanel.tsx
- **Commit:** 650c889 / 09e9a9b / 032c6ac respectively

**3. [Rule 1 - Bug] Test assertion corrections (2)**
- **Found during:** Tasks 3 & 4 test runs
- **Issue:** `'>Làm mới<'` assertion didn't match JSX text-node layout; the slice-error guard assertion wrongly required `sliceMessage` in AdsPanel — `/ads` is a **hard-error** route (non-2xx envelope) per the locked two-conventions decision, unlike the four soft-slice routes.
- **Fix:** Assertions corrected to match the actual copy; the guard test now asserts `sliceMessage` on the four soft-slice panels and `result.ok` + `setErrorMessage(result.message)` (and NOT sliceMessage) on AdsPanel — encoding the convention split instead of flattening it.
- **Files modified:** tests/components/admin-traffic-tab.test.tsx
- **Commit:** 09e9a9b / 032c6ac

## Issues Encountered

- **Mongo memory server TEMP redirect (carried from 06-01):** every vitest run still needs `TEMP`/`TMP` pointed at `D:\affiliate\websiteafiliate\.tmp-mongoms` (C: at 0 bytes); used for all test/build commands this session and the directory left in place for future runs (matches 06-01 practice).
- **Full-repo lint grew 128 → 184 errors:** the growth is 06-01's @playwright/test restoration making `tests/browser/*` + `playwright.config.ts` lintable — not 06-02. `page.tsx` error/warning counts are **byte-identical to the base commit** (56 errors / 22 warnings, verified via `git show HEAD:... | eslint --stdin` before/after), and all 11 files created by this plan lint with 0 errors / 5 warnings (unused-catch style matched to the codebase). Logged in `deferred-items.md` item 5.
- **Transient unused-var warnings** for `trafficRows`/`trafficLoading` (Task 1) and `trafficDetailRow` (Task 2) while state landed ahead of its consumer — resolved by Tasks 2/3 respectively; final scoped lint = base-identical.

## Verification Results

| Check | Result |
| ----- | ------ |
| `npx vitest run tests/components/admin-traffic-tab.test.tsx` | ✅ 45/45 passed (source-contract + pure-helper units) |
| `npx tsc --noEmit` | ✅ exit 0 after every task and at plan level |
| `npx eslint` over all 12 plan files | ✅ 0 errors; 56 errors/22 warnings all pre-existing in page.tsx untouched regions (byte-identical to base commit) |
| `npm run lint` (full repo) | ⚠️ 184 pre-existing errors in files this plan did not author (see Issues) — out of scope |
| `npm run build` | ✅ `✓ Compiled successfully in 39.0s`; route manifest unchanged (UI-only plan) |
| Manual UAT (dev server, admin login, real TabAPI key) | ⏸ deferred — carried from 06-01 item 3; recorded in `deferred-items.md` item 4 |
| Deep link `/admin?tab=traffic` | ✅ pinned: URL-sync effect + ADMIN_ONLY_TABS + admin-gated dispatch (existing searchParams machinery unchanged) |

Acceptance-criteria spot-checks: masked credentials never rendered raw (settings card reads only `masked`/`source`/`months`/`missing`); PUT payload built only from typed values + explicit clear flags; all 5 panels contain zero `useEffect` (click-to-load enforced); soft-slice `.error` checked before any success render on whois/trustpilot/referring-sites/seranking; hard-error envelope guarded on ads; `Tải thêm` paginates via `next_page_token`; Whois history is a second explicit click.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: admin-ui-credential-surface | src/components/admin/traffic/TrafficSettingsCard.tsx | UI face of the credential store. Mitigated: server returns masked values only (`••••••last4` — Plan 01 contract), card renders `type="password"` inputs and never echoes an unmasked value, keys are sent only to `PUT /api/v1/cms/traffic/config` over the admin's own Bearer token. |
| threat_flag: xss-via-upstream-content | src/components/admin/traffic/panels/*, TrafficDetailModal.tsx | Panels render third-party content (Trustpilot names/categories, ad snippets, backlink anchors/titles). Mitigated: React JSX escaping everywhere — no `dangerouslySetInnerHTML`, external images use `referrerPolicy="no-referrer"` with an eslint-pinned `<img>` exception, external URLs only rendered as text or hrefs from route-provided http(s) fields. |

## Self-Check: PASSED

- All 11 created files + 1 modified file exist on disk (spot-checked).
- All 4 commit hashes exist on `feature/namdt25-develop` (650c889, f161232, 09e9a9b, 032c6ac).
- No stubs: TODO/FIXME/placeholder grep over created sources → 0 matches; every panel/metric renders from real route payloads with explicit loading/error/missing/empty states (no mock data paths).
