---
phase: 01-security-remediation
plan: 07
subsystem: security
tags: [sec-04, ip-spoofing, x-forwarded-for, last-hop, redos, escaperegexp, regex-dos, nginx-overwrite, public-input, defense-in-depth, vitest]

# Dependency graph
requires:
  - phase: 01-05 (rate-limit suite keyed on getClientIp)
    provides: the consumeRequest/consumeDedupe limiter + 3 public write
      endpoint integrations (subscribe hard 429, click/redirect flood cap +
      60s dedupe) and the tests/api/rate-limit.test.ts suite whose isolation
      headers (single-entry XFF) the last-hop parse flip must leave invariant.
      Plan 07 changes how getClientIp reads XFF — the limiter's keys (strings
      of the form `'subscribe:${ip}'`, `'click:${ip}'`, `dedupeKey`) resolve
      identically under the flip because the tests use single-entry XFF values
      only (01-05 must_haves threat T-1-16 contract).
  - phase: 01-02 (DEPLOY.md canonical home for runtime config)
    provides: DEPLOY.md §8 nginx template (the file 01-07 §8 extends with the
      overwrite directive) and §9 dual-block warning that the VPS manual step
      leans on; §13 (reset-admin) untouched this plan.
provides:
  - SEC-04 closure (this plan's slice): the public-input abuse arc closed —
    spoofed XFF first entries cannot influence limiter keying or
    ClickLog.ip_address (code half here, VPS Nginx half in user_setup), and a
    crafted ReDoS search pattern against the unauthenticated articles search
    completes in microseconds with literal-only matches thanks to escapeRegExp
    + the 100-char defense-in-depth cap.
  - src/lib/utils.ts — getClientIp last-hop fix (D-14) + escapeRegExp relocated
    here as a single exported shared source (the ReDoS defense primitive every
    user-text→RegExp conversion must wrap with).
  - tests/lib/client-ip.test.ts — NEW 7-case last-hop matrix (single entry,
    spoofed first entry ignored, multi-hop spoofed chain, whitespace trim,
    X-Real-IP fallback, XFF-priority over X-Real-IP, the no-header
    '127.0.0.1' default)
  - tests/lib/redos.test.ts — NEW 9-case matrix: escapeRegExp metacharacter
    escaping (14 metachars checked individually + mixed-payload literal-only),
    timed evil-pattern `(a+)+$x` invocation (<2000ms over 50k-char haystack,
    correct literal match), boundary at the 100-char SEARCH_KEYWORD_MAX_LENGTH
    cap (at-cap builds regex, over-cap skips builder per graceful-skip)
  - DEPLOY.md §8 — XFF overwrite directive ($remote_addr, not
    $proxy_add_x_forwarded_for) with the rationale comment + VPS manual steps
    (apply to BOTH 80 and 443 server blocks per §9 dual-block warning,
    nginx -t/reload, post-deploy verification curl asserting the spoofed XFF
    value does not reach ClickLog.ip_address)
affects: [01-VALIDATION.md (the VPS Nginx-XFF manual verification item is the
  only outstanding human-judgment piece; the code+docs half is auto-verified
  here), future plans that wrap user text in a RegExp (escapeRegExp is now the
  single shared source at @/lib/utils — any new user-text→RegExp site imports
  it rather than re-rolling), ops tuning (SEARCH_KEYWORD_MAX_LENGTH is a
  constant in src/app/api/v1/public/articles/route.ts, not a magic-number
  inline; the XFF overwrite is a deploy-time VPS action that must be re-applied
  if the Nginx config is regenerated)]
requires_plans: ["01-02", "01-05"]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 4800          # chars/4 over the realized src+tests+DEPLOY diff
                        # (~19,235 chars across 7 files); the plan estimated
                        # 34,000 / 17,000 raw over 2 tasks with low confidence
                        # — actual scope was smaller: the escapeRegExp body is
                        # a verbatim relocation (no new logic), the redos tests
                        # follow the sanitize.test.ts conventions tightly,
                        # and the XFF client-ip matrix is 7 cases not 10.
                        # Estimate was directionally correct (small plan);
                        # actual sits below both estimate bands.
  tasks: 2
  commits: 2            # MEASURED: git rev-list --count ec09da7..HEAD
  plan_head_before: ec09da7fc4b1fadb7aaecc08412f273d67380508

# Tech tracking
tech-stack:
  added: []             # zero new packages (T-1-SC honored: no npm installs in this plan)
  patterns:
    - Single-shared-source escapeRegExp: a security primitive (regex
      metacharacter escaping) that every user-text→RegExp conversion must wrap
      with lives in one place (src/lib/utils.ts) and is imported rather than
      re-rolled. The plan's §prohibitions "no user-text→RegExp site may remain
      unescaped" enforces this at the import site — auditors grep for
      `new RegExp(` and check for the escapeRegExp wrap.
    - IP-trust split (code+config pair, D-14): IP trust is enforced by code
      (last-hop parse in getClientIp) AND config (Nginx overwrites XFF with
      $remote_addr) together. Neither half alone is sufficient — code-only
      trusts the app's direct caller (Nginx, correct in single-proxy topology)
      but a misconfigured append-mode Nginx re-introduces the hole; config-only
      doesn't help if getClientIp reads the first entry. The two halves are
      cross-referenced in comments (getClientIp cites DEPLOY.md §8; DEPLOY.md
      §8 cites getClientIp) so a future edit to either side lands with context.
    - Defense-in-depth cap on regex input length: SEARCH_KEYWORD_MAX_LENGTH
      (100) is a named constant at the top of the route, not a magic number —
      over-cap keywords skip the regex filter gracefully (no 400, no hang, the
      route just returns the unfiltered result set). The escapeRegExp wrap
      alone neutralizes backtracking metacharacters; the cap adds a second
      layer for engine-warmth and pathological-literal inputs.
    - Order-invariance test isolation contract: client-ip.test.ts and the
      rate-limit suite both use single-entry XFF values wherever a multi-hop
      XFF is not under explicit test. Any future parse flip (back to first-hop
      or to a hop-count-aware scheme) lands without test churn because single-
      entry XFF resolves identically under every variant.

key-files:
  created:
    - tests/lib/client-ip.test.ts
    - tests/lib/redos.test.ts
  modified:
    - src/lib/utils.ts
    - src/lib/homepage-articles.ts
    - src/lib/blacklist.ts
    - src/app/api/v1/public/articles/route.ts
    - DEPLOY.md

key-decisions:
  - "getClientIp parses entries[entries.length-1] (the array's pop) rather than
    split(',').pop() so the whitespace-trim happens on the bound array element.
    Equivalent output, marginally clearer to a reader auditing why we trust
    only one specific hop. Signature and '127.0.0.1' default unchanged (plan
    05's limiter + existing tests key on both — prohibition #4)."
  - "escapeRegExp is exported from src/lib/utils.ts in Task 1 (alongside the
    getClientIp fix), but Task 2 is the one that wires it at both remaining
    user-text→RegExp sites (articles route + blacklist sweeper) and deletes
    the local copy from homepage-articles.ts. The split keeps Task 1 focused
    on the IP-trust fix (T-1-16) and Task 2 on the ReDoS hardening (T-1-17) —
    two independent failure modes, clean atomic commits, easy bisect."
  - "The 100-char cap lives as a named constant SEARCH_KEYWORD_MAX_LENGTH at
    the top of the articles route, with a comment explaining it is defense-in-
    depth (escapeRegExp already neutralizes backtracking metacharacters —
    literal-only patterns cannot blow up). The cap is for engine-warmth and
    pathological-literal inputs. Over-cap keywords skip the regex filter
    gracefully — no 400, no hang, the route just returns the unfiltered set.
    The plan's wording 'graceful defense-in-depth; no 400, no hang' is the
    contract the test pins."
  - "DEPLOY.md §8 directive replaced in BOTH the nginx template block AND the
    manual replacement instruction reflect the same change (the instruction
    tells the VPS operator to swap $proxy_add_x_forwarded_for for $remote_addr
    in both 80 and 443 blocks). The §9 dual-block warning (Certbot splits the
    file) is explicitly cited — without that context an operator applying only
    to the 80 block re-introduces the spoof hole via the 443 path."
  - "Rate-limit tests stay green by design, not by accident: 01-05 (must_haves
    truth + threat T-1-16) specified that the rate-limit suite use single-
    entry XFF values specifically so 01-07's parse flip would be order-
    invariant under them. The 14/14 rate-limit tests pass at this plan's close
    unchanged from 01-05."

