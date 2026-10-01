---
phase: 01-security-remediation
verified: 2026-09-20T11:30:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/01-security-remediation/01-01-PLAN.md"
  - ".planning/phases/01-security-remediation/01-01-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-02-PLAN.md"
  - ".planning/phases/01-security-remediation/01-02-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-03-PLAN.md"
  - ".planning/phases/01-security-remediation/01-03-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-04-PLAN.md"
  - ".planning/phases/01-security-remediation/01-04-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-05-PLAN.md"
  - ".planning/phases/01-security-remediation/01-05-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-06-PLAN.md"
  - ".planning/phases/01-security-remediation/01-06-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-07-PLAN.md"
  - ".planning/phases/01-security-remediation/01-07-SUMMARY.md"
  - ".planning/phases/01-security-remediation/01-UAT.md"
  - "scripts/reset-admin.ts"
  - "src/app/api/v1/cms/affiliate-links/[id]/route.ts"
  - "src/app/api/v1/cms/affiliate-links/route.ts"
  - "src/app/api/v1/cms/ai/generate-article/route.ts"
  - "src/app/api/v1/cms/settings/route.ts"
  - "src/app/api/v1/public/articles/route.ts"
  - "src/app/api/v1/public/insider/route.ts"
  - "src/app/api/v1/public/tracking/click/route.ts"
  - "src/app/api/v1/public/tracking/redirect/route.ts"
  - "src/app/blocked/page.tsx"
  - "src/app/layout.tsx"
  - "src/lib/auth.ts"
  - "src/lib/blacklist.ts"
  - "src/lib/db/models.ts"
  - "src/lib/gemini.ts"
  - "src/lib/homepage-articles.ts"
  - "src/lib/rateLimit.ts"
  - "src/lib/sanitize.ts"
  - "src/lib/seo.ts"
  - "src/lib/utils.ts"
  - "src/proxy.ts"
  - "tests/api/affiliate-links-scheme.test.ts"
  - "tests/api/blocked-page.test.ts"
  - "tests/api/cms-auth-401.test.ts"
  - "tests/api/rate-limit.test.ts"
  - "tests/api/security-regressions.test.ts"
  - "tests/api/settings-color-validation.test.ts"
  - "tests/lib/client-ip.test.ts"
  - "tests/lib/redos.test.ts"
  - "tests/lib/sanitize.test.ts"
covered_digest: "v1:sha256:6cdf73b6d5bad95159da5fc2e8dc8b4f83b5eb88638a97822b451cb5d11d23d4"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 1: Security Remediation Verification Report

