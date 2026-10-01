# Requirements: AI Affiliate Hub (v1.0)

Derived from the governing V5.2 spec (`specv2.md`) + STANDING V3/V4 constraints (`.planning/intel/constraints.md`) + verified implementation gaps (`.planning/codebase/CONCERNS.md`, `GO_LIVE_TASKLIST.md`). No PRD-classified docs exist; these requirements are the functional scope distilled from the specs — nothing invented beyond them.

**Status legend:** `verify` = implemented, needs evidence/UAT · `partial` = implemented with known defects · `gap` = not implemented

---

## Authentication & RBAC (V5.2 §1.1, §4)

- **AUTH-01 — Canonical JWT session & auth guard** — Login (username + Bcrypt password) returns a 24h JWT; private requests carry `Authorization: Bearer`; **every** CMS route verifies through the single canonical `getAuthUser` guard (`src/lib/auth.ts`) — no per-route secrets or duplicate JWT logic. [V3 auth protocol STANDING; CONCERNS #2] — status: **partial** (canonical path done + tested; 5 routes — `cms/ai/generate-article`, `cms/blacklist/*` ×4 — still use fallback-secret duplicates)
- **AUTH-02 — Article data isolation:** editors/authors view and edit only articles they created (`author_id = user.id`); admin has full access to all. [V5.2 §4 RBAC matrix] — status: **verify** (covered by `tests/api/articles-ownership.test.ts`)
- **AUTH-03 — Affiliate link store admin-only:** link CRUD is fully hidden / 403 for editor & author; they may only select existing links to attach to articles. [V5.2 §4] — status: **verify**
- **AUTH-04 — User management:** admin manages users with `role` (admin/editor/author), `status` (active/inactive), `name`, `avatar`. [V5.2 §1.1] — status: **verify**

## Content Management (V5.2 §1.2, §1.3, §1.5)

- **CMS-01 — Article CRUD & publishing:** create/edit/publish articles with title, unique slug, excerpt, rich-text HTML content, thumbnail, draft/published status, featured flag. [V5.2 §1.3] — status: **partial** (works in the main admin tab, but 3 overlapping editors exist and `/admin/articles/edit/[id]` is broken — CONCERNS bugs #1, tech debt #2)
- **CMS-02 — SEO/GEO article fields:** articles carry `focus_keyword`, `key_takeaways`, `entities`, `faq_schema`; FAQ pairs auto-embed as FAQPage JSON-LD on the public page. [V5.2 §1.3 + §2.2] — status: **partial** (fields + AI takeaways exist; end-to-end editor flow needs consolidation/verification)
- **CMS-03 — Multi-position affiliate placements:** per-article placements at `top_cta` / `middle_comparison` / `footer_banner`, rendered data-driven on the public page for all articles (old and new). [V5.2 §1.3/§1.5; BUG-01 fix] — status: **verify**
- **CMS-04 — Two-level AI-niche taxonomy:** categories + sub_categories per the V5.2 §1.2 tree, manageable in CMS, assignable to articles. [V5.2 §1.2] — status: **verify**
- **CMS-05 — One consolidated editor flow:** a single primary create→edit→publish flow; the broken duplicate edit page is fixed or removed — no dead-end admin routes. [CONCERNS bugs #1, tech debt #2; required by the v1 success metric] — status: **gap**

## Affiliate & Tracking (V5.2 §1.4–§1.9; V3 flow)

- **AFF-01 — Affiliate link store:** admin-managed central store with `name`, `base_url`, `commission`, `cookie`; `base_url` restricted to http(s) schemes at the API boundary. [V5.2 §1.4; CONCERNS #9 / SEC-07] — status: **partial** (store works; scheme validation missing)
- **AFF-02 — Click tracking pipeline:** affiliate clicks log IP/UA/time/article context to `click_logs`, then 302 to `base_url` with `sub_id={article-slug}` attribution; CTAs render `rel="nofollow sponsored" target="_blank"`. [V3 data flow STANDING; V5.2 §1.6] — status: **verify** (happy path tested; abuse controls tracked as SEC-04)
- **AFF-03 — Blacklist interceptor:** blacklisted domains (wildcard) / exact URLs block affiliate redirects and render a warning page — rendered injection-safe. [V5.2 §1.8; CONCERNS #5] — status: **partial** (interception works; warning page interpolates blacklist data unescaped + loads Tailwind Play CDN)
- **AFF-04 — Blacklist bulk import + retroactive sweeper:** admin pastes any Google Sheet URL → auto CSV conversion → 300+ rows parsed (Project Name / Website URL / Reason / Blocked countries) → root domains extracted and bulk-saved → background sweep deactivates + marks `blacklisted` every matching active campaign. [V5.2 §1.9] — status: **verify** (implemented; route-local JWT fallback fixed via AUTH-01/SEC-02)

## SEO & GEO (V5.2 §2; GO_LIVE SEO-01/02/05)

- **SEO-01 — URL structure & legacy redirects:** article path `/article/[slug]`; every legacy `/bai-viet/[slug]` issues an immediate 301/307 redirect preserving Google rankings. [V5.2 §2.1] — status: **verify** (307 in place — spec-compliant)
- **SEO-02 — Structured data:** every article page auto-embeds `NewsArticle` JSON-LD (headline, image, datePublished, author, publisher from settings — production publisher per aidealsuk.com brand, D-003) with canonical exactly `https://aidealsuk.com/article/[slug]` (D-003 supersedes V5.2 §2.2's `aiaffiliatehub.com`). [V5.2 §2.2; D-003] — status: **verify** (canonical already resolves to aidealsuk.com)
- **SEO-03 — Crawl hygiene:** DB-driven sitemap.xml (published articles only) + robots.txt (disallow `/admin`, `/api`); search/filter URLs (`/?q=`) are noindex with a clean canonical. [GO_LIVE SEO-01/02/05; CONCERNS bug #2] — status: **partial** (sitemap/robots done; the `?q=` noindex fix was lost when the search moved to the homepage — currently indexable with canonical `/`)
- **SEO-04 — Settings-driven site metadata:** the settings singleton drives site title, meta description, focus keywords, canonical, hreflang/geo target, NAP, OG image, JSON-LD, head scripts (V4 field list). Production values follow D-003 (canonical aidealsuk.com, aidealsuk.com brand identity); palette/geoTarget per V5.2 §1.7 (primary #0056B3, accent #FF6B6B, geoTarget "US, VN, GLOBAL"). [V5.2 §1.7; V4 standing; D-003] — status: **partial** (mechanism exists; current defaults already say aidealsuk.com — confirm settings coverage of all V4 fields)

## Public Frontend (V5.2 §3; V4 §2.2; FE-02)

- **PUB-01 — Homepage tab grouping:** data-field-driven tabs — "Hot Tuần" (`is_featured` + high interaction, last 7 days), "Xem Nhiều" (`view_count DESC`), "Mới Nhất" (`created_at DESC`); level-1 category selection loads articles with a sub-category quick filter bar. [V4 §2.2 STANDING] — status: **partial** (tabs exist; exact V4 grouping logic needs verification/adjustment)
- **PUB-02 — V5.2 presentation standard:** B2B light Bento UI — background #F8F9FA, white cards with soft borders/shadows, Royal Blue #0056B3 primary, Coral Orange #FF6B6B conversion CTAs, Mint Emerald #20C997 verified labels; Breaking News Ticker directly under the nav linking the featured article; Hero Bento Grid 7:5 (main card + 2 stacked secondary niche cards with view counts); mobile-flawless. [V5.2 §3 GOVERNING; V3 NFR responsive] — status: **gap** (current public design is an editorial theme deviating from §3; `BreakingNewsTicker` component exists but is imported nowhere)
- **PUB-03 — Branded error pages:** `not-found.tsx` / `error.tsx` — unknown URLs render a branded 404 with correct HTTP status; DB outages render a branded error page instead of raw Next.js screens. [GO_LIVE FE-02; CONCERNS missing features] — status: **gap**

## Performance (V3 NFR STANDING; TECH-02; BUG-02)

- **PERF-01 — Cached public reads:** backend caching for public feeds per the V3 TTFB/caching NFR — homepage already uses `unstable_cache` + tag revalidation; extend to article-page reads and sitemap/robots (revalidate window instead of per-crawler-request DB hits); list APIs return excerpts, not full article HTML. [V3 NFR; TECH-02; CONCERNS perf #1–3] — status: **partial**
- **PERF-02 — Accurate view counting:** atomic `$inc` updates (no read-modify-write lost updates) + dedupe window so F5 refreshes don't inflate `view_count`; the RSC render stays read-only. [BUG-02; V5.2 §1.3 view_count; CONCERNS perf #1, bugs #3] — status: **gap**

## Security (V3 NFR STANDING; CONCERNS audit)

- **SEC-01 — No unauthenticated destructive endpoint:** the public seed route is removed or secret-gated and refuses to run in production; it must never `deleteMany` users/settings. [CONCERNS #1] — status: **complete** (route + seed libs + npm script deleted in 01-02; regression gate `tests/api/security-regressions.test.ts` runs on every `npm test`)
- **SEC-02 — No secrets in source:** zero secret literals (JWT fallback strings in 5 CMS routes, hardcoded Gemini API key + leaked project ID); required secrets are env-only with loud, actionable failure. [CONCERNS #2, #4; INTEGRATIONS warnings] — status: **gap**
- **SEC-03 — XSS-safe rendering of all content:** article HTML sanitization (existing) extended to the blacklist warning page (escape all interpolated data, drop Play CDN) and admin CSS/color injection points constrained (color-format validation). [V3 NFR XSS STANDING; CONCERNS #5, #11] — status: **partial**
- **SEC-04 — Abuse controls on public inputs:** rate limiting (existing per-IP sliding window pattern) on public write endpoints (subscribe, tracking click/redirect); ReDoS-safe search (`escapeRegExp` everywhere user text becomes a RegExp); trusted client-IP parsing (don't trust first XFF hop blindly). [CONCERNS #6, #7, #8] — status: **gap**

## Operations (CONCERNS fragile/missing; TESTING gaps)

- **OPS-01 — Deploy health check + rollback:** post-start health check on the VPS; failed start rolls back to the previous bundle instead of leaving the site down. [CONCERNS fragile #4] — status: **gap**
- **OPS-02 — Error monitoring:** production 500s observable without SSH (`pm2 logs` is the only signal today) — error tracking wired to a sink. [CONCERNS missing features] — status: **gap**
- **OPS-03 — Regression test suite:** parameterized "every CMS route 401s without a token" test; tests for public read APIs (incl. ReDoS input), sitemap/robots shape, seed guard; suite green in CI before deploy. [TESTING.md gaps; TECH-03 spirit] — status: **gap**

## Maintainability (CONCERNS tech debt)

- **HYG-01 — Single canonical data layer & no dead code:** `src/lib/db/schema.ts` twin, dead components, `drizzle-orm`/`pg`/`@google/genai` deps, root `sqlite.db*` and prototype clutter removed; `models.ts` is the only schema source. [CONCERNS tech debt #3–5] — status: **gap**
- **HYG-02 — Admin CMS modularized:** the ~4k-line single-file admin extracted tab-by-tab into per-tab modules with shared typed fetch hooks — no behavior change (URL-state sync preserved). [CONCERNS tech debt #1] — status: **gap**

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AFF-01 | Phase 1 | Complete |
| AFF-03 | Phase 1 | Complete |
| CMS-01 | Phase 2 | Gaps Found |
| CMS-02 | Phase 2 | Gaps Found |
| CMS-03 | Phase 2 | Gaps Found |
| CMS-04 | Phase 2 | Pending |
| CMS-05 | Phase 2 | Gaps Found |
| AUTH-02 | Phase 2 | Gaps Found |
| AUTH-03 | Phase 2 | Gaps Found |
| AUTH-04 | Phase 2 | Gaps Found |
| AFF-04 | Phase 2 | Gaps Found |
| SEO-01 | Phase 3 | Pending |
| SEO-02 | Phase 3 | Pending |
| SEO-03 | Phase 3 | Pending |
| PERF-01 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| AFF-02 | Phase 3 | Pending |
| PUB-01 | Phase 4 | Pending |
| PUB-02 | Phase 4 | Pending |
| PUB-03 | Phase 4 | Pending |
| SEO-04 | Phase 4 | Pending |
| HYG-01 | Phase 5 | Pending |
| HYG-02 | Phase 5 | Pending |
| OPS-01 | Phase 5 | Pending |
| OPS-02 | Phase 5 | Pending |
| OPS-03 | Phase 5 | Pending |

Coverage: 31/31 requirements mapped · no orphans · no duplicates.
