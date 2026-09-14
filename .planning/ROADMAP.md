# Roadmap: AI Affiliate Hub

## Overview

This is a **brownfield hardening roadmap**, not a build-from-scratch plan. The V5.2 system already exists and is deployed: auth/RBAC, article CMS with SEO/GEO fields, affiliate tracking with the blacklist interceptor, Gemini article generation, insider newsletter, GA4/GSC insights, and CI/CD to the VPS all work today. The journey to done therefore runs: **secure the exposed surface** (public seed route, fallback JWT secrets, leaked Gemini key, XSS/ReDoS vectors) → **make the core metric true** (one coherent CMS flow to create and publish SEO+GEO-ready articles per V5.2) → **meet the SEO contract and performance NFRs** (accurate counts, cached reads, crawl hygiene) → **align the public presentation to the V5.2 §3 Bento standard under the aidealsuk.com brand** (user decision D-003, overriding the spec's `aiaffiliatehub.com` branding values) → **harden production** (modular codebase, regression net, resilient deploys, visible errors). Every phase closes evidence-backed gaps from `.planning/codebase/CONCERNS.md`, `GO_LIVE_TASKLIST.md`, and the governing spec — nothing is rebuilt that already works.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Security Remediation** - Close the critical exposure holes: destructive seed route, forgeable CMS auth, secrets in source, XSS/ReDoS/abuse vectors
- [ ] **Phase 2: CMS End-to-End (V5.2)** - One working create→edit→publish flow with SEO/GEO fields, correct RBAC, and the blacklist bulk import + sweeper
- [ ] **Phase 3: SEO/GEO & Performance Hardening** - Accurate view counts, cached public reads, crawl-clean URLs, verified tracking pipeline
- [ ] **Phase 4: V5.2 Presentation & Brand Alignment** - Bento 7:5 hero, Breaking News ticker, V5.2 palette, settings-driven aidealsuk.com branding (D-003), branded 404/error pages
- [ ] **Phase 5: Production Readiness** - Modular admin, single canonical schema layer, regression test net, deploy health check + rollback, error monitoring

## Phase Details

### Phase 1: Security Remediation

**Goal**: The site is safe to expose to the open internet — no unauthenticated destructive access, no forgeable CMS auth, no secrets in source, and public inputs can't be abused for injection, DoS, or analytics poisoning.
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, AUTH-01, AFF-01, AFF-03
**Success Criteria** (what must be TRUE):

  1. An unauthenticated request to the seed endpoint is refused in production — a public URL can no longer wipe the database or reset admin credentials
  2. A JWT self-signed with any previously-hardcoded fallback secret is rejected with 401 by every CMS route, and logout revocation applies uniformly across all of them
  3. Source contains zero secret literals (JWT secrets, Gemini key, leaked project ID); starting without a required secret fails fast with an actionable error message
  4. A click on a blacklisted affiliate link shows the warning page with all blacklist-supplied text rendered inert (no HTML/script injection) and no third-party CDN script loaded
  5. Bursts of unauthenticated writes (subscribe / tracking click / redirect) are rate-limited, a crafted ReDoS search pattern does not hang the server, and affiliate `base_url` values are restricted to http(s)

**Plans**: 3/7 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — `/blocked` interception vertical: RSC warning page, 302 redirect swap, XSS-safe rendering (SEC-03, AFF-03)
- [x] 01-02-PLAN.md — Seed surface deletion + reset-admin CLI + security regression gate (SEC-01)
- [x] 01-03-PLAN.md — Affiliate base_url http(s) scheme validation at the write boundary (AFF-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-04-PLAN.md — Canonical JWT auth swap on 7 CMS routes + parameterized 401 suite (AUTH-01)
- [ ] 01-05-PLAN.md — Abuse controls: rate limiting + click dedupe on public write endpoints (SEC-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-06-PLAN.md — Secrets purge, D-07 key precedence, masked settings API, D-08 gates (SEC-02)
- [ ] 01-07-PLAN.md — IP trust fix (last-hop XFF + Nginx overwrite) + ReDoS hardening (SEC-04, D-14)

### Phase 2: CMS End-to-End (V5.2)

**Goal**: An admin can create and publish an SEO+GEO-ready article end-to-end through one coherent CMS flow per the governing V5.2 spec — correct RBAC, working edit loop, taxonomy and user management, and the blacklist import with retroactive sweeper.
**Depends on**: Phase 1
**Requirements**: CMS-01, CMS-02, CMS-03, CMS-04, CMS-05, AUTH-02, AUTH-03, AUTH-04, AFF-04
**Success Criteria** (what must be TRUE):

  1. An admin creates an article via the CMS with focus keyword, key takeaways, entities and FAQ Q&A pairs, publishes it, and the public article page renders the content with FAQPage JSON-LD embedded
  2. An admin reopens any published article in the editor, changes fields, and saves — the edit flow works with no empty editor or silent 401 failures
  3. An editor/author account sees only their own articles, receives 403 on affiliate-link management, and can attach existing links at top/middle/footer positions that render in order on the public page
  4. An admin manages users (role, status, name, avatar) and the two-level AI-niche taxonomy (categories + sub-categories)
  5. An admin pastes a Google Sheet URL and the blacklist imports with root domains extracted, and matching active affiliate campaigns are deactivated by the retroactive sweeper

**Plans**: TBD

### Phase 3: SEO/GEO & Performance Hardening

**Goal**: The public site meets the V5.2 SEO contract and the standing performance NFRs — analytics that can be trusted for commission decisions, cached reads that survive ad-traffic and crawler bursts, and crawl-clean URLs.
**Depends on**: Phase 2
**Requirements**: SEO-01, SEO-02, SEO-03, PERF-01, PERF-02, AFF-02
**Success Criteria** (what must be TRUE):

  1. Five rapid reloads of the same article within one minute increment `view_count` exactly once, and concurrent views never lose increments
  2. `/?q=` search URLs are noindex with a clean canonical; the sitemap lists only published articles and serves from cache rather than querying Mongo per crawler request
  3. Publishing from the CMS makes an article appear on the public site within the revalidation window; repeated article/homepage requests don't each hit Atlas, and list APIs return excerpts instead of full article HTML
  4. Legacy `/bai-viet/[slug]` URLs redirect to `/article/[slug]`, and every article page embeds `NewsArticle` JSON-LD with its exact canonical URL
  5. A public affiliate click logs IP, user-agent, time and article context, then 302s to the campaign URL with `sub_id` appended; rendered CTAs carry `rel="nofollow sponsored" target="_blank"`

**Plans**: TBD

### Phase 4: V5.2 Presentation & Brand Alignment

**Goal**: The public frontend presents the V5.2 §3 B2B Bento experience under the aidealsuk.com brand (user decision D-003, overriding the spec's `aiaffiliatehub.com` branding values) — the governing spec's layout, palette, and settings-driven identity replace the current deviating editorial theme.
**Depends on**: Phase 3
**Requirements**: PUB-01, PUB-02, PUB-03, SEO-04
**Success Criteria** (what must be TRUE):

  1. The homepage hero is the Bento 7:5 layout — a large featured card plus two stacked secondary niche cards with view counts and category labels — with a Breaking News ticker directly under the nav linking the featured article
  2. Public pages render in the V5.2 light palette (soft gray background, white cards, Royal Blue primary, Coral Orange conversion CTAs, Mint Emerald verified labels) and are flawless on mobile
  3. Homepage tabs follow the V4 grouping logic — Hot (featured + 7-day interaction), Most Viewed (`view_count DESC`), Newest (`created_at DESC`) — and category pages offer sub-category quick filters
   4. Site-wide branding and metadata (site title, canonical `aidealsuk.com` per D-003, geoTarget, theme colors) come from the settings singleton — production settings carry aidealsuk.com values and rebranding needs no code change
  5. Unknown URLs render a branded 404 with the correct HTTP status and a link home, and server errors render a branded error page instead of raw Next.js screens

**Plans**: TBD
**UI hint**: yes

### Phase 5: Production Readiness

**Goal**: The codebase is safe and cheap to change, the critical flows are pinned by a regression net, and a failed deploy or a production 500 can never pass silently.
**Depends on**: Phase 4
**Requirements**: HYG-01, HYG-02, OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):

  1. A parameterized test proves every `/api/v1/cms/*` route returns 401 without a token, and CI fails if any route regresses
  2. Only one canonical schema/data layer exists — the dead schema twin, orphaned components, unused dependencies and sqlite artifacts are gone — and `npm run build` plus `npm test` stay green
  3. The admin CMS is split tab-by-tab into modules with shared typed hooks, with navigation and URL-state behavior unchanged
  4. A deployment that fails its post-start health check rolls back to the previous bundle — a bad deploy never leaves the site down
  5. Production errors are observable without SSH — 500s surface to an error-tracking sink

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Remediation | 3/7 | In Progress|  |
| 2. CMS End-to-End (V5.2) | 0/? | Not started | - |
| 3. SEO/GEO & Performance Hardening | 0/? | Not started | - |
| 4. V5.2 Presentation & Brand Alignment | 0/? | Not started | - |
| 5. Production Readiness | 0/? | Not started | - |

---

## Notes

- **Brownfield baseline:** 20 of 31 requirements are `verify` or `partial` — implemented and needing evidence or defect-fixes, not greenfield builds. The two true `gap` features are the V5.2 §3 public presentation (Phase 4) and the security/ops hardening (Phases 1 & 5).
- **Known standing risk (outside phase scope):** the production MongoDB Atlas credential was leaked in git history and remains valid because the cluster is third-party-owned (SEC-01 residual, blocked on owner action). Recorded in PROJECT.md Constraints; treat migrations/backups accordingly.
- **Deferred to post-v1:** "Scheduled" publishing status (mockup-only, no spec definition), staging environment, Redis-backed rate-limit/token stores (valid only at ≥2 instances).