patterns-established:
  - "Security primitive co-location: when a defense primitive (escapeRegExp)
    has multiple consumers (public articles search + blacklist sweeper +
    homepage query), it lives in a single module (src/lib/utils.ts) and is
    imported rather than re-rolled. The audit surface is one regex body, not
    three. Downstream plans that wrap user text in a RegExp import this
    helper — any new user-text→RegExp site is an audit-flag target."
  - "Defense-in-depth stack on a single vector: ReDoS is defended by (1) metacharacter
    escaping (escapeRegExp), (2) length cap (SEARCH_KEYWORD_MAX_LENGTH), and
    (3) the existing limiter from plan 05 eating the per-IP flood. Each layer
    would be sufficient alone; the layers protect against different
    misconfiguration classes. The plan called this pattern out explicitly
    ('graceful defense-in-depth; no 400, no hang') — the 100-char cap is the
    documented second layer."
  - "Code+config security-pair: IP trust (and any future 'header-parsed trust
    boundary') is enforced by paired code (getClientIp) AND infrastructure
    config (Nginx XFF overwrite). Documentation cross-references both halves
    so an editor touching either side lands with the other half's context.
    Mismatch exists — the deploy_set frontmatter records the VPS Nginx action
    as a manual step the user must perform; the code alone closes the hole
    only in the existing single-Nginx-no-CDN topology (SEC-04/nginx flagged-
    assumption in the plan)."

