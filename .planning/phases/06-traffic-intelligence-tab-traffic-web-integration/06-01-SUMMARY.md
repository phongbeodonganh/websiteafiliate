---
phase: 06-traffic-intelligence-tab-traffic-web-integration
plan: 01
subsystem: traffic-backend
tags: [traffic-web, tabapi, cms-api, credentials, mongodb, porting]
requires:
  - Phase 2 admin shell + auth (getAuthUser, SettingModel settings pattern)
  - traffic-web source repo (read-only port source)
provides:
  - src/lib/traffic/* — 12 ported, dependency-free data modules (zero process.env coupling, injectable fetchImpl)
  - src/types/traffic/* — 6 snake_case DTO type modules + index re-export
  - resolveTrafficCredentials / maskKey / missingEnvNames (DB primary, env fallback)
  - clearAllTrafficCaches() aggregate invalidation
  - TrafficDomainModel persistent collection
  - 11 admin routes under /api/v1/cms/traffic/** (config GET/PUT, domains GET/POST, domains/[id] GET/DELETE, refresh POST, 7 provider panels)
affects:
  - Plan 02 (Traffic tab UI renders everything from these routes)
tech-stack:
  added: []
  patterns:
    - separated admin guard (401 then 403) on every new route
    - soft-slice { data, error } HTTP-200 convention for panel routes (whois/trustpilot/referring-sites/seranking) vs hard-error envelope for ads routes
    - upsert-by-domain for Add & Run
key-files:
  created:
    - src/lib/traffic/{cached-store,caches,config,domain,format,tabapi,whois,whois-insights,trustpilot,seranking,ads-transparency,referring-sites,backlink-sanitize,credentials}.ts
    - src/types/traffic/{index,traffic,ads,whois,trustpilot,seranking,referring-sites}.ts
    - src/app/api/v1/cms/traffic/config/route.ts
    - src/app/api/v1/cms/traffic/domains/route.ts
    - src/app/api/v1/cms/traffic/domains/[id]/route.ts
    - src/app/api/v1/cms/traffic/domains/[id]/refresh/route.ts
    - src/app/api/v1/cms/traffic/whois/route.ts
    - src/app/api/v1/cms/traffic/whois/history/route.ts
    - src/app/api/v1/cms/traffic/trustpilot/route.ts
    - src/app/api/v1/cms/traffic/referring-sites/route.ts
    - src/app/api/v1/cms/traffic/seranking/ads/route.ts
    - src/app/api/v1/cms/traffic/seranking/competitors/route.ts
    - src/app/api/v1/cms/traffic/ads/route.ts
    - src/app/api/v1/cms/traffic/ads/detail/route.ts
    - tests/lib/traffic/{fixture,domain.test,config.test,format.test,tabapi.test,credentials.test}.ts
    - tests/api/cms-traffic-config.test.ts
    - tests/api/cms-traffic-domains.test.ts
  modified:
    - src/lib/db/models.ts (SettingSchema traffic_* fields + TrafficDomainSchema/TrafficDomainModel)
    - tests/api/cms-auth-401.test.ts (traffic route inventory: 6 domains verbs + 8 panel verbs + config GET/PUT)
key-decisions:
  - Separated admin guard (401 no-token / 403 non-admin, insights-style) on all 11 traffic routes → all registered as 401 in cms-auth-401 inventory
  - Credential resolution centralized in src/lib/traffic/credentials.ts; routes never read process.env (grep-verified zero matches under src/app/api/v1/cms/traffic)
  - Error envelope on traffic routes = cms envelope { status:'error', error:{code,message}, message } — preserves traffic-web codes/Vietnamese messages while matching repo convention
  - GET /domains returns full stored reports (no pagination) — admin scale is tens of domains, documented in code
  - lastError subdocument persists on refresh failures so a transient upstream error never destroys the previous report
requirements-completed: [TRF-01, TRF-02, TRF-03, TRF-05]
estimate:
  tokens: 90000
  tasks: 4
  confidence: med
actuals:
  tokens: 105400   # chars/4 over realized diff: 43 files, 4244 insertions
  tasks: 4
  commits: 4
duration: ~2 sessions — Tasks 1–2 on 2026-11-13 (~10 min), Tasks 3–4 + verification on 2026-11-14 (~55 min)
completed: 2026-11-14
status: complete
---

# Phase 6 Plan 1: Traffic Backend (traffic-web data layer + CMS routes) Summary

Ported the complete traffic-web data layer (12 lib modules + 6 type modules, zero env coupling, injectable fetch) and built the full Traffic-tab backend: masked credential storage with DB-primary/env-fallback, the persistent TrafficDomain collection with add&run/refresh/detail/delete, and all 7 provider panel routes — 43 files, 4244 insertions, 134 tests green, production build green.

## Accomplishments

- **TRF-01** `GET/PUT /api/v1/cms/traffic/config`: five credential fields + `traffic_months` (3–12) in SettingSchema; GET returns masked values (`••••••last4`) + per-key source (db|env|null) + Vietnamese-labeled missing list; PUT stores/clears (empty string clears), validates months, and invalidates all six in-memory traffic caches via `clearAllTrafficCaches()`.
- **TRF-02** `POST /api/v1/cms/traffic/domains` (Add & Run): normalizeDomain → 400 invalid_domain (Vietnamese), missing key → 500 missing_api_key with **zero fetch attempts**, getTraffic (24h cache, in-flight dedup) → upsert by domain — duplicates update instead of duplicating; upstream 402 passes through as `insufficient_credits` + "Tài khoản TabAPI không đủ credits."
- **TRF-03** TrafficDomain collection (unique domain index, Mixed report, lastFetchedAt, lastError) + `GET /domains` (lastFetchedAt desc, stored reports, no pagination by design), `GET /domains/[id]` (stored report only — zero upstream calls, pinned by test), `POST /domains/[id]/refresh` (force:true bypasses cache read; upstream failure keeps previous report intact and records lastError), `DELETE /domains/[id]`.
- **TRF-05** 7 provider panel routes ported verbatim from traffic-web (query params, validation regexes: page_token, `AR\d+`, `CR\d+`, 2-letter source; soft-slice vs hard-error conventions; Vietnamese messages) with credentials resolved via `resolveTrafficCredentials` only.
- **Auth gate**: all 16 traffic verbs registered in the cms-auth-401 inventory; every route 401 without token / 403 non-admin (fs-glob inventory guard green).
- Ported lib/types took only import-path rewrites to `@/` aliases; `getTraffic` gained `{ force?, fetchImpl? }` opts; `createCachedStore` gained `refresh()`; transitive deps whois-insights + backlink-sanitize ported too.

## Tasks

| Task | Name | Commit | Key files |
| ---- | ---- | ------ | --------- |
| 1 | Port traffic-web pure libs + types + lib tests | 812eb24 | src/lib/traffic/* (12 libs), src/types/traffic/* (6), tests/lib/traffic/* (5) |
| 2 | Credential storage + traffic/config GET/PUT | ac7fcb2 | models.ts (SettingSchema), credentials.ts, config/route.ts, credentials.test.ts, cms-traffic-config.test.ts |
| 3 | TrafficDomain model + domains CRUD routes | 3a94de2 | models.ts (TrafficDomain), domains routes ×3, cms-traffic-domains.test.ts, cms-auth-401.test.ts |
| 4 | Provider panel routes (8 files) | e3d832e | whois, whois/history, trustpilot, referring-sites, seranking/ads, seranking/competitors, ads, ads/detail + cms-auth-401.test.ts |

## Deviations from Plan

**1. [Rule 3 - Blocking fix] Restored declared-but-missing @playwright/test dependency**
- **Found during:** plan-level `npm run build`
- **Issue:** `@playwright/test@^1.64.1` is declared in package.json but absent from node_modules → `next build` and `tsc --noEmit` failed on pre-existing `playwright.config.ts` / `tests/browser/*.pw.ts` (broken on the base commit before this plan).
- **Fix:** plain `npm install` (lockfile-respecting; added exactly 3 packages; package.json/package-lock.json untouched).
- **Files modified:** none in repo (node_modules only)
- **Commit:** n/a

**2. [Rule 1 - Bug] Mongoose deprecation in domains upsert**
- **Found during:** Task 3 test run
- **Issue:** `findOneAndUpdate(..., { new: true })` deprecated in this mongoose version (noisy per-test warnings).
- **Fix:** switched to `{ upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }`.
- **Files modified:** src/app/api/v1/cms/traffic/domains/route.ts
- **Commit:** 3a94de2

**3. [Continuation note]** Tasks 1–2 were already committed on this branch by a prior session (812eb24, ac7fcb2); this session verified their 110 tests green before resuming at Task 3.

## Issues Encountered

- **C: drive at 0 bytes free**: mongod (mongodb-memory-server) aborted with `fassert()` because WiredTiger could not preallocate journal files in %TEMP%. Worked around by redirecting `TEMP`/`TMP` to `D:\affiliate\websiteafiliate\.tmp-mongoms` for test/build commands (non-destructive; no user data touched). Machine cleanup deferred — see `deferred-items.md`.
- **Repo lint baseline**: `npm run lint` fails with 128 pre-existing errors in files this plan never touched; scoped eslint over every file this plan created/modified returns **0 errors** (5 warnings matching the codebase's existing unused-catch-var style).

## Verification Results

| Check | Result |
| ----- | ------ |
| `npx vitest run tests/lib/traffic tests/api/cms-traffic-domains.test.ts tests/api/cms-traffic-config.test.ts tests/api/cms-auth-401.test.ts` | ✅ 8 files, 134/134 passed |
| `npx tsc --noEmit` | ✅ exit 0 (clean after dependency restore) |
| `npm run lint` | ⚠️ repo baseline failures pre-exist (128 errors, unrelated files); scoped lint on all plan files: 0 errors |
| `npm run build` | ✅ succeeds; all 11 traffic routes in the route manifest |
| Manual smoke (dev server + real TABAPI_KEY) | ⏸ not runnable here (no live TabAPI credential; C: full) — deferred, see `deferred-items.md` |

Acceptance-criteria spot-checks: `grep process.env src/app/api/v1/cms/traffic` → 0 matches; `process.env` in src/lib/traffic only inside credentials.ts/config.ts (the single sanctioned resolution helper); duplicate POST → 1 doc; GET [id] → zero fetch calls; 402 passthrough preserves code + Vietnamese message; missing key → 500 missing_api_key with zero fetch attempts.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: admin-proxy-endpoints | src/app/api/v1/cms/traffic/** | 11 new server-side upstream proxies (SSRF-style upstream calls with admin credentials). Mitigated in-plan: separated getAuthUser+admin 403 guard first on every verb, credentials never leave the server (masked reads only), all 16 verbs pinned in the cms-auth-401 inventory test. |

## Self-Check: PASSED

- All key files exist (spot-checked 17 paths — all found).
- All 4 commit hashes exist on `feature/namdt25-develop` (812eb24, ac7fcb2, 3a94de2, e3d832e).
- No stubs: TODO/FIXME/placeholder grep over created sources → 0 matches; no unwired data paths (all routes backed by ported libs + TrafficDomainModel).
