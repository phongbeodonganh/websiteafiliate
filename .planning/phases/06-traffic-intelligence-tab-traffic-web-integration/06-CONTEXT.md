# Phase 06 Context — Traffic Intelligence Tab (traffic-web integration)

**Created:** 2026-11-13 · **Approved by user** (scope decisions confirmed via Q&A before planning)

## User intent

Integrate the standalone `D:\affiliate\traffic-web` (TabAPI-based traffic dashboard) into the websiteafiliate admin as a new **Traffic** tab, modeled on the Affiora guide List-Domain UX (https://rs.affiora.io/guide.html#s3/#s4/#s9):

1. A section to enter the API keys that traffic-web keeps in its env
2. A persistent table of tracked domains with core traffic metrics (visits, ranks, bounce, trend…)
3. "Thêm & chạy" (Add & run) — add a domain and fetch its report in one step
4. A "Chi tiết" button per row opening the full report

## User decisions (locked)

- **Detail scope:** core TabAPI report + ALL five extended panels (Whois, Trustpilot, SE Ranking, Google Ads Transparency, Referring sites), click-to-load in the detail modal
- **GSD placement:** new Phase 6 INSERTED into current milestone V5.2; depends on Phase 2 only (admin shell + auth + settings pattern); independent of Phases 3–5

## Source analysis (from exploration, 2026-11-13)

### traffic-web (D:\affiliate\traffic-web) — what gets ported

- **Pure, dependency-free libs** (`src/lib/`): `cached-store.ts` (TTL store: 24h default, max 100, in-flight dedup, `clear()`), `domain.ts` (`normalizeDomain` + `DomainValidationError`), `config.ts` (`getTrafficMonths`, 3–12, default 3), `format.ts` (7 vi-VN formatters), `tabapi.ts` (`getTraffic(domain, apiKey, months, fetchImpl)`, cache key `${domain}:${months}`, `clearTrafficCache`), `whois.ts`, `trustpilot.ts`, `seranking.ts`, `ads-transparency.ts`, `referring-sites.ts` — all take credentials as **parameters** (env read happens at route level) and accept injectable `fetchImpl` for tests
- **Types** (`src/types/`): `traffic.ts` (`TrafficResponse`, `TrafficOverview{global_rank, visits, bounce_rate, pages_per_visit, time_on_site_seconds, country_rank[], month}`, `MonthlyVisit`, `TrafficSources` 13 fields, `TopKeyword`, `TopRegion`, `AiTraffic`), `ads.ts`, `whois.ts`, `trustpilot.ts`, `seranking.ts`, `referring-sites.ts` — snake_case passthrough DTOs
- **Env vars:** `TABAPI_KEY` (traffic + referring-sites), `SERPAPI_KEY` (ads + ads/detail), `WHOIS_API_KEY` (whois + whois/history), `SE_RANKING_API_KEY` (seranking/*), `TRUSTPILOT_SCRAPER_URL` (trustpilot), `TRAFFIC_MONTHS`
- **Two error conventions:** hard-fail routes (traffic, ads) vs soft "slice" `{ data, error }` HTTP-200 responses (whois, trustpilot, referring-sites, seranking) — UI must check slice `.error`
- **Tests + fixtures exist** (`src/test/fixture.ts`) and port cleanly (fetchImpl DI)
- Known anti-pattern to fix while porting: cache not keyed by API key → we clear all in-memory caches whenever credentials are saved

### websiteafiliate — conventions the phase must follow

- Admin is one client page `src/app/admin/page.tsx`: tabs = client state synced to `?tab=`; `ADMIN_ONLY_TABS` set (line 73), sidebar `<NavItem>` block (~3494–3510), `renderContent()` dispatch (~3424–3471), lazy per-tab loads via useEffect (~836–846)
- Auth: Bearer JWT in localStorage; server guard = `getAuthUser(req)` + `role !== 'admin'` 403; **mandatory** registration in `tests/api/cms-auth-401.test.ts` route table (fs-glob inventory guard fails on unregistered new routes)
- Admin APIs live under `src/app/api/v1/cms/**` with `{ status: 'success'|'error', data, message }` envelope (see `src/lib/cms-fetch.ts`)
- Settings singleton `SettingModel` (`src/lib/db/models.ts` 248–318) + `gemini_api_key` pattern: PUT stores/clears, GET masks `••••••${last4}`, env fallback precedence — direct template for traffic keys
- Existing upstream-payload DB cache pattern: `InsightsCacheModel`; existing admin UI: dark glassmorphism (`bg-slate-900/50 border-slate-800 rounded-2xl`), amber accents, lucide-react, `showCmsToast` + `dialog.*`
- Next.js 16 contract: read `node_modules/next/dist/docs/` before writing code; route params are Promises

## Requirement definitions (new, TRF-*)

- **TRF-01** Credential management: admin can save/clear all five traffic-web credentials + `TRAFFIC_MONTHS` in the Traffic tab; masked reads; DB primary / env fallback; keys never leave the server
- **TRF-02** Add & run: entering a domain/URL and clicking "Thêm & chạy" normalizes it, fetches the TabAPI report, and upserts a persistent row; Vietnamese errors on failure
- **TRF-03** Persistent list: tracked domains survive restarts (MongoDB `TrafficDomain`); refresh forces re-fetch; delete removes
- **TRF-04** List table: Domain, visits/month, global rank, country rank, bounce rate, pages/visit, top country, MoM trend, updated-at; client search + column sort
- **TRF-05** Detail modal: full core report + five click-to-load extended panels with "chưa cấu hình key" states when their credential is absent
