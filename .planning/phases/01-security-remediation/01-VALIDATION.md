---
phase: "1"
slug: "security-remediation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (existing suite, 10 files under `tests/`) |
| **Config file** | `vitest.config.mts` (`fileParallelism: false`, mongodb-memory-server) |
| **Quick run command** | `npm test -- --run tests/api` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds (in-memory MongoDB startup dominates) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/api` (or the touched test file)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Filled by planner per task | | | SEC-01..04, AUTH-01, AFF-01, AFF-03 | T-1-01.. | see PLAN threat models | unit/integration | `npm test -- --run <file>` | see plans | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/cms-routes-401.test.ts` — parameterized unauthenticated-401 coverage for `/api/v1/cms/*` (the gap that let SEC-02 survive)
- [ ] `tests/api/seed-route-removed.test.ts` — former seed path must not respond destructively (D-03)
- [ ] Existing suite stays green while limiter/auth changes land (research Pitfall 3: rate-limit reset affordance for tests)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nginx overwrites (not appends) `X-Forwarded-For` on the VPS | AUTH-01 / rate-limit keying | Nginx config lives on the VPS, not in repo | After deploy: `curl -H "X-Forwarded-For: 1.2.3.4" https://<site>/api/v1/public/tracking/click` and confirm ClickLog.ip_address shows the real client IP, not 1.2.3.4 |
| Gemini key absent → AI route returns actionable error (env-only) | SEC-03 | Requires real env state on VPS/staging | Temporarily unset `GEMINI_API_KEY`, call AI generate route with valid admin token, confirm clean actionable error (no crash, no secret leak), restore env |
| CI grep gate blocks fallback-secret patterns | SEC-03 | Runs in GitHub Actions runner | Push a branch containing a `|| 'test-secret'` fallback; confirm CI job fails at the grep gate step |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
