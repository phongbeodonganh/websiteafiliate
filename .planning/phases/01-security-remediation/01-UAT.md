---
status: complete
phase: 01-security-remediation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md]
started: 2026-09-20T10:54:00Z
updated: 2026-09-20T11:03:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: —
name: [testing complete]
expected: |
awaiting: —

## Tests

### 1. Blacklist warning page (/blocked) visual quality
expected: Load a blacklisted affiliate link locally or on VPS. Browser 302s to /blocked?ref=<24-hex>. Page renders clean editorial layout (warning masthead, reason text, countries row omitted if empty). No third-party CDN scripts in DevTools Network. CSP header present in Response Headers.
result: skipped
reason: User cannot test at this time — no blacklist data available

### 2. Seed route deleted & regression gate active
expected: `npm run seed` returns "Missing script: seed" error. Visiting /api/v1/seed in browser returns 404 (route directory gone). Running `npm test` includes the security-regressions gate checking seed-dir-absence and destructive-delete scan — all pass.
result: pass

### 3. Admin password recovery CLI (reset-admin)
expected: Running `npx tsx scripts/reset-admin.ts` with NO args prints "Usage: tsx scripts/reset-admin.ts <username> <password>" and exits code 1 (no DB connection). On VPS with args, it upserts the admin and prints only username + user ID (password never echoed).
result: pass

### 4. Affiliate link scheme validation in admin UI
expected: In CMS admin, creating/editing an affiliate link with a normal https:// URL works fine. Pasting a javascript: or data: URL and saving shows a 400 error message ("base_url phải là URL http/https"). The invalid value is NOT stored.
result: pass

### 5. CMS auth — every route rejects unauthenticated requests
expected: Hitting ANY /api/v1/cms/* endpoint without a Bearer token returns 401 (or 403 for admin-only routes like affiliate-links POST). Hitting any CMS endpoint with a JWT signed using an old fallback secret (nexus_super_secret_jwt_key_2026 or affiliate_secret_key_v3_super_secure) is also rejected. After logout, the token is uniformly rejected across ALL CMS routes.
result: pass

### 6. Secrets purge — no secrets in source
expected: No Gemini API key literal (`AIza...`) anywhere in src/. No leaked Google Cloud project ID (354609). Build succeeds with zero secrets in environment. Settings GET masks the Gemini key (shows ••••••••<last4>). Settings PUT accepts/clears gemini_api_key.
result: pass

### 7. Rate limiting on public endpoints
expected: Subscribe endpoint: 6th request within 60s from same IP returns 429 with Retry-After header. Click/redirect: bursts of duplicate clicks from same IP+link don't inflate click_count (silent dedupe). No 429 to real users on click/redirect. Login failure-lockout still works independently.
result: pass

### 8. ReDoS protection on public search
expected: Searching with a crafted evil pattern like `(a+)+$x` against /api/v1/public/articles returns results instantly (no hang/server timeout). Keywords over 100 chars are gracefully ignored (search returns unfiltered results, no error).
result: pass

### 9. IP trust — XFF spoofing protection
expected: `getClientIp` reads the LAST X-Forwarded-For entry (not the first). A spoofed XFF header like `X-Forwarded-For: 1.2.3.4` from a client does NOT appear in ClickLog.ip_address — the real client IP is logged instead. On VPS: DEPLOY.md §8 Nginx overwrite directive applied to both port 80 and 443 blocks.
result: pass

### 10. Admin CSS color validation
expected: In CMS Settings, saving primary_color or accent_color with a valid hex (e.g. #1a73e8) works. Entering an invalid value (e.g. "red", "url(javascript:...)", "#zzz") is rejected with 400. The stored hex values render correctly in the sitewide theme. Historical invalid values fall back to site defaults (#111111 / #000000).
result: pass

## Auto-Passed Deliverables (31 items — covered by 189 passing tests)

### AFF-03 / SEC-03 (01-01: /blocked page)
- D1: Blacklisted click → 302 to /blocked with no-store (pass)
- D2: All blacklist strings rendered as inert React text (pass)
- D3: CSP via proxy matcher, no third-party origins (pass)
- D4: Full /blocked state matrix — 5 edge cases (pass)
- D6: English default block-reason fallback (pass)

### SEC-01 (01-02: Seed deletion)
- D1: Seed route + implementation + npm script all deleted (pass)
- D2: Regression gate — no unfiltered destructive delete on user/settings (pass)
- D3: CLI reset-admin usage/exit/no-echo contract (pass)
- D4: DEPLOY.md §13 reset-admin docs present (pass)

### AFF-01 (01-03: Scheme validation)
- D1: isHttpUrl strict WHATWG helper (pass)
- D2: POST rejects non-http(s) with 400, zero writes (pass)
- D3: Valid URLs stored verbatim (pass)
- D4: PUT rejects bad scheme, preserves stored doc (pass)
- D5: Idempotent PUT + required-field 400 preserved (pass)

### AUTH-01 (01-04: Canonical auth sweep) — full suite green
- D1-D6: All 25 CMS routes verify through getAuthUser, parameterized 401 gate (61 tests), fallback-secret rejection, logout uniformity, role matrix preserved (pass — 189/189 suite green)

### SEC-04 (01-05: Rate limiting)
- D1: Subscribe 5/60s + 429 + Retry-After + alias identical (pass)
- D2: Window expiry recovery (pass)
- D3: Login limiter non-interference (pass)
- D4: Click dedupe — single write on duplicates (pass)
- D5: Concurrent click safety — ≤1 increment (pass)
- D6: Redirect dedupe — ClickLog always created, $inc skipped (pass)
- D7: Blacklisted redirect + dedupe — ref anchor preserved (pass)
- D9: Full suite green — 145 tests at close (pass)

### SEC-02 / SEC-03 (01-06: Secrets + color validation)
- D1: gemini_api_key schema + masked GET (pass — suite green)
- D2: Secret-free src/ — no key literals, no project ID (pass — suite green)
- D3: D-08 regression gates active (pass — suite green)
- D4: isValidCssColor/sanitizeCssColor exports — 22 cases (pass)
- D5: Color validation at write + render boundary — 5 cases (pass)

### SEC-04 (01-07: IP trust + ReDoS)
- D1: getClientIp last-hop — spoofed first entry ignored (pass)
- D2: X-Real-IP fallback + 127.0.0.1 default preserved (pass)
- D3: Rate-limit suite order-invariant under parse flip (pass)
- D4: DEPLOY.md §8 Nginx XFF overwrite directive documented (pass)
- D5: escapeRegExp single shared source (pass)
- D6: Public articles search — evil pattern stays fast (pass)
- D7: 100-char cap — over-cap skips builder gracefully (pass)
- D8: Blacklist sweeper — escapeRegExp applied (pass)
- D9: Full suite green — 189 tests at close (pass)

## Summary

total: 10
passed: 9
issues: 0
pending: 0
skipped: 1

## Gaps

[none yet]