requirements-completed: [SEC-04]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "getClientIp returns the LAST X-Forwarded-For entry, ignoring attacker-prepended spoofed first entries (D-14 code half; T-1-16 mitigation)"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'returns a single X-Forwarded-For entry as that entry'"
        status: pass
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'returns the LAST X-Forwarded-For entry even when the first entry is a spoofed value'"
        status: pass
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'returns the LAST of more than two hops (spoofed chain)'"
        status: pass
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'trims whitespace around the last XFF entry'"
        status: pass
    human_judgment: false
  - id: D2
    description: "getClientIp preserves the X-Real-IP fallback and the '127.0.0.1' no-header default — plan 05's limiter and existing tests key on both (prohibition #4)"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'falls back to X-Real-IP when X-Forwarded-For is absent'"
        status: pass
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > \"defaults to '127.0.0.1' when neither header is present\""
        status: pass
      - kind: unit
        ref: "tests/lib/client-ip.test.ts > 'prefers X-Forwarded-For over X-Real-IP when both are present'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Plan 05's rate-limit suite stays green under the getClientIp parse flip — order-invariant isolation asserted (the 14 rate-limit tests use single-entry XFF per the 01-05 contract; last-hop parse resolves them identically to first-hop)"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "tests/api/rate-limit.test.ts — 14/14 pass after the flip (verified inline at `npx vitest run tests/lib/client-ip.test.ts tests/api/rate-limit.test.ts` → 21/21 total)"
        status: pass
    human_judgment: false
  - id: D4
    description: "DEPLOY.md §8 documents the Nginx XFF overwrite directive ($remote_addr, not $proxy_add_x_forwarded_for) with the rationale comment, the dual-block warning cross-reference to §9, the manual VPS steps (edit both 80/443 server blocks, nginx -t, systemctl reload nginx), and the post-deploy verification curl (spoofed XFF must not reach ClickLog.ip_address)"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "Select-String -Path DEPLOY.md -Pattern 'X-Forwarded-For \\$remote_addr' -Quiet → True (directive landed in the nginx template block)"
        status: pass
      - kind: other
        ref: "DEPLOY.md §8 manual VPS step text references the §9 dual-block warning and names the verification curl — read-and-verified at plan close"
        status: pass
    human_judgment: false
  - id: D5
    description: "escapeRegExp is the single shared source from src/lib/utils.ts — homepage-articles.ts imports it and deletes its local copy; no user-text→RegExp site remains with a re-rolled helper"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "src/lib/homepage-articles.ts — `import { escapeRegExp } from '@/lib/utils'` (line ~6) and the local `function escapeRegExp` definition removed (was line 28-30 pre-plan); usage shape `new RegExp(escapeRegExp(query), 'i')` unchanged (the proven reference)"
        status: pass
      - kind: unit
        ref: "tests/lib/redos.test.ts > 'escapes every regex metacharacter, producing a pattern that matches only the literal' — 14 metachars checked individually"
        status: pass
    human_judgment: false
  - id: D6
    description: "Public articles search builder (src/app/api/v1/public/articles/route.ts) escapes the trimmed keyword via escapeRegExp and skips the regex filter entirely when the keyword exceeds 100 chars (graceful defense-in-depth — no 400, no hang)"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/lib/redos.test.ts > 'a nested-quantifier evil input stays fast and matches literally' — `new RegExp(escapeRegExp('(a+)+$x')).test('a'.repeat(50_000) + 'b')` completes in <2000ms with correct literal-only result"
        status: pass
      - kind: unit
        ref: "tests/lib/redos.test.ts > 'does not over-match — literal-only patterns ignore semantic regex meaning' — 'a.c' matches 'a.c' but not 'abc'"
        status: pass
    human_judgment: false
  - id: D7
    description: "100-char SEARCH_KEYWORD_MAX_LENGTH cap is a named constant at the top of the articles route; over-cap keywords skip the builder (no RegExp construction), returning the unfiltered result set"
    requirement: SEC-04
    verification:
      - kind: unit
        ref: "tests/lib/redos.test.ts > 'keywords at the boundary build a literal regex' — 100-char keyword builds a working literal regex"
        status: pass
      - kind: unit
        ref: "tests/lib/redos.test.ts > 'an over-cap keyword does not reach the RegExp engine — the route returns the unfiltered result set' — 150-char keyword does not invoke the builder (regexBuilt === false, regex === null)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Blacklist retroactive sweeper (src/lib/blacklist.ts sweepRetroactiveBlacklist) escapes its rootDomain || hostname || targetDomainOrUrl argument via escapeRegExp before new RegExp(...)"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "src/lib/blacklist.ts sweepRetroactiveBlacklist — `const searchRegexSource = escapeRegExp(rootDomain || hostname || targetDomainOrUrl); const searchRegex = new RegExp(searchRegexSource, 'i');` (replaces the previous unescaped `new RegExp(arg, 'i')`)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Full suite green at plan close — no regressions from the IP parse flip, the escapeRegExp relocation, or the new cap; the test count grows from 14/145 (close of 01-05) to 17/189 here"
    requirement: SEC-04
    verification:
      - kind: integration
        ref: "npm test — 17 test files / 189 tests pass (close-of-plan)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit exit 0 (the escapeRegExp relocation introduced a new import at src/lib/homepage-articles.ts and src/lib/blacklist.ts — both typecheck)"
        status: pass
    human_judgment: false
  - id: D10
    description: "VPS Nginx applies the XFF overwrite directive in BOTH the 80 and 443 server blocks (D-14 config half) — the code half closes the hole only in the single-Nginx-no-CDN topology; the VPS step closes it in production regardless of whether any upstream proxy sits in front"
    requirement: SEC-04
    verification: []
    human_judgment: true
    rationale: "The Nginx config lives on the VPS outside git; the §9 dual-block warning (Certbot splits the file into separate listen 80 and listen 443 blocks) means the directive must be applied to BOTH manually. The DEPLOY.md §8 manual step + the 01-VALIDATION.md post-deploy verification curl (`curl -H 'X-Forwarded-For: 1.2.3.4' ... && check ClickLog.ip_address`) are the human-judgment deliverables. Until applied, a spoofed XFF from an upstream client (CDN, browser extension, manual curl) will still reach getClientIp and pollute the limiter key + ClickLog.ip_address. The code half (D1-D2, D9) is the auto-verified layer; this is the production-runtime layer the operator must perform."

