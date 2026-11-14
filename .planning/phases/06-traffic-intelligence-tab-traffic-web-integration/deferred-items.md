# Deferred Items — Phase 06

Out-of-scope discoveries logged during 06-01 execution (not fixed per scope-boundary rule).

| # | Discovered during | Item | Why deferred |
|---|-------------------|------|--------------|
| 1 | Task 3/4 verification | C: drive has 0 bytes free on the dev machine. mongod (mongodb-memory-server) fails with `fassert()` because WiredTiger cannot preallocate journal files on %TEMP%. Workaround used: `TEMP`/`TMP` redirected to `D:\affiliate\websiteafiliate\.tmp-mongoms` for test runs. Machine-level cleanup is the real fix. | Environment issue, not repo code; deleting user data is out of an executor's scope. |
| 2 | Plan-level verification | `npm run lint` fails at repo baseline with 128 pre-existing errors / 84 warnings in files untouched by this plan (tests/browser, admin page, older tests). Scoped eslint over every file this plan created/modified: 0 errors. | Pre-existing failures in unrelated files — out of scope. |
| 3 | Plan-level verification | Plan `<verification>` step 4 (manual smoke: dev server + real TABAPI_KEY → POST /domains returns populated report) was not run — requires a live TabAPI credential not present in this environment. All equivalent automated paths are pinned by cms-traffic-domains.test.ts with a stubbed fetch. | Cannot be automated without a real upstream key; deferred to the user's first manual run of Plan 02. |

## 06-02 additions (2026-11-14)

| # | Discovered during | Item | Why deferred |
|---|-------------------|------|--------------|
| 4 | Plan-level verification | Manual UAT of the Traffic tab (save keys -> add real domain -> open Chi tiết -> expand Whois/Trustpilot -> refresh -> delete) still requires a live admin session + TabAPI credential; carried over from 06-01 item 3. All UI behaviors are pinned by tests/components/admin-traffic-tab.test.tsx (45 tests, source-contract + pure-helper unit tests) and \
pm run build\ is green. | Cannot be automated in this environment (no live upstream credential); first manual run of the tab completes it. |
| 5 | Plan-level verification | Full \
pm run lint\ now reports 184 errors repo-wide (06-01 baseline was 128) - the growth comes from restored @playwright/test files (tests/browser, playwright.config.ts) becoming lintable after 06-01 Deviation 1, not from 06-02. page.tsx error/warning counts are byte-identical to the base commit (56/22) and all 11 new 06-02 files lint with 0 errors. | Pre-existing failures in files this plan did not author - out of scope. |
