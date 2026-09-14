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
| 01-01-T1 | 01 | 1 | SEC-03, AFF-03 | T-1-01/02 | Blacklisted click → 302 /blocked?ref → inert text render + CSP | integration | `npx vitest run tests/api/tracking-redirect.test.ts tests/api/blocked-page.test.ts` | created in-task | ⬜ pending |
| 01-01-T2 | 01 | 1 | SEC-03 | T-1-03/04 | Boundary states: invalid ref → home, DB failure → fail-closed, no raw-HTML mechanism | integration + source gate | `npx vitest run tests/api/blocked-page.test.ts` | created in-task | ⬜ pending |
| 01-02-T1 | 02 | 1 | SEC-01 | T-1-05 | Seed route/libs/npm-script absent; no unfiltered destructive deletes | fs/grep gate | `npx vitest run tests/api/security-regressions.test.ts` | created in-task | ⬜ pending |
| 01-02-T2 | 02 | 1 | SEC-01 | T-1-06 | CLI-only admin recovery documented; no web path | docs + smoke | `Select-String -Path DEPLOY.md -Pattern "reset-admin" -Quiet` | exists | ⬜ pending |
| 01-03-T1 | 03 | 1 | AFF-01 | T-1-07 | Non-http(s) base_url → 400 on POST, DB unchanged | integration | `npx vitest run tests/api/affiliate-links-scheme.test.ts` | created in-task | ⬜ pending |
| 01-03-T2 | 03 | 1 | AFF-01 | T-1-07 | Same rule on PUT; valid URLs stored verbatim | integration | `npx vitest run tests/api/affiliate-links-scheme.test.ts` | created in-task | ⬜ pending |
| 01-04-T1 | 04 | 2 | AUTH-01 | T-1-09/10/12 | All CMS routes 401 no-token; fallback-secret + logout-blacklisted tokens rejected | integration (parameterized) | `npx vitest run tests/api/cms-auth-401.test.ts tests/api/auth-login.test.ts` | created in-task | ⬜ pending |
| 01-04-T2 | 04 | 2 | AUTH-01 | T-1-09/10/12 | Swap-integrity sweep: full suite + type check green after the canonical-auth swap; route inventory complete | suite | `npm test` then `npx tsc --noEmit` | exists | ⬜ pending |
| 01-05-T1 | 05 | 2 | SEC-04 | T-1-14 | Subscribe 429 at 5/60s with Retry-After (incl. /subscribe alias) | integration | `npx vitest run tests/api/rate-limit.test.ts tests/api/insider-lifecycle.test.ts` | created in-task | ⬜ pending |
| 01-05-T2 | 05 | 2 | SEC-04 | T-1-15 | Click/redirect dedupe + flood cap: silent skip, no 429, ref anchor intact | integration | `npx vitest run tests/api/rate-limit.test.ts tests/api/tracking-redirect.test.ts` | extended | ⬜ pending |
| 01-06-T1 | 06 | 3 | SEC-02 | T-1-14 | gemini_api_key schema field; masked GET; admin-only accepting PUT; plan-04 guards intact | integration + auth | `npx vitest run tests/api/cms-auth-401.test.ts` then `npx tsc --noEmit` | exists | ⬜ pending |
| 01-06-T2 | 06 | 3 | SEC-02 | T-1-13 | Zero secret literals in gemini.ts + AI route; D-07 precedence chain (request → env → settings, typed reads) | grep gate + type check | `Select-String -Path src\lib\gemini.ts,src\app\api\v1\cms\ai\generate-article\route.ts -Pattern "AIza" -Quiet` then `npx tsc --noEmit` | exists | ⬜ pending |
| 01-06-T3 | 06 | 3 | SEC-02 | T-1-13 | D-08 gates: jwt locality, secret-fallback literals, leaked project ID — self-asserted; build passes without secrets | gate + build | `npx vitest run tests/api/security-regressions.test.ts tests/api/cms-auth-401.test.ts` then `npm run build` | extended | ⬜ pending |
| 01-06-T4 | 06 | 3 | SEC-03 | T-1-18 | Hex color-format regex on primary_color/accent_color: PUT 400 on invalid, render-time sanitize fallback in layout.tsx | unit + integration | `npx vitest run tests/lib/sanitize.test.ts tests/api/settings-color-validation.test.ts` then `npx tsc --noEmit` | extended + created in-task | ⬜ pending |
| 01-07-T1 | 07 | 3 | SEC-04 | T-1-16 | Last-hop getClientIp matrix (spoofed first entry ignored); Nginx XFF overwrite directive documented | unit + docs | `npx vitest run tests/lib/client-ip.test.ts tests/api/rate-limit.test.ts`; `Select-String -Path DEPLOY.md -Pattern "X-Forwarded-For \$remote_addr" -Quiet` | created in-task | ⬜ pending |
| 01-07-T2 | 07 | 3 | SEC-04 | T-1-17 | escapeRegExp at both user-text→RegExp sites + 100-char cap; timed ReDoS assertions | unit + timed | `npx vitest run tests/lib/redos.test.ts tests/api/insider-lifecycle.test.ts` | created in-task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/api/cms-auth-401.test.ts` — parameterized unauthenticated-401 coverage for `/api/v1/cms/*` (created by plan 04, Task 1)
- [x] `tests/api/security-regressions.test.ts` — seed-path absence + destructive-op scan (plan 02, Task 1) + secret-fallback / jwt-locality / leaked-project-ID gates (plan 06, Task 3)
- [x] Rate-limiter test reset affordance (`_resetForTests` in `src/lib/rateLimit.ts`) lands before any rate-limited endpoint test (plan 05, Task 1; protects `tests/api/insider-lifecycle.test.ts` per research Pitfall 3)
- [x] Existing suite stays green while limiter/auth changes land (reset affordance + per-plan full-suite tasks)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx tsx scripts/reset-admin.ts <username> <password>` upserts the admin on the VPS (plan 01-02 Task 2 done-criteria smoke) | SEC-01 | Runs against the real production user collection — deliberate on-box CLI smoke, not automatable against live data | On the VPS in the app directory: run the command with the admin username and a new password; confirm the output prints only the username + user id (never the password); then log in via the CMS with the new password |
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