# Metrics
duration: 7min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 07: Public-Input IP Trust + ReDoS Hardening (SEC-04) Summary

**Closes the public-input abuse arc for Phase 1 — a spoofed `X-Forwarded-For` header no longer decides the limiter key or `ClickLog.ip_address` (D-14 code half in `getClientIp` + Nginx overwrite directive documented in DEPLOY.md §8 as a manual VPS step), and a crafted `(a+)+$`-class regex input against the unauthenticated articles search completes in microseconds with literal-only matches thanks to a single shared `escapeRegExp` applied at both remaining user-text→RegExp sites plus a 100-char defense-in-depth cap.**

## Performance

- **Duration:** 7min
- **Started:** 2026-09-14T23:45:08Z
- **Completed:** 2026-09-14T23:52:26Z
- **Tasks:** 2/2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- **T-1-16 (XFF first-hop spoofing defeating plan 05's limiter keying) closed — code half.** `getClientIp` in `src/lib/utils.ts` now reads `entries[entries.length - 1].trim()` (the LAST X-Forwarded-For hop — the one our own Nginx appends) instead of `forwarded.split(',')[0].trim()` (the first, attacker-controlled) entry. The exported signature, X-Real-IP fallback, and the `'127.0.0.1'` default are unchanged (prohibition #4 — plan 05's limiter and existing tests key on both). The 7-case `tests/lib/client-ip.test.ts` matrix pins single-entry, multi-entry-with-spoofed-first, 3-hop spoofed chain, whitespace trim, X-Real-IP fallback, X-Real-IP/X-Forwarded-For priority, and the no-header default.

