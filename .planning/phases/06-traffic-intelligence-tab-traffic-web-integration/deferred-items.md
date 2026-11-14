# Deferred Items — Phase 06

Out-of-scope discoveries logged during 06-01 execution (not fixed per scope-boundary rule).

| # | Discovered during | Item | Why deferred |
|---|-------------------|------|--------------|
| 1 | Task 3/4 verification | C: drive has 0 bytes free on the dev machine. mongod (mongodb-memory-server) fails with `fassert()` because WiredTiger cannot preallocate journal files on %TEMP%. Workaround used: `TEMP`/`TMP` redirected to `D:\affiliate\websiteafiliate\.tmp-mongoms` for test runs. Machine-level cleanup is the real fix. | Environment issue, not repo code; deleting user data is out of an executor's scope. |
| 2 | Plan-level verification | `npm run lint` fails at repo baseline with 128 pre-existing errors / 84 warnings in files untouched by this plan (tests/browser, admin page, older tests). Scoped eslint over every file this plan created/modified: 0 errors. | Pre-existing failures in unrelated files — out of scope. |
| 3 | Plan-level verification | Plan `<verification>` step 4 (manual smoke: dev server + real TABAPI_KEY → POST /domains returns populated report) was not run — requires a live TabAPI credential not present in this environment. All equivalent automated paths are pinned by cms-traffic-domains.test.ts with a stubbed fetch. | Cannot be automated without a real upstream key; deferred to the user's first manual run of Plan 02. |
