---
phase: 01-security-remediation
plan: 01
subsystem: security
tags: [xss, csp, rsc, nextjs-16, blacklist, redirect, mongoose, vitest]

# Dependency graph
requires:
  - phase: foundation (pre-existing brownfield)
    provides: tracking/redirect route with pre-blacklist ClickLog create, ClickLog/AffiliateLink/Blacklist models, proxy.ts CSP matcher, editorial theme tokens (globals.css), InsiderResult page pattern
provides:
  - /blocked RSC warning page (DB-backed via ClickLog ref, robots noindex, force-dynamic, fail-closed)
  - Redirect route blacklisted branch: 302 → /blocked?ref=<24-hex ClickLog id> with Cache-Control: no-store (inline HTML deleted)
  - English default block-reason fallback in src/lib/blacklist.ts
  - Regression suite pinning the 302→/blocked contract, XSS-inert rendering, CSP presence, full /blocked state matrix, and page source security contracts
affects: [01-02 rate limiting (redirect/click handlers), 01-04 canonical auth (same route family), verifier UAT for SEC-03/AFF-03, Phase 4 Bento redesign (page is explicitly current-theme, not Bento)]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 7400        # chars/4 over the realized src+tests diff (29,603 chars); plan estimated 65,000
  tasks: 2
  commits: 2          # MEASURED: git rev-list --count 7fc2fd3..HEAD
  plan_head_before: 7fc2fd327465b24135987b4f00f8fe9d5aa22e0d

# Tech tracking
tech-stack:
  added: []           # zero new packages (per RESEARCH.md zero-new-packages phase)
  patterns:
    - ClickLog-ref re-resolution: redirect binds ClickLog create result; page re-resolves current blacklist state from the DB by 24-hex ref (no schema change)
    - Async RSC page contract (Next 16): await searchParams Promise, redirect() from next/navigation, dynamic = 'force-dynamic', robots noindex metadata
    - Fail-closed error rendering: DB failure after valid ref → generic blocked copy, never a crash screen or offer bounce

key-files:
  created:
    - src/app/blocked/page.tsx
    - tests/api/blocked-page.test.ts
  modified:
    - src/app/api/v1/public/tracking/redirect/route.ts
    - src/lib/blacklist.ts
    - tests/api/tracking-redirect.test.ts

key-decisions:
  - "ClickLog._id is the /blocked ref — the only URL-borne value, validated 24-hex before any DB call (D-10); page re-resolves blacklist state race-tolerantly (D-11 preserved)"
  - "Page styled with Tailwind arbitrary values over globals.css editorial tokens inside page.tsx (no CSS module) — stays within the plan's declared artifact set"
  - "CTA/masthead use plain <a> instead of next/link — guarantees zero client JS on the security interstitial"
  - "Redirect route fallback branches normalized to explicit 302 (was implicit 307) for consistency with healthy and blacklisted branches"

patterns-established:
  - "RSC result-page pattern: standalone editorial shell (canvas/shell/masthead/receipt/footer) reusable for future standalone public result pages"
  - "Source-contract test pattern: read page source as text and assert security invariants (no dangerouslySetInnerHTML, no absolute origins, noindex present)"

requirements-completed: [SEC-03, AFF-03]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Blacklisted click → 302 to /blocked?ref=<24-hex ClickLog id> with Cache-Control: no-store; never to the offer"
    requirement: AFF-03
    verification:
      - kind: integration
        ref: "tests/api/tracking-redirect.test.ts#redirects a blacklisted affiliate link to /blocked?ref=<24-hex> with no-store, never to the offer"
        status: pass
    human_judgment: false
  - id: D2
    description: "All blacklist-supplied strings (project name, reason, countries) render as inert React text children — entity-encoded, raw tag sequences from data never appear; no dangerouslySetInnerHTML"
    requirement: SEC-03
    verification:
      - kind: integration
        ref: "tests/api/blocked-page.test.ts#entity-encodes markup-shaped blacklist strings; raw tag sequences from data never render"
        status: pass
      - kind: other
        ref: "tests/api/blocked-page.test.ts#never renders data through a raw-HTML mechanism (dangerouslySetInnerHTML banned)"
        status: pass
    human_judgment: false
  - id: D3
    description: "/blocked carries the site CSP via the existing proxy matcher with zero proxy changes; no third-party origins in the page source"
    requirement: SEC-03
    verification:
      - kind: other
        ref: "tests/api/blocked-page.test.ts#carries the site CSP on /blocked via proxy() with zero proxy changes"
        status: pass
      - kind: other
        ref: "tests/api/blocked-page.test.ts#introduces no third-party origin (no absolute http(s) URL in the page source)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/blocked state matrix: missing/array/malformed ref → home before any DB call; unknown ref → home; link no longer blacklisted → home (race-tolerant); DB failure → fail-closed copy (Project: Unavailable, no bounce, no crash); empty reason → English default; empty countries → row omitted"
    requirement: AFF-03
    verification:
      - kind: integration
        ref: "tests/api/blocked-page.test.ts#/blocked state matrix (UI-SPEC Interaction & Security Contract) — 5 tests"
        status: pass
    human_judgment: false
  - id: D5
    description: "Editorial visual quality of /blocked per UI-SPEC (typography pair, spacing scale, ink/white palette with #B91C1C accent focal point, hard offset shadow, overflow-wrap backstops for long sheet strings)"
    verification: []
    human_judgment: true
    rationale: "Aesthetics and CSS-level wrapping cannot be asserted by renderToStaticMarkup tests (no stylesheet in test env) — verifier should load /blocked?ref=<blacklisted click id> locally and confirm the themed render, CSP header in devtools, and long-value wrapping"
  - id: D6
    description: "English default block-reason fallback strings in src/lib/blacklist.ts (replaces Vietnamese literals, PROJECT.md #8)"
    requirement: SEC-03
    verification:
      - kind: integration
        ref: "tests/api/blocked-page.test.ts#applies the default block reason when the DB reason is empty and omits the countries row when the list is empty"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 01: Blacklist Warning Page (/blocked RSC) Summary