- **T-1-16 config half documented in DEPLOY.md §8.** The Nginx template's `proxy_set_header X-Forwarded-For` directive now uses `$remote_addr` (overwrite — header carries exactly one attacker-unforgeable value) instead of `$proxy_add_x_forwarded_for` (append — keeps the client-supplied value). The rationale comment explains why; the manual VPS application step is documented (apply to BOTH the `listen 80` and the `listen 443 ssl` Certbot-split blocks per §9 dual-block warning, `nginx -t`, `systemctl reload nginx`); and the post-deploy verification curl from 01-VALIDATION.md is referenced (`curl -H "X-Forwarded-For: 1.2.3.4" ... && check ClickLog.ip_address` must show real IP, not `1.2.3.4`).

- **T-1-17 (ReDoS via public search) closed.** `escapeRegExp` is relocated from the local copy in `src/lib/homepage-articles.ts` to a single exported function in `src/lib/utils.ts`, and applied at both remaining user-text→RegExp sites:
  1. `src/app/api/v1/public/articles/route.ts` — the public, unauthenticated search. Wraps the trimmed keyword in `escapeRegExp(...)` AND adds a 100-char `SEARCH_KEYWORD_MAX_LENGTH` cap that skips the regex filter gracefully (no 400, no hang — search just stops filtering) on over-cap input.
  2. `src/lib/blacklist.ts` sweeper — the admin/sheet-input retroactive blacklister. Wraps the `rootDomain || hostname || targetDomainOrUrl` argument in `escapeRegExp(...)`.

  The new `tests/lib/redos.test.ts` (9 cases) pins the escapeRegExp behavior (14 metachars + mixed payload), a timed `(a+)+$x` input that completes in <2000ms against a 50k-char haystack with correct literal-only match, the over-match rejection (literal `'a.c'` does not match `'abc'`), and the 100-char cap boundary (at-cap builds regex, over-cap skips builder).

- **Plan 05's rate-limit suite stays green under the parse flip — by design.** The 14/14 rate-limit tests all use single-entry X-Forwarded-For values per the 01-05 must_haves threat T-1-16 contract — last-hop parse resolves single-entry headers identically to first-hop. No test churn. Order-invariance was the explicit design point of 01-05's test isolation.

## Task Commits

Each task was committed atomically:

1. **Task 1: last-hop getClientIp + client-ip matrix + Nginx XFF overwrite docs** — `c1caf1e` (feat)
2. **Task 2: escapeRegExp relocation + ReDoS hardening at both RegExp sites** — `38d9bde` (fix)

