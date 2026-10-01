## Conflict Detection Report

Mode: new | Precedence: ADR > SPEC > PRD > DOC (no per-doc overrides) | Docs ingested: 5 (3 SPEC, 2 DOC)
Re-run after first attempt BLOCKED — classifications dir reset to 5 manifest-typed docs (`.planning/ingest-manifest.yaml`). The 4 cyclic operational runbooks (DEPLOY.md, GO_LIVE_TASKLIST.md, INSIDER_EMAIL_SETUP.md, R2_IMAGE_STORAGE_TASKLIST.md) are intentionally excluded via manifest; their operational content is already captured in `.planning/codebase/`. `requimentgg.md` re-tagged DOC via manifest (was UNKNOWN, low confidence).

### BLOCKERS (0)

(none) — cross-ref graph is acyclic (5 nodes, 0 cross_ref edges; max depth 1 < 50 cap); no UNKNOWN/low-confidence docs remain; no LOCKED decisions exist (all sources `locked: false`); MODE=new with no existing locked context to contradict.

### WARNINGS (0)

(none) — no PRD-classified docs in this set, so no competing acceptance variants.

### INFO (3)

[INFO] Auto-resolved: supersession chain — Spec V3 → V4.0 EXTENDED → V5.2 (later revision governs overlapping scope)
  Note: Spec_Website_Affiliate_V3.md (V3), spec.md (V4.0 EXTENDED), and specv2.md (V5.2 BLACKLIST INTERCEPTOR EDITION) are successive revisions of the same website spec — evidenced by their own version numbering and by V5.2 inheriting V4 constructs (categories/sub_categories, article_affiliate_relations, position_label, settings). On overlapping scope — database schema/modeling, category taxonomy instances, article fields, affiliate link/placement management, RBAC matrix, settings configuration, public URL structure — specv2.md (V5.2) governs. V3/V4 entries in `constraints.md` are retained verbatim with source attribution and flagged SUPERSEDED where V5.2 restates the scope. V3/V4 content not restated by V5.2 (public/CMS API contract, NFRs, V4 frontend tab grouping, V4 extended settings field list) is retained as STANDING. No LOCKED decisions exist (all sources `locked: false`). Sources: D:/affiliate/websiteafiliate/Spec_Website_Affiliate_V3.md, D:/affiliate/websiteafiliate/spec.md, D:/affiliate/websiteafiliate/specv2.md

[INFO] Auto-resolved: relational SQL schema (V3/V4) vs MongoDB (V5.2) — V5.2 wins
  Note: same scope "database schema / datastore": Spec_Website_Affiliate_V3.md and spec.md specify relational SQL tables (INT PK/FK, VARCHAR/ENUM columns, ORM/Query Builder, SQL-injection defense); specv2.md specifies MongoDB Atlas collections (ObjectId refs, Mongoose ODM, `dns.setServers` config). With no LOCKED ADR in the ingest set, this contradiction is auto-resolved by revision supersession rather than escalated to a BLOCKER: MongoDB (V5.2) wins in the synthesized intel; the V3/V4 relational schema entries are retained in `constraints.md` flagged SUPERSEDED. Sources: D:/affiliate/websiteafiliate/Spec_Website_Affiliate_V3.md, D:/affiliate/websiteafiliate/spec.md, D:/affiliate/websiteafiliate/specv2.md

[INFO] Dashboard mockup exposes a "Scheduled" publishing status defined by no spec
  Note: seo_geo_article_creator_dashboard.md's Publishing Status select offers Published / Draft / Scheduled, while all three specs enumerate article status as 'draft' | 'published' only. Per the DOC classification, the mockup's field labels/options are mockup UI, not written requirements — no precedence action taken; the roadmapper should decide whether "Scheduled" is a wanted capability. Sources: D:/affiliate/websiteafiliate/seo_geo_article_creator_dashboard.md, D:/affiliate/websiteafiliate/specv2.md