**Rebuilt the blacklist interceptor's inline-HTML warning (unescaped interpolation + Tailwind Play CDN, no CSP) as a DB-backed `/blocked` RSC route — 302 via 24-hex ClickLog ref, every blacklist string rendered as inert React text, site CSP restored with zero proxy changes.**

## Performance

- **Duration:** 7min
- **Started:** 2026-09-14T10:57:05Z
- **Completed:** 2026-09-14T11:04:15Z
- **Tasks:** 2/2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Stored-XSS vector (T-1-01) removed structurally: the interpolated `warningHtml` string and its Play CDN `<script>` are deleted; a blacklisted click now 302s to `/blocked?ref=<ClickLogId>` and the page renders blacklist data as React text children under the editorial theme
- Full UI-SPEC state matrix implemented and pinned by tests: invalid/array/unknown ref → home before any DB call, race-tolerant re-resolution, empty reason → English default, empty countries → row omitted, DB failure → fail-closed copy (never a bounce to the offer, never a crash screen)
- Security source contracts enforced by tests: no `dangerouslySetInnerHTML`, no absolute http(s) origins, robots noindex, CSP present via `proxy()` — plus a11y contract (`<main>`, aria-labelledby H1, aria-hidden status mark, 3px #B91C1C focus ring, motion-reduce hover disable)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — blacklisted click → 302 /blocked?ref → inert RSC render** - `64230c4` (feat)
2. **Task 2: Expansion — boundary states + security contract assertions** - `a1d7bcf` (test)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `src/app/blocked/page.tsx` (NEW) — async RSC `BlockedPage`: `dynamic = 'force-dynamic'`, robots noindex metadata, 24-hex ref validation before any DB call, DB re-resolution chain (ClickLog → AffiliateLink → blacklist check), fail-closed DB-error state, full editorial render per UI-SPEC
- `src/app/api/v1/public/tracking/redirect/route.ts` (MOD) — ClickLog create result bound (`const [clickLog] = await Promise.all(...)`), entire `warningHtml` block deleted, blacklisted branch returns `NextResponse.redirect(new URL('/blocked?ref=…', req.url), 302)` + `Cache-Control: no-store`; fallback branches normalized to explicit 302
- `src/lib/blacklist.ts` (MOD) — both Vietnamese default-reason fallbacks replaced with `Flagged by the AIDEALSUK safety review — fraud or unpaid commissions.`
- `tests/api/blocked-page.test.ts` (NEW) — populated render, XSS entity-encoding contract, proxy CSP assertion, 5-case state matrix, a11y contract, security source contract
- `tests/api/tracking-redirect.test.ts` (MOD) — blacklisted-branch assertions moved from inline-HTML 200 to the 302→`/blocked?ref=<24-hex>` + no-store contract; fallback branch 307→302

## Decisions Made
- **ClickLog._id as the ref (D-10):** redirect binds the ClickLog create result; the page re-resolves blacklist state from the DB — race-tolerant, no schema migration
- **Styling inside page.tsx:** Tailwind arbitrary values over globals.css editorial tokens (no CSS module) — keeps the artifact set exactly as planned
- **Plain `<a>` for CTA/masthead brand** instead of `next/link` — guarantees zero client JS on this security interstitial (UI-SPEC rule 1/7)
- **Fallback branches → explicit 302** (PATTERNS self-analog note): all redirect-route branches now consistent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing Mongoose deprecation warning (`new: true` option on `findOneAndUpdate` in the redirect route's healthy branch) surfaces in test output. Out of scope for this plan (pre-existing pattern the plan instructs to keep inside the Promise.all); logged here for a future hygiene pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for 01-02 (rate limiting on the same public tracking/insider endpoints) — the redirect route's blacklisted branch is now a clean single return point; the tracing/redirect suite is the regression backstop for further handler changes
- Full suite green after this plan: 10 test files, 52 tests (`npm test`), `tsc --noEmit` clean
- Note for verify-work: the manual spot check from the plan's `<verification>` (hit a blacklisted link locally, confirm CSP header, no `cdn.*` request) maps to coverage item D5 (human judgment)

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*