**Plan metadata:** (this commit, docs) — measured `git rev-list --count ec09da7..HEAD = 2`.

## Files Created/Modified

- `src/lib/utils.ts` (MOD) — `getClientIp` rewritten to return `entries[entries.length-1].trim()` (the LAST X-Forwarded-For hop) with a D-14 cite comment explaining last-hop trust rationale and cross-referencing DEPLOY.md §8; `escapeRegExp` exported here as the single shared source (relocated from `homepage-articles.ts:28-30`, body byte-identical to the proven original). Sig + `'127.0.0.1'` default unchanged.
- `src/lib/homepage-articles.ts` (MOD) — `import { escapeRegExp } from '@/lib/utils'` (top imports) replaces the local `function escapeRegExp` definition; usage shape `new RegExp(escapeRegExp(query), 'i')` unchanged.
- `src/app/api/v1/public/articles/route.ts` (MOD) — `SEARCH_KEYWORD_MAX_LENGTH = 100` constant at module top; search block wraps `trimmedKeyword` in `escapeRegExp(...)` inside a length-guard `if (trimmedKeyword.length <= SEARCH_KEYWORD_MAX_LENGTH)` so over-cap keywords skip the regex filter (no 400, no hang).
- `src/lib/blacklist.ts` (MOD) — `sweepRetroactiveBlacklist` wraps `rootDomain || hostname || targetDomainOrUrl` in `escapeRegExp(...)` via a `searchRegexSource` intermediate; cite comment explaining the admin/sheet-input vector.
- `DEPLOY.md` (MOD) — §8 Nginx template directive swapped from `$proxy_add_x_forwarded_for` to `$remote_addr` (overwrite); added the operator manual instructions (edit in BOTH 80 + 443 blocks per §9 dual-block warning) and the post-deploy verification curl cross-reference.
- `tests/lib/client-ip.test.ts` (NEW, 7 tests) — last-hop matrix: single entry, spoofed first entry ignored, 3-hop spoofed chain, whitespace trim, X-Real-IP fallback, XFF-priority over X-Real-IP, `'127.0.0.1'` no-header default.
- `tests/lib/redos.test.ts` (NEW, 9 tests) — escapeRegExp metachar + literal-only matrix + timed evil-pattern invocation <2000ms + 100-char cap boundary (at-cap builds regex, over-cap skips builder).

## Decisions Made

See `key-decisions` frontmatter above. The five worth surfacing for downstream context:

1. **getClientIp uses `entries[length-1]` (array indexing) not `pop()`** so the trim is visibly bound to a specific hop count. Equivalent output; marginally clearer to an auditor asking "why this hop?". Signature unchanged.
2. **escapeRegExp lives in `utils.ts` from Task 1, but the wiring to both RegExp sites is Task 2.** Each task closes one independent threat (T-1-16 vs T-1-17); clean bisect, atomic commits.
3. **The 100-char cap is a named constant with a rationale comment**, not an inline magic number. The over-cap branch skips the regex filter gracefully (no 400 — the plan's exact wording).
4. **DEPLOY.md §8 cites §9's dual-block warning** so an operator applying the directive only to the `listen 80` block (which Certbot has demoted to a redirect-only role) doesn't miss the `listen 443` block. Without §9 context, this would silently re-introduce the spoof hole.
5. **Rate-limit suite order-invariance is intentional**, not lucky — 01-05 already pinned it via single-entry XFF isolation, anticipating 07's flip.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing Mongoose deprecation warning (`new: true` on `findOneAndUpdate`) still surfaces in `npm test` output — documented across 01-01/01-02/01-03/01-04/01-05/01-06 summaries, out of scope for this plan (no new find* calls added).
- The PowerShell `${PHASE}..HEAD` count-via-env expansion differs from bash's `${VAR}..HEAD` — fell back to direct hash (`git rev-list --count ec09da7..HEAD = 2`). Cosmetic — the SUMMARY uses the correct measured count; the `commits: 2` and `plan_head_before: ec09da7` fields reflect what `/gsd-verify-work` will re-measure equivalently.

## User Setup Required

**VPS Nginx XFF overwrite directive** — operator action on the VPS post-deploy. The DEPLOY.md §8 directive (`proxy_set_header X-Forwarded-For $remote_addr;`) replaces the previous `$proxy_add_x_forwarded_for`. Manual steps:

1. SSH into the VPS, open `/etc/nginx/sites-available/websiteafiliate`.
2. Swap the directive **in BOTH** the `listen 80` block and the `listen 443 ssl` block that Certbot generates (§9 dual-block warning).
3. Verify: `sudo nginx -T | grep -B3 'X-Forwarded-For'` — directive must appear at both blocks.
4. `sudo nginx -t && sudo systemctl reload nginx`.
5. Post-deploy verification (from 01-VALIDATION.md): `curl -H "X-Forwarded-For: 1.2.3.4" https://aidealsuk.com/api/v1/public/tracking/click ...` then check `ClickLog.ip_address` — must show the real client IP, NOT `1.2.3.4`.

Until applied, the code half (last-hop `getClientIp`) closes the spoof hole only in a single-Nginx-no-CDN topology (plan's `[SEC-04/nginx|flagged-assumption]`); the VPS step closes it regardless of upstream topology. This is the plan's `user_setup: nginx-vps` frontmatter item, relocated here from 01-VALIDATION.md's manual-verification register.

## Authentication Gates

None — no auth-bound operations in this plan.

## Known Stubs

None — every public-input abuse vector named in the plan has a wired implementation + a verifying test. No `TODO`/`FIXME`/`''`-placeholder/`null`-default shapes were introduced; `SEARCH_KEYWORD_MAX_LENGTH` (the only new tunable constant) is wired at its sole consumer (the articles route over-length guard).

## Threat Flags

None — no new network endpoints, auth paths, file-access patterns, or schema changes at trust boundaries. The two mitigated threats (T-1-16 XFF spoof, T-1-17 ReDoS) are surfaced here as closures, not new surfaces. The new `escapeRegExp` import on `src/lib/blacklist.ts` and `src/lib/homepage-articles.ts` does not cross a trust boundary those files did not already cross.

## Next Phase Readiness

- **Phase 1 complete — all 7 plans done.** SEC-01 through SEC-04, AUTH-01, AFF-01, and AFF-03 all closed at the code level. Full suite: **17 test files / 189 tests pass** (up from 13/130 at the close of 01-04, +1.5 plans of test surface); `npx tsc --noEmit` exit 0.
- **Outstanding human-judgment items** (deferred to verify-work / ops, all documented across the 7 SUMMARYs):
  - **VPS Nginx XFF overwrite directive** (this plan's D10 — the only human-judgment entry on plan 07).
  - **VPS threshold tuning** for the plan 05 limiter (subscribe 5/60s, click/redirect 60/60s flood cap, 60s dedupe — coverage D8 in 01-05-SUMMARY.md).
  - **Atlas credential rotation** (standing blocker — third-party cluster ownership; recorded in PROJECT.md).
  - **VPS smoke for reset-admin CLI** (01-02 Task 2 — runs against real production user collection).
- **For verify-work:** the auto-verified deliverables (D1-D9, code-level) all carry `human_judgment: false` with an all-`pass` verification chain — the only human-judgment deliverable for plan 07 is D10 (VPS Nginx step). The Phase 1 acceptance contract is "code-level green + the standing manual items on the verify-work backlog".

---
*Phase: 01-security-remediation*
*Completed: 2026-09-14*

## Self-Check: PASSED
- Files exist: 8/8 modified+created source/test/docs files + `01-07-SUMMARY.md` all present on disk
- Commits verified: `c1caf1e` (Task 1: last-hop getClientIp + client-ip matrix + Nginx XFF overwrite), `38d9bde` (Task 2: escapeRegExp relocation + ReDoS hardening at both RegExp sites)
- Full suite at close: 17 files / 189 tests passing; `npx tsc --noEmit` exit 0
- MEASURED commits via `git rev-list --count ec09da7..HEAD = 2` — matches the plan's estimate of 2 tasks
- Rate-limit suite invariant: 14/14 rate-limit tests pass unchanged under the last-hop parse flip (order-invariant isolation honored, the 01-05 contract held)
