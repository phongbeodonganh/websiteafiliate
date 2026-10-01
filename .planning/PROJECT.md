# Project: AI Affiliate Hub

## Core Value

An SEO/GEO-driven AI-affiliate content hub where an admin can create and publish revenue-ready, AI-citation-optimized articles end-to-end — per the governing V5.2 spec (`specv2.md`) — and every affiliate click is tracked, attributed, and protected by the blacklist interceptor.

**Developer-facing success metric:** CMS end-to-end — admin can create and publish SEO+GEO-ready articles end-to-end per the governing V5.2 spec (specv2.md).

## What This Is (brownfield, not greenfield)

Single Next.js 16 App Router monolith serving three concerns from one codebase, **already substantially built and deployed** (PM2 + Nginx on Ubuntu VPS, CI-built):

1. **Public content site** — RSC article/category/collection pages, affiliate CTAs, insider newsletter
2. **Admin CMS** — client-rendered under `/admin` (articles, links, blacklist, users, settings, insights)
3. **REST API v1** — `src/app/api/v1` split into `public/`, `cms/`, `auth/`, `cron/`, `webhooks/`

Evidence base: codebase map at `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS) and the project's own audit (`GO_LIVE_TASKLIST.md`). This milestone **closes gaps, fixes broken flows, aligns to the governing spec, and hardens production** — it does not rebuild the system.

## Target Runtime (locked from intel + codebase map — do not re-ask)

- **App:** Next.js 16.2.12 App Router + Turbopack, React 19, TypeScript strict, Tailwind CSS 4
- **Data:** MongoDB Atlas via Mongoose 9 (`src/lib/db/models.ts` is the canonical schema layer; snake_case DB fields, camelCase API mapping)
- **Edge/middleware:** `src/proxy.ts` (Next 16 replacement for `middleware.ts`) — per-request CSP nonce
- **Deploy:** GitHub Actions builds `output: 'standalone'`, ships to VPS; PM2 fork (single instance) + Nginx + Certbot; VPS never builds
- **External services:** Gemini (raw REST), Jina Reader, Google Sheets CSV (blacklist import), Resend (email), GA4/GSC (insights), Cloudflare R2 (images)

## Scope

### v1 (this milestone)

- Remediate the critical security holes flagged in `.planning/codebase/CONCERNS.md` and `GO_LIVE_TASKLIST.md`
- Make the CMS end-to-end flow correct per V5.2 (one editor, working edit, RBAC, GEO fields, blacklist import + sweeper)
- Meet the V5.2 SEO contract and standing performance NFRs (accurate view counts, cached public reads, crawl-clean URLs)
- Align the public presentation to the V5.2 §3 Bento standard and the V5.2 settings/branding values
- Pay down blocking tech debt and pin critical flows with regression tests; harden the deploy pipeline

### Out of scope / deferred

- **"Scheduled" publishing status** — mockup-only concept; defined by no spec (INFO in INGEST-CONFLICTS.md)
- **Atlas credential rotation / cluster migration** — blocked: cluster is third-party-owned, no Atlas login available. Treated as standing risk; see Constraints
- **Staging environment** — CI deploys straight to production today; deferred (deploy health check + rollback in this milestone covers the acute risk)
- **Redis-backed token blacklist / rate-limit store** — single-instance PM2 fork is a documented, valid constraint at 50–100 concurrent users; revisit only when scaling to ≥2 instances

## Constraints

1. **Spec currency:** `specv2.md` (V5.2) governs overlapping scope; `spec.md` (V4.0) and `Spec_Website_Affiliate_V3.md` (V3) supply STANDING detail where V5.2 is silent (tab grouping, auth/session mechanics, API contract, NFRs). SUPERSEDED relational-schema entries are provenance only — never implement from them.
2. **Next.js 16 contract (AGENTS.md):** this is NOT the Next.js in training data. Read `node_modules/next/dist/docs/` before writing code. `proxy.ts` replaces `middleware.ts`; `params`/`searchParams` are Promises; `next lint` is gone.
3. **Single-process assumption:** PM2 `instances: 1, exec_mode: 'fork'` is a hard prerequisite for the in-memory token blacklist and login rate limiter. Any move to cluster mode/serverless silently breaks them.
4. **Dynamic-rendering lock-in:** the `headers()` call in `src/app/layout.tsx` (CSP nonce pickup) forces all routes dynamic by design — do not remove without redesigning the nonce pipeline.
5. **Model registration:** every Mongoose model must keep the `mongoose.models.X ||` hot-reload guard; `src/lib/db/models.ts` is canonical — never import `src/lib/db/schema.ts`.
6. **Sanitization gate:** all stored/external HTML passes `sanitizeArticleContent` (`src/lib/sanitize.ts`) before render; any tag-allowlist change updates `tests/lib/sanitize.test.ts` first.
7. **Blocked external dependency:** the production Atlas credential was leaked in git history and remains valid (SEC-01 residual); rotation requires the third-party owner. Treat backups/migrations accordingly; migrating to a project-owned cluster is the eventual fix.
8. **Language:** Vietnamese comments/internal admin copy are the norm; public site content is English.

## Key Decisions

**No ADR-locked decisions exist.** The ingest set (5 docs) contained zero ADR-classified documents and zero sources marked `locked: true`; `.planning/intel/decisions.md` is intentionally empty. The SQL-vs-MongoDB contradiction auto-resolved as INFO precisely because nothing was locked — do not treat the items below as ADR-locked either; they are spec-derived resolutions recorded for provenance.

| ID | Decision | Basis | Date |
|----|----------|-------|------|
| — | *(none locked — table intentionally empty)* | Ingest found 0 ADRs, 0 locked sources | 2026-09-11 |
| D-001 | V5.2 (`specv2.md`) governs overlapping spec scope; V3/V4 consulted only where V5.2 is silent | Later-revision rule (INGEST-CONFLICTS INFO) | 2026-09-11 |
| D-002 | MongoDB + Mongoose is the datastore (not the superseded V3/V4 relational schema) | V5.2 governing schema entry | 2026-09-11 |
| D-003 | Production brand and canonical domain is **aidealsuk.com** — supersedes the V5.2 §1.7/§2.2 branding values (`AI AFFILIATE HUB` / `aiaffiliatehub.com`). The settings-driven branding mechanism (SEO-04) stays; production settings carry aidealsuk.com values. | User decision (2026-09-11), overrides spec branding values — spec remains authoritative only for layout/palette | 2026-09-11 |

Decisions made during execution get logged here with phase attribution.
