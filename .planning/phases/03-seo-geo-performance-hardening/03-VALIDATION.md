---
phase: "03"
slug: "seo-geo-performance-hardening"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase)
# audit-milestone distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-23"
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run --reporter=min` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=min --reporter=verbose tests/api/ tests/lib/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PERF-02 | — | N/A (performance) | integration | `npx vitest run tests/api/view-count-atomicity.test.ts` | No / W0 | pending |
| 03-01-02 | 01 | 1 | PERF-02 | — | N/A (performance) | integration | `npx vitest run tests/api/view-count-dedupe.test.ts` | No / W0 | pending |
| 03-01-03 | 01 | 1 | PERF-01 | — | N/A (performance) | integration | `npx vitest run tests/api/article-page-cache.test.ts` | No / W0 | pending |
| 03-02-01 | 02 | 1 | PERF-01 | — | N/A (performance) | integration | `npx vitest run tests/api/list-excerpts.test.ts` | No / W0 | pending |
| 03-02-02 | 02 | 1 | SEO-03, PERF-01 | — | N/A (caching) | integration | `npx vitest run tests/api/sitemap-cache.test.ts` | No / W0 | pending |
| 03-02-03 | 02 | 1 | SEO-01 | — | N/A (redirect) | integration | `npx vitest run tests/api/legacy-redirect-permanent.test.ts` | No / W0 | pending |
| 03-03-01 | 03 | 2 | SEO-03 | — | N/A (SEO) | integration | `npx vitest run tests/api/search-noindex.test.ts` | No / W0 | pending |
| 03-03-02 | 03 | 2 | SEO-02, AFF-02 | — | N/A (verification) | integration | `npx vitest run tests/api/jsonld-structure.test.ts` | No / W0 | pending |
| 03-03-03 | 03 | 2 | AFF-02 | — | N/A (verification) | integration | `npx vitest run tests/api/click-tracking-pipeline.test.ts` | No / W0 | pending |
| 03-04-01 | 04 | 2 | AFF-02, PERF-01 | — | N/A (optimization) | unit | `npx vitest run tests/lib/blacklist-query-optimization.test.ts` | No / W0 | pending |

*Status: ○ pending ● green ✗ red ◇ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/view-count-atomicity.test.ts` — stubs for PERF-02
- [ ] `tests/api/article-page-cache.test.ts` — stubs for PERF-01
- [ ] `tests/api/list-excerpts.test.ts` — stubs for PERF-01
- [ ] `tests/api/sitemap-cache.test.ts` — stubs for SEO-03, PERF-01
- [ ] `tests/api/legacy-redirect-permanent.test.ts` — stubs for SEO-01
- [ ] `tests/api/search-noindex.test.ts` — stubs for SEO-03
- [ ] `tests/api/jsonld-structure.test.ts` — stubs for SEO-02, AFF-02
- [ ] `tests/api/click-tracking-pipeline.test.ts` — stubs for AFF-02
- [ ] `tests/lib/blacklist-query-optimization.test.ts` — stubs for AFF-02, PERF-01

*Existing infrastructure covers DB helpers and CMS auth fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| N/A | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending