---
phase: 01-security-remediation
plan: 03
subsystem: security
tags: [url-validation, scheme-gate, whatwg-url, xss-prevention, affiliate-links, mongoose, vitest]

# Dependency graph
requires:
  - phase: foundation (pre-existing brownfield) + plans 01-01/01-02
    provides: affiliate-links POST/PUT handlers with canonical getAuthUser guard (plan 01-04 workstreams overlap on these same routes), src/lib/seo.ts normalizeHttpUrl as the rejecting-variant reference, Vitest 4 + mongodb-memory-server suite with direct-handler-invocation conventions, tests/setup.ts canonical test JWT secret
provides:
  - src/lib/seo.ts isHttpUrl(value): boolean — strict WHATWG-URL http(s) gate helper (rejecting variant of normalizeHttpUrl)
  - POST /api/v1/cms/affiliate-links rejects non-http(s) base_url AND product_url with 400 before any DB write (AFF-01)
  - PUT /api/v1/cms/affiliate-links/[id] rejects non-http(s) base_url with 400 before field assignment; stored doc untouched; partial-update semantics preserved
  - tests/api/affiliate-links-scheme.test.ts — 11-test acceptance/rejection matrix incl. verbatim-storage and DB-unchanged assertions
affects: [01-04 canonical-auth sweep (same two routes get auth swap — scheme gate must survive), verifier UAT for AFF-01, admin UI error-surface behavior]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 3220        # chars/4 over the realized diff (12,880 chars across 2 task commits); plan estimated 38,000
  tasks: 2
  commits: 2          # MEASURED: git rev-list --count 21b54638..HEAD
  plan_head_before: 21b5463892d664ba7b522bd24ff7e53aac7fb407

# Tech tracking
tech-stack:
  added: []           # zero new packages (T-1-SC honored: no npm installs in this plan)
  patterns:
    - Strict-vs-lenient helper pairing: isHttpUrl (rejecting, security boundary) deliberately lives next to normalizeHttpUrl (silent-fallback, SEO display) without reusing it — same parse mechanics, opposite failure contract
    - Accept/reject-only validation: the gate never mutates or re-normalizes the stored value; whatever passes is stored verbatim (schema has no trim/lowercase, verified)
    - Direct-handler integration matrix with countDocuments before/after assertions proving "400 and writes nothing"

key-files:
  created:
    - tests/api/affiliate-links-scheme.test.ts
  modified:
    - src/lib/seo.ts
    - src/app/api/v1/cms/affiliate-links/route.ts
    - src/app/api/v1/cms/affiliate-links/[id]/route.ts

key-decisions:
  - "POST product_url gate implemented as one combined check (!isHttpUrl(finalBaseUrl) || !isHttpUrl(finalProductUrl)) — finalProductUrl always falls back to finalBaseUrl, so it is present whenever the required-field check passed; no separate presence branch needed"
  - "PUT gate placed after the 404 check and before the base_url field assignment (PATTERNS insertion point) — preserves 404-first semantics for nonexistent ids while guaranteeing a rejected scheme never reaches assignment"
  - "isHttpUrl added to src/lib/seo.ts next to normalizeHttpUrl without reusing it (plan mandate) — the silent-fallback contract is correct for SEO display, wrong for a security boundary; both are documented as an intentional pair"

patterns-established:
  - "Strict/lenient validation pairing: display-layer fallback helpers and security-boundary rejecting helpers coexist under clearly labeled contracts"
  - "Verbatim-storage assertion: security gates assert stored === input to pin the no-normalization-on-write rule (catches future trim/lowercase schema drift)"

requirements-completed: [AFF-01]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "isHttpUrl(value): boolean helper — WHATWG URL parse + protocol check only (no regex), trims whitespace, accepts http:/https: in any case"
    requirement: AFF-01
    verification:
      - kind: unit
        ref: "tests/api/affiliate-links-scheme.test.ts#isHttpUrl (AFF-01 strict helper) — 2 tests (accept matrix + reject matrix)"
        status: pass
    human_judgment: false
  - id: D2
    description: "POST /api/v1/cms/affiliate-links: non-http(s) or unparseable base_url/product_url (javascript:, data:, ftp://, not-a-url, //protocol-relative) → 400 {status:'error', message:'base_url phải là URL http/https'} with zero new documents"
    requirement: AFF-01
    verification:
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#rejects every non-http(s) or unparseable base_url with 400 and writes nothing"
        status: pass
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#validates product_url by the same http(s) rule when provided (Jina scrape target)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Valid http(s) URLs pass unchanged on POST and are stored verbatim — uppercase scheme (HTTP://) accepted via WHATWG lowercasing, whitespace-trimmed input accepted and stored untrimmed, no re-normalization on write"
    requirement: AFF-01
    verification:
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#accepts valid http(s) base_url values and stores them verbatim (no normalization on write)"
        status: pass
    human_judgment: false
  - id: D4
    description: "PUT /api/v1/cms/affiliate-links/[id]: provided non-http(s)/unparseable base_url → 400 with the stored document's base_url verified unchanged by reload; absent base_url keeps partial-update semantics (other fields still applied)"
    requirement: AFF-01
    verification:
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#rejects a scheme-carrying malicious base_url with 400 and leaves the stored document unchanged"
        status: pass
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#rejects an unparseable base_url with 400 and leaves the stored document unchanged"
        status: pass
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#keeps partial-update semantics: a body without base_url proceeds unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "Valid PUT updates (incl. idempotent double-PUT of the same base_url) succeed with no additional side effects; missing/empty base_url on POST keeps the pre-existing required-field 400 path"
    requirement: AFF-01
    verification:
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#is idempotent: PUTting the same valid base_url twice succeeds with no extra side effects"
        status: pass
      - kind: integration
        ref: "tests/api/affiliate-links-scheme.test.ts#keeps the pre-existing required-field 400 for a missing/empty base_url"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual (optional per plan): admin UI flow — creating a link with a normal https URL is unaffected and the UI surfaces the 400 message on a bad scheme"
    verification: []
    human_judgment: true
    rationale: "The plan marks this verification as optional manual UI checking; the API contract behind it is fully pinned by tests (D2–D5), but the admin form's error rendering requires a human to load the CMS and observe the surfaced message"

# Metrics
duration: 4min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 03: Affiliate Link Scheme Validation (AFF-01) Summary

**Locked the affiliate link store to http(s) URLs at the CMS write boundary — POST and PUT reject `javascript:`/`data:`/unparseable base_url (and product_url on create) with 400 and leave the DB untouched, via a strict WHATWG-URL `isHttpUrl` gate pinned by an 11-test integration matrix.**

## Performance

- **Duration:** 4min
- **Started:** 2026-09-14T18:24:01Z
- **Completed:** 2026-09-14T18:28:13Z
- **Tasks:** 2/2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- A `javascript:` or `data:` URL can no longer enter the affiliate link store on either write path, therefore can never become a 302 redirect destination or the Jina scrape target (AFF-01 / CONCERNS #9 / SEC-07; threat T-1-07 mitigated, T-1-08 covered by the same POST gate)
- The gate is structurally regex-proof: WHATWG `new URL()` parsing + protocol comparison — encoding tricks that bypass string-prefix checks throw and are rejected; uppercase schemes pass because WHATWG lowercases the protocol; whitespace is trimmed before parsing
- Validation is accept/reject-only at the write boundary: accepted values are stored verbatim (pinned by tests asserting `stored === input`), invalid values write nothing (`countDocuments` before/after assertions), and the pre-existing required-field 400 and PUT partial-update semantics are preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — isHttpUrl helper wired into POST, rejecting javascript: URLs with 400** - `7573016` (feat)
2. **Task 2: PUT validation + full matrix sweep** - `6ae9da6` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `src/lib/seo.ts` (MOD) — new exported `isHttpUrl(value: string): boolean` next to `normalizeHttpUrl`: `new URL(value.trim())` in try/catch, true only for `http:`/`https:` protocols; documented as the strict (rejecting) variant — deliberately not reusing `normalizeHttpUrl`'s silent-fallback contract
- `src/app/api/v1/cms/affiliate-links/route.ts` (MOD) — POST: after `finalBaseUrl`/`finalProductUrl` resolution and before `connectToDatabase()`, rejects with `{ status: 'error', message: 'base_url phải là URL http/https' }` (400) when either URL fails the http(s) check
- `src/app/api/v1/cms/affiliate-links/[id]/route.ts` (MOD) — PUT: when the body provides `base_url`, validates with `isHttpUrl` after the 404 check and before the field assignment; same 400 envelope; absent `base_url` proceeds unchanged
- `tests/api/affiliate-links-scheme.test.ts` (NEW) — 11 tests: isHttpUrl unit matrix (accept/reject), POST accept matrix with verbatim-storage assertions, POST rejection matrix with DB-unchanged assertions, product_url rejection, required-field 400 preservation, PUT accept/malicious/unparseable/partial/idempotency cases

## Decisions Made

- **Combined POST check:** `!isHttpUrl(finalBaseUrl) || !isHttpUrl(finalProductUrl)` — since `finalProductUrl` falls back to `finalBaseUrl`, it is always present once the required-field check passed, so the plan's "finalProductUrl is present and invalid" condition collapses into one guard without a redundant presence branch
- **PUT gate placement:** after the `!link` 404 check, immediately before `if (base_url !== undefined) link.base_url = base_url` (the exact PATTERNS insertion point) — a nonexistent id still 404s first; a bad scheme on an existing link never reaches assignment
- **Strict/lenient pairing documented in-code:** `isHttpUrl` sits beside `normalizeHttpUrl` with a comment explaining why the silent-fallback SEO variant must not back the security boundary (plan prohibition #3)
- **Verbatim-storage pinned:** schema carries no trim/lowercase on `base_url` (verified before writing assertions), so tests assert `stored === input` — including the whitespace case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Mongoose deprecation warning (`new: true` on `findOneAndUpdate`) still appears in full-suite output — documented in 01-01/01-02 summaries, out of scope for this plan (this plan introduced no `findOneAndUpdate` calls).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 01-04 (canonical auth sweep): both affiliate-links routes now import `isHttpUrl` alongside `getAuthUser`; the auth swap in 01-04 must preserve these gates (the two routes are shared between the workstreams)
- Full suite green at close: 12 test files, 69 tests (`npm test`); `npx tsc --noEmit` clean
- Tracer feedback gate satisfied: Task 1's `<verify>` re-run end-to-end before expansion (6/6 pass at gate time, 11/11 after PUT expansion)
- For verify-work: the optional manual UI spot check (admin form error surfacing) maps to coverage D6 (human judgment)

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*