**Phase Goal:** The site is safe to expose to the open internet — no unauthenticated destructive access, no forgeable CMS auth, no secrets in source, and public inputs can't be abused for injection, DoS, or analytics poisoning.
**Verified:** 2026-09-20T11:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | An unauthenticated request to the seed endpoint is refused in production — a public URL can no longer wipe the database or reset admin credentials | ✓ VERIFIED | `src/app/api/v1/seed/route.ts` confirmed ABSENT (Test-Path=False); `src/lib/db/seed-mongodb.ts` and `src/lib/db/seed.ts` confirmed ABSENT; `npm run seed` returns "Missing script: seed" (verified at runtime); `tests/api/security-regressions.test.ts` runs seed-dir-absence + destructive-delete-scan gates on every `npm test` (155/155 pass in targeted run); `scripts/reset-admin.ts` exists and prints usage + exits 1 with no args (verified at runtime) |
| 2 | A JWT self-signed with any previously-hardcoded fallback secret is rejected with 401 by every CMS route, and logout revocation applies uniformly across all of them | ✓ VERIFIED | All 25 CMS route.ts files import and call `getAuthUser` (65 matches via recursive grep incl. `[id]` dynamic-route files); zero routes carry `JWT_SECRET \|\| '...'` fallback literals (grep empty); zero routes import `headers` from `next/headers` (grep empty); zero routes call `jwt.verify` directly (grep empty); `tests/api/cms-auth-401.test.ts` parameterizes 401 assertions over the full inventory with fallback-secret and logout-blacklist cases (passing in 155-test targeted run) |
| 3 | Source contains zero secret literals (JWT secrets, Gemini key, leaked project ID); starting without a required secret fails fast with an actionable error message | ✓ VERIFIED | `Select-String` for `AIza[A-Za-z0-9_-]{35}` in src/ → 0 matches; `354609` (leaked project ID) → 0 matches; both former fallback literals (`nexus_super_secret_jwt_key_2026`, `affiliate_secret_key_v3_super_secure`) → 0 matches; `jwt.sign`/`jwt.verify` only in `src/lib/auth.ts:34,41` (line 34 is auth.ts itself); `src/lib/auth.ts:9-13` lazy `getJwtSecret()` throws with actionable message naming the env var; `src/lib/gemini.ts:80` defaults `apiKey` to `process.env.GEMINI_API_KEY` (no literal), line 84-89 throws bilingual message naming both env + settings sources; D-08 gates in `security-regressions.test.ts` enforce jwt-locality + secret-fallback-absence + leaked-project-ID-absence permanently |
| 4 | A click on a blacklisted affiliate link shows the warning page with all blacklist-supplied text rendered inert (no HTML/script injection) and no third-party CDN script loaded | ✓ VERIFIED | `src/app/blocked/page.tsx` exists (210 lines); `dangerouslySetInnerHTML` absent (grep False); `cdn.tailwindcss.com` absent (grep False); page is async RSC with `dynamic='force-dynamic'` and `robots: { index: false, follow: false }`; all blacklist data (projectName, reason, blockedCountries) rendered as React text children (`{projectName}`, `{reason}`, `{blockedCountries.join(', ')}`); redirect route line 81-84 returns 302 to `/blocked?ref=<24-hex>` with Cache-Control no-store; `src/proxy.ts` matcher covers non-API paths so CSP applies to /blocked; ClickLog ref validated as 24-hex ObjectId before any DB call (line 68); tests/api/blocked-page.test.ts entity-encoding + CSP assertions passing |
| 5 | Bursts of unauthenticated writes (subscribe / tracking click / redirect) are rate-limited, a crafted ReDoS search pattern does not hang the server, and affiliate base_url values are restricted to http(s) | ✓ VERIFIED | Subscribe: `insider/route.ts:38-39` calls `consumeRequest('subscribe:host', 5, 60000)`, 429 + Retry-After on 6th. Click: `click/route.ts:54-56` calls `consumeRequest('click:host', 60, 60000)` + `consumeDedupe` → silent skip, still 200. Redirect: `redirect/route.ts:50-52` same pattern, ClickLog always created, $inc skipped. ReDoS: `articles/route.ts:4` imports `escapeRegExp` from `@/lib/utils`, line 49 wraps keyword, `SEARCH_KEYWORD_MAX_LENGTH=100` cap skips regex gracefully. Scheme: `seo.ts` exports `isHttpUrl` (WHATWG URL parse + protocol check); POST at `affiliate-links/route.ts` gates before `connectToDatabase` (grep confirmed); PUT at `[id]/route.ts:35` gates before assignment. `blacklist.ts:145` sweeps via `escapeRegExp`. 155/155 tests pass across 9 targeted test files |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/v1/seed/route.ts` | Deleted | ✓ VERIFIED | File absent; regression gate enforces its permanent absence |
| `src/lib/db/seed-mongodb.ts` | Deleted | ✓ VERIFIED | File absent |
| `src/lib/db/seed.ts` | Deleted | ✓ VERIFIED | File absent |
| `scripts/reset-admin.ts` | CLI recovery script | ✓ VERIFIED | Exists; prints usage + exit 1 with no args (verified at runtime) |
| `tests/api/security-regressions.test.ts` | Seed + secret + D-08 gates | ✓ VERIFIED | 155 tests pass in targeted run incl. counter-vacuity self-assertions |
| `tests/api/cms-auth-401.test.ts` | Parameterized 401 table | ✓ VERIFIED | Passes in targeted run — covers all 25 CMS routes |
| `src/app/blocked/page.tsx` | Async RSC with metadata | ✓ VERIFIED | 210 lines, force-dynamic, robots noindex, all data as React text children |
| `src/lib/seo.ts` | `isHttpUrl` export | ✓ VERIFIED | WHATWG URL parse + protocol check (confirmed via import in affiliate-links routes) |
| `src/lib/utils.ts` | `getClientIp` last-hop + `escapeRegExp` export | ✓ VERIFIED | Lines 66-79 last-hop parse; lines 88-90 escapeRegExp body |
| `src/lib/rateLimit.ts` | `consumeRequest`/`consumeDedupe` additive | ✓ VERIFIED | Lines 59-80+ new count-based API alongside existing failure-lockout (byte-identical above) |
| `src/lib/sanitize.ts` | `isValidCssColor`/`sanitizeCssColor` | ✓ VERIFIED | Lines 56+ strict hex regex; used at settings PUT + layout.tsx render |
| `src/lib/gemini.ts` | No fallback literal, D-07 chain | ✓ VERIFIED | Line 80: `apiKey = process.env.GEMINI_API_KEY` (no literal); line 84-89 lazy throw |
| `src/app/api/v1/cms/settings/route.ts` | Masked GET, accepting PUT, color validation | ✓ VERIFIED | Line 36-39 masked hint in GET; line 82-88 admin guard in PUT; lines 163-174 hex color validation |
| `src/app/api/v1/cms/ai/generate-article/route.ts` | D-07 precedence chain | ✓ VERIFIED | Lines 82-88: `userApiKey \|\| process.env.GEMINI_API_KEY \|\| settings.gemini_api_key` |
| `src/app/layout.tsx` | `sanitizeCssColor` on color reads | ✓ VERIFIED | Lines 123-124: `sanitizeCssColor(sysSettings?.primary_color, "#111111")` etc. |
| `src/lib/db/models.ts` | `gemini_api_key` field | ✓ VERIFIED | Line 267 (interface) + line 303 (schema) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| redirect route blacklisted branch | /blocked page | 302 `new URL('/blocked?ref=...', req.url)` | ✓ WIRED | `redirect/route.ts:81-84` confirmed |
| settings route GET | masked gemini key | `geminiApiKeyMasked` in response shape | ✓ WIRED | `settings/route.ts:36-39,68` |
| generate-article | Gemini key precedence | `userApiKey \|\| env \|\| settings.gemini_api_key` | ✓ WIRED | `generate-article/route.ts:82-88` |
| articles route | escapeRegExp | `import { escapeRegExp } from '@/lib/utils'` | ✓ WIRED | `articles/route.ts:4` |
| blacklist sweeper | escapeRegExp | `import { escapeRegExp } from '@/lib/utils'` | ✓ WIRED | `blacklist.ts:3,145` |
| insider route | consumeRequest | `import { consumeRequest } from '@/lib/rateLimit'` | ✓ WIRED | `insider/route.ts:8,38-39` |
| click/redirect routes | consumeRequest/consumeDedupe | `import { consumeDedupe, consumeRequest } from '@/lib/rateLimit'` | ✓ WIRED | Both files line 6-7 |
| settings PUT | isValidCssColor | `import { isValidCssColor } from '@/lib/sanitize'` | ✓ WIRED | `settings/route.ts:5,163,169` |
| layout.tsx | sanitizeCssColor | `import { sanitizeCssColor } from "@/lib/sanitize"` | ✓ WIRED | `layout.tsx:17,123,124` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|-------|
| /blocked page | projectName, reason, blockedCountries | `checkUrlAgainstBlacklist` → DB BlacklistModel | ✓ DB query | ✓ FLOWING |
| settings GET | geminiApiKeyMasked | `SettingModel.findOne()` → `doc.gemini_api_key.slice(-4)` | ✓ DB query | ✓ FLOWING |
| generate-article | geminiApiKey | `userApiKey \|\| env \|\| SettingModel.findOne().gemini_api_key` | ✓ DB/env/request chain | ✓ FLOWING |
| client-ip test | XFF entries | `req.headers.get('x-forwarded-for')` | ✓ Real header parsing | ✓ FLOWING |
| articles search | regex | `escapeRegExp(trimmedKeyword)` on user input | ✓ Real user input | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| npm run seed fails | `npm run seed` | "Missing script: seed" error | ✓ PASS |
| reset-admin no-args usage | `npx tsx scripts/reset-admin.ts` | Prints usage line + exit 1 | ✓ PASS |
| 155 security regression tests green | `npx vitest run tests/api/security-regressions.test.ts tests/api/cms-auth-401.test.ts tests/api/blocked-page.test.ts tests/api/rate-limit.test.ts tests/lib/redos.test.ts tests/lib/client-ip.test.ts tests/api/affiliate-links-scheme.test.ts tests/lib/sanitize.test.ts tests/api/settings-color-validation.test.ts` | 9 test files / 155 tests pass | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| Seed-absence gate | `npx vitest run tests/api/security-regressions.test.ts` | 0 failures | ✓ PASS |
| Auth-401 parameterized gate | `npx vitest run tests/api/cms-auth-401.test.ts` | 0 failures | ✓ PASS |
| Blocked-page XSS/CSP gate | `npx vitest run tests/api/blocked-page.test.ts` | 0 failures | ✓ PASS |
| Rate-limit boundary gate | `npx vitest run tests/api/rate-limit.test.ts` | 0 failures | ✓ PASS |
| ReDoS timing gate | `npx vitest run tests/lib/redos.test.ts` | 0 failures | ✓ PASS |
| Client-IP matrix gate | `npx vitest run tests/lib/client-ip.test.ts` | 0 failures | ✓ PASS |
| Scheme validation gate | `npx vitest run tests/api/affiliate-links-scheme.test.ts` | 0 failures | ✓ PASS |
| Color validation gate | `npx vitest run tests/api/settings-color-validation.test.ts` | 0 failures | ✓ PASS |
| Sanitizer unit gate | `npx vitest run tests/lib/sanitize.test.ts` | 0 failures | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 01-02 | No unauthenticated destructive endpoint | ✓ SATISFIED | Seed route + libs deleted; regression gate permanent; reset-admin CLI-only |
| SEC-02 | 01-06 | No secrets in source | ✓ SATISFIED | Zero secret literals (verified via 4 distinct grep patterns); lazy fail-fast confirmed in auth.ts + gemini.ts; D-08 gates enforce permanence |
| SEC-03 | 01-01, 01-06 | XSS-safe rendering (blacklist page + CSS injection) | ✓ SATISFIED | /blocked RSC renders data as React text children; CSS colors validated at both write + render boundaries |
| SEC-04 | 01-05, 01-07 | Abuse controls on public inputs | ✓ SATISFIED | Rate limiting on 3 public write endpoints; ReDoS defense (escapeRegExp + 100-char cap); IP trust (last-hop XFF); base_url scheme validation |
| AUTH-01 | 01-04 | Canonical JWT session & auth guard | ✓ SATISFIED | All 25 CMS routes use canonical getAuthUser; zero route-local secrets/headers/jwt.verify; parameterized 401 gate |
| AFF-01 | 01-03 | Affiliate base_url restricted to http(s) | ✓ SATISFIED | isHttpUrl gates on POST + PUT via WHATWG URL parse |
| AFF-03 | 01-01 | Blacklist interceptor warning page (injection-safe) | ✓ SATISFIED | RSC page renders all blacklist data as React text; redirect 302→/blocked^ref; no CDN |

**No orphaned requirements:** All 7 requirement IDs in REQUIREMENTS.md Traceability for Phase 1 (SEC-01, SEC-02, SEC-03, SEC-04, AUTH-01, AFF-01, AFF-03) are covered by plans and verified above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No real debt markers (TBD/FIXME/XXX/HACK/PLACEHOLDER) in any phase-modified file. Initial false positive on Vietnamese text in settings route was a non-word substring match. |

### Human Verification Required

UAT was completed separately (01-UAT.md): 9 passed, 1 skipped (/blocked visual quality — no blacklist data available), 0 issues.

The sole skipped UAT item (Test 1: /blocked visual quality) cannot be programmatically verified without blacklist seed data and a running browser — this is a genuine visual quality check. The code is verified correct (RSC text children, CSP, no CDN) by source-contract tests; only the visual rendering under real conditions remains for human verification when blacklist data is available.

The standing ops items (VPS Nginx XFF overwrite directive application, VPS threshold tuning smoke, Atlas credential rotation, reset-admin real-DB smoke) are production-deployment tasks outside the code-level verification scope and are tracked in DEPLOY.md §8 and the UAT's deferred items.

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria verified with codebase evidence — file existence, substantive implementation, wiring, data-flow, and behavioral spot-checks all pass. The 155-test targeted run covering all phase test files confirms the security invariants are structurally enforced.

---

_Verified: 2026-09-20T11:30:00Z_
_Verifier: the agent (gsd-verifier)_
