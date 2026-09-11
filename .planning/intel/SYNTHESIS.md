# Doc Ingest Synthesis

Run: MODE=new | Precedence: ADR > SPEC > PRD > DOC (default, no per-doc overrides) | Date: 2026-09-11
Re-run after first attempt BLOCKED: ingest set reset to 5 manifest-typed docs (`.planning/ingest-manifest.yaml`); the 4 cyclic operational runbooks are excluded by design.
Single entry point for `gsd-roadmapper`. Detail: `.planning/INGEST-CONFLICTS.md`.

## Docs consumed — 5

- ADR: 0
- SPEC: 3 — `Spec_Website_Affiliate_V3.md` (V3), `spec.md` (V4.0 EXTENDED), `specv2.md` (V5.2 BLACKLIST INTERCEPTOR EDITION). Successive revisions of the same website spec; **specv2.md (V5.2) governs overlapping scope** as the later revision; all three extracted to `constraints.md` with source attribution.
- PRD: 0
- DOC: 2 — `requimentgg.md` (re-tagged DOC via manifest, was UNKNOWN/low-confidence; Gemini content-marketing prompt principles) and `seo_geo_article_creator_dashboard.md` (dashboard mockup) → `context.md`.

Excluded from synthesis: 4 cyclic DOC runbooks (excluded via manifest, not by this run's cycle detection — cross_refs are empty in this set).

Cycle detection: PASS — 5-node graph, 0 cross_ref edges, acyclic; max depth 1 < 50 cap.

## Decisions locked

- 0 — no ADR-classified docs in the ingest set; no source carried `locked: true`. `decisions.md` is intentionally empty. (The absence of locked decisions is why the SQL-vs-MongoDB contradiction auto-resolved as INFO rather than a BLOCKER.)

## Requirements extracted

- 0 — no PRD-classified docs; no REQ IDs issued; no competing acceptance variants. `requirements.md` notes that functional-requirement content inside the SPECs lives in `constraints.md`.

## Constraints — 20 entries in `constraints.md`

- schema: 10 — governing V5.2 × 7 (datastore model, users, taxonomy, articles, affiliate/relations/click_logs, settings, blacklists); standing V4 settings field list × 1; superseded V3 × 1, V4 × 1
- protocol: 6 — governing V5.2 × 3 (URL/redirects, NewsArticle JSON-LD, RBAC matrix); standing × 3 (V4 frontend tab grouping, V3 auth/session, V3 affiliate/tracking data flow)
- api-contract: 2 — governing V5.2 blacklist bulk import × 1; standing V3 public/CMS contract × 1
- nfr: 2 — governing V5.2 Bento UI × 1; standing V3 performance/security/responsive/SSR × 1

Currency: 12 entries GOVERNING (specv2.md V5.2) · 6 STANDING (not restated or contradicted by later revisions) · 2 SUPERSEDED (flagged, retained for provenance).

## Context topics — 2 in `context.md`

- Gemini content-marketing prompt template (`requimentgg.md`) — 4 AI writing principles for article generation.
- "Affiliate Pro" SEO & GEO Article Studio dashboard mockup (`seo_geo_article_creator_dashboard.md`) — HTML/Tailwind prototype; field labels are mockup UI, not written requirements; mockup-only "Scheduled" status flagged in INFO.

## Conflicts

- Blockers: 0
- Competing variants: 0
- Auto-resolved / informational: 3 — supersession chain V3 → V4.0 → V5.2; relational-vs-MongoDB datastore contradiction (V5.2 wins, nothing locked); mockup-only "Scheduled" publishing status observation

## Pointers

- Conflicts detail: `.planning/INGEST-CONFLICTS.md`
- Decisions (empty): `.planning/intel/decisions.md`
- Requirements (empty): `.planning/intel/requirements.md`
- Constraints: `.planning/intel/constraints.md`
- Context: `.planning/intel/context.md`

STATUS: READY — safe to route.
