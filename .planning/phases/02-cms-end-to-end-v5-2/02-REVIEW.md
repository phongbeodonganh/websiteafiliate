---
phase: 02-cms-end-to-end-v5-2
reviewed: 2026-09-21T09:10:00Z
depth: standard
files_reviewed: 53
files_reviewed_list:
  - scripts/seed-taxonomy.ts
  - src/app/admin/page.tsx
  - src/app/api/v1/auth/logout/route.ts
  - src/app/api/v1/auth/me/route.ts
  - src/app/api/v1/cms/affiliate-links/[id]/route.ts
  - src/app/api/v1/cms/affiliate-links/route.ts
  - src/app/api/v1/cms/ai/generate-article/route.ts
  - src/app/api/v1/cms/ai/generate-takeaways/route.ts
  - src/app/api/v1/cms/articles/[id]/route.ts
  - src/app/api/v1/cms/articles/route.ts
  - src/app/api/v1/cms/blacklist/check/route.ts
  - src/app/api/v1/cms/blacklist/import-sheet-url/route.ts
  - src/app/api/v1/cms/blacklist/import/route.ts
  - src/app/api/v1/cms/blacklist/quick-blacklist/route.ts
  - src/app/api/v1/cms/blacklist/re-sweep/route.ts
  - src/app/api/v1/cms/blacklist/route.ts
  - src/app/api/v1/cms/categories/[id]/route.ts
  - src/app/api/v1/cms/categories/route.ts
  - src/app/api/v1/cms/click-logs/route.ts
  - src/app/api/v1/cms/dashboard/route.ts
  - src/app/api/v1/cms/insider/send-now/route.ts
  - src/app/api/v1/cms/insights/route.ts
  - src/app/api/v1/cms/settings/route.ts
  - src/app/api/v1/cms/sub-categories/[id]/route.ts
  - src/app/api/v1/cms/sub-categories/route.ts
  - src/app/api/v1/cms/subscribers/[id]/route.ts
  - src/app/api/v1/cms/subscribers/route.ts
  - src/app/api/v1/cms/upload/route.ts
  - src/app/api/v1/cms/users/[id]/route.ts
  - src/app/api/v1/cms/users/route.ts
  - src/app/article/[slug]/page.tsx
  - src/lib/auth.ts
  - src/lib/blacklist.ts
  - src/lib/cms-fetch.ts
  - src/lib/faq-jsonld.ts
  - src/lib/placement-order.ts
  - src/lib/schedule-after-response.ts
  - src/lib/seed-taxonomy.ts
  - tests/api/admin-route-absence.test.ts
  - tests/api/articles-edit-roundtrip.test.ts
  - tests/api/articles-list-scoping.test.ts
  - tests/api/blacklist-import-async.test.ts
  - tests/api/categories-taxonomy.test.ts
  - tests/api/cms-auth-401.test.ts
  - tests/api/cms-auth-inactive.test.ts
  - tests/api/cms-rbac-affiliate-403.test.ts
  - tests/api/cms-users-update.test.ts
  - tests/api/insider-admin.test.ts
  - tests/lib/blacklist-sweep.test.ts
  - tests/lib/cms-fetch.test.ts
  - tests/lib/faq-jsonld.test.ts
  - tests/lib/placement-order.test.ts
  - tests/lib/seed-taxonomy.test.ts
findings:
  critical: 4
  warning: 9
  info: 8
  total: 21
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-09-21T09:10:00Z
**Depth:** standard
**Files Reviewed:** 53
**Status:** issues_found

## Summary

The substantive new/rewritten modules are mostly sound: `cms-fetch.ts`, `faq-jsonld.ts`, `placement-order.ts`, `schedule-after-response.ts`, `seed-taxonomy.ts`, and the blacklist sweep/restore helpers in `blacklist.ts` are clean, well-tested, and boundary-safe as documented. The `await getAuthUser(req)` call-site swap across the route files is mechanical and complete (the source-contract test in `cms-auth-inactive.test.ts` pins it).

However, the review found four correctness/security defects that must be fixed before this phase ships. Two are directly introduced by the phase: the affiliate-link blacklist pre-check now silently fails open because `handleCheckAffUrl` still calls the now-authenticated `blacklist/check` route without a bearer token, and the new D-14 edit-user modal is physically nested inside `BlacklistView`, so the Users-tab "Edit" button opens nothing. Two are pre-existing defects inside reviewed files that the phase's own goals (global blacklist enforcement, category hierarchy) depend on: `POST /cms/blacklist` has no role guard, so a non-admin can blacklist a domain and mass-deactivate every matching campaign, and the sub-category form coerces a 24-hex ObjectId with `Number()`, producing `NaN`/`null` and breaking sub-category create/update from the UI.

## Critical Issues

### CR-01: Affiliate-link blacklist pre-check silently fails open (token never sent)

**File:** `src/app/admin/page.tsx:517-544` (call site `:524-528`)

**Issue:** `handleCheckAffUrl` performs its POST with only `Content-Type`:

```ts
const res = await fetch('/api/v1/cms/blacklist/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: urlStr }),
});
```

Before this phase, `blacklist/check` had no auth guard, so the request succeeded and the returned `isBlacklisted` drove the red interceptor banner. Plan 02-01 swapped the route to `await getAuthUser(req)` (`src/app/api/v1/cms/blacklist/check/route.ts:6-9`), so the token-less call now always returns `401 { status: 'error' }`. The client's `if (data.status === 'success' && data.data?.isBlacklisted)` is therefore never true, the `else` branch runs, and `setAffUrlBlacklistError(null)` **clears** the warning. The admin can then submit a known-blacklisted base URL. The server-side `POST /api/v1/cms/affiliate-links` route does not blacklist-check (only `ai/generate-article` does), so the link is persisted. The real-time interceptor feature is silently disabled — a security regression, not merely a UI glitch.

**Fix:** Route the check through the shared helper (which attaches the token) and surface a failure that does not look like "safe":

```ts
const result = await cmsFetch<{ isBlacklisted: boolean; projectName?: string; matchedDomain?: string; reason?: string; blockedCountries?: string[] }>(
  '/api/v1/cms/blacklist/check',
  { method: 'POST', body: { url: urlStr }, token: localStorage.getItem('token') }
);
if (!result.ok) {
  // Fail closed: do not silently clear the warning on a 401/403/5xx.
  setAffUrlBlacklistError({ isError: true, matchedDomain: urlStr, projectName: '—', reason: 'Blacklist check unavailable. Retry before saving.' });
  return;
}
if (result.data?.isBlacklisted) { /* existing banner state */ } else { setAffUrlBlacklistError(null); }
```

### CR-02: D-14 edit-user modal is nested inside `BlacklistView`, so the Users-tab edit flow is dead

**File:** `src/app/admin/page.tsx:3241-3322` (modal), `:1614` (trigger in `UsersView`), `:2908-3326` (`BlacklistView`)

**Issue:** The new "Edit team member" modal JSX (`{showEditUserModal && editingUser && (...)}`) lives inside the JSX returned by `BlacklistView` (which spans `const BlacklistView = () => {` at line 2908 to its closing `};` at line 3326). But `openEditUserModal` is only invoked from a row button inside `UsersView` (line 1614). `renderContent` renders exactly one view (`renderContent` at 4229-4265: `if (activeTab === 'users' ...) return <UsersView />; if (activeTab === 'blacklist' ...) return <BlacklistView />;`), so when the admin is on the Users tab the modal's host component is not mounted. Clicking Edit sets `showEditUserModal = true` but no modal renders. The end-to-end D-14 feature added in commit `7baa09e` is unreachable from the UI. The API test (`cms-users-update.test.ts`) exercises the route directly and does not catch this.

**Fix:** Move the `{showEditUserModal && editingUser && (...)}` block out of `BlacklistView` into `UsersView` (or into the top-level `renderContent`/root return so it is rendered regardless of the active tab). Add a UI-level (or at minimum a source-contract) assertion that the modal markup is co-located with the `openEditUserModal` trigger.

### CR-03: `POST /api/v1/cms/blacklist` has no role guard — any authenticated user can blacklist domains and mass-deactivate campaigns

**File:** `src/app/api/v1/cms/blacklist/route.ts:37-42`

**Issue:** The POST handler gates on identity only:

```ts
const user = await getAuthUser(req);
if (!user) { return 401 }
```

Every sibling write in the same feature is admin-only (`DELETE` in this file at `:91-94`, `quick-blacklist`, `import`, `import-sheet-url`, `re-sweep`). POST is the most destructive of them: after creating the blacklist entry it calls `sweepRetroactiveBlacklist(domainToSave)`, which flips **every active affiliate campaign** on that domain to `blacklisted` globally. An `author` or `editor` account (lower-trust roles created through the CMS users UI) can therefore submit `{ websiteUrl: 'competitor.com', reason: 'x' }` and take down all matching campaigns site-wide. `tests/api/cms-auth-401.test.ts:176` pins only the *no-token* status (401) for this route, so the missing role check is not covered.

**Fix:** Match the sibling writes:

```ts
if (!user || user.role !== 'admin') {
  return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
}
```

(If the 401-on-missing-token contract must be preserved, split it: `if (!user) 401; if (user.role !== 'admin') 403;`.)

### CR-04: Sub-category parent id coerced with `Number()` — ObjectId becomes `NaN`/`null`, breaking create and update

**File:** `src/app/admin/page.tsx:1122-1132` (`categoryId: Number(subCatParentId)` at `:1126`)

**Issue:** `subCatParentId` holds a string Mongo ObjectId — set from the parent-category card (`setSubCatParentId(cat.id)` where `cat.id` is `_id.toString()`, e.g. `"507f1f77bcf86cd799439011"`, see categories GET `src/app/api/v1/cms/categories/route.ts:33`) or from the parent `<select>`'s `e.target.value`. `Number("507f1f77bcf86cd799439011")` is `NaN`; `JSON.stringify` serializes `NaN` as `null`. So:
- **Create** (`POST /cms/sub-categories`): the server's `if (!categoryId || !name || !slug)` returns `400 "CategoryId, name, and slug are required"`.
- **Edit** (`PUT /cms/sub-categories/:id`): `if (categoryId !== undefined) subCat.category_id = categoryId` assigns `null` to a required `ObjectId` ref, and `save()` throws → generic `500 "Lỗi cập nhật danh mục con"`.

The two-level taxonomy this phase seeds cannot be extended or re-parented from the admin UI.

**Fix:** Stop coercing; pass the ObjectId string through unchanged (the API accepts a string and Mongoose casts it):

```ts
const payload = {
  categoryId: subCatParentId ? String(subCatParentId) : undefined,
  name: subCatName,
  slug: subCatSlug || subCatName.toLowerCase().trim().replace(/\s+/g, '-'),
  ...
};
```

Add a route/API test that POSTs a sub-category with a real 24-hex `categoryId` and asserts `201` + persisted `category_id`.

## Warnings

### WR-01: `getAuthUser` returns token-baked role — a demoted admin keeps admin rights for up to 24h

**File:** `src/lib/auth.ts:58-80`

**Issue:** The D-15 guard re-reads the DB to reject `inactive`/deleted users, but then returns the *JWT payload* (`return payload`) rather than the freshly loaded `userDoc`. `role` and `username` therefore remain whatever was baked into the token at sign time. `PUT /api/v1/cms/users/:id` can demote an admin to `editor` (or lower), yet every route's `user.role !== 'admin'` check continues to pass for that principal until the 24h token expires. The same is true for `username` claims. This is an incomplete half of D-15 that should be closed now that a DB lookup already happens on every request.

**Fix:** Return the live DB values, e.g.

```ts
return {
  userId: userDoc._id.toString(),
  username: userDoc.username,
  role: userDoc.role,
};
```

(add a test that demotes an active admin in the DB and asserts the *next* request is rejected by an admin-only route).

### WR-02: Canonical placement sort makes "Editor's Verdict" always consume the `top_cta` placement

**File:** `src/app/article/[slug]/page.tsx:99-113`

**Issue:** `placements` is now passed through `sortPlacementsByPosition(...)` and the code immediately does `const verdictPlacement = placements[0] || null;` with the comment "Separate first placement for Editor's Verdict (mid-article)". After canonical ordering, `placements[0]` is *always* the `top_cta` placement. The result is that the top-of-article CTA is never rendered as a top CTA (`remainingPlacements` excludes it) and instead surfaces mid-article inside `EditorVerdict`; conversely a `middle_comparison` placement can never be the verdict unless no `top_cta` exists. This silently changed the render semantics of the phase's own ordering change.

**Fix:** Select the verdict by the intended position rather than by array index, e.g. prefer an explicit `middle_comparison` for the verdict and keep `top_cta` at the top:

```ts
const verdictIdx = placements.findIndex((p) => p.positionLabel === 'middle_comparison');
const verdictPlacement = verdictIdx >= 0 ? placements[verdictIdx] : (placements[0] ?? null);
const remainingPlacements = placements.filter((_, i) => i !== (verdictIdx >= 0 ? verdictIdx : 0));
```

Confirm the intended mapping against the UI-SPEC before fixing.

### WR-03: Article view counter is a non-atomic read-modify-write on the render path

**File:** `src/app/article/[slug]/page.tsx:85-86`

**Issue:** `article.view_count += 1; await article.save();` loads the document, mutates it in JS, and writes the whole document back on every page render. Concurrent requests for the same slug read the same `view_count` and overwrite each other (lost increments), and the full-document `save()` can also clobber concurrent edits to other fields. The page also has `revalidate = 0`, so this fires on every request.

**Fix:** Use an atomic `$inc` and avoid the full save:

```ts
await ArticleModel.updateOne({ _id: article._id }, { $inc: { view_count: 1 } });
```

(and use the incremented value for display, or accept a one-render-stale count).

### WR-04: Raw `error.message` returned to clients on 500 paths

**File:** `src/app/api/v1/cms/blacklist/route.ts:32,84,108`; `src/app/api/v1/cms/blacklist/check/route.ts:34`; `src/app/api/v1/cms/blacklist/import/route.ts:72`; `src/app/api/v1/cms/blacklist/import-sheet-url/route.ts:141`; `src/app/api/v1/cms/blacklist/quick-blacklist/route.ts:65`; `src/app/api/v1/cms/ai/generate-article/route.ts:212`

**Issue:** These handlers return `error.message` verbatim in the JSON body, which can expose internal Mongoose cast/validation text, driver errors, or upstream provider error detail (Gemini/Jina) to the caller. Other routes in the same phase deliberately return a fixed message (e.g. `articles/route.ts` returns `'Failed to create article'`), so this is inconsistent as well as leaky.

**Fix:** Log server-side (`console.error` is already used in several of these) and return a fixed message, e.g. `{ status: 'error', message: 'Lỗi xử lý yêu cầu' }`.

### WR-05: `exact_url` blacklist match is a prefix match — over-blocks unrelated URLs

**File:** `src/lib/blacklist.ts:89-104` (specifically `:94`)

**Issue:** The `exact_url` branch treats a stored `website_url` as a prefix:

```ts
fullUrl.toLowerCase().startsWith(itemFullUrl)
```

Blacklisting `https://badsite.com/register` therefore also blocks `https://badsite.com/register-now` and `https://badsite.com/register/evil`. This contradicts the `'exact_url'` label surfaced in the admin UI ("Chặn Chính Xác URL Này") and can silently kill legitimate campaigns whose path merely shares a prefix.

**Fix:** Compare exact normalized URLs (strip the query/hash consistently and compare equality), or if prefix semantics are actually wanted, rename the mode and document it.

### WR-06: `PUT /cms/users/:id` performs no role/status validation and can orphan the last admin

**File:** `src/app/api/v1/cms/users/[id]/route.ts:31-34` (and `DELETE` at `:63-74`)

**Issue:** `role` and `status` are assigned straight from the request body with no enum check. A typo/unknown value hits the Mongoose enum and surfaces as a generic `500` instead of a `400`. More seriously, nothing prevents an admin from demoting or deactivating the only remaining active admin — including themselves — after which no account can administer the CMS. `DELETE` guards self-deletion but not last-admin deletion.

**Fix:** Validate `role ∈ {admin,editor,author}` and `status ∈ {active,inactive}` (return `400`), and refuse (or warn) when the change would leave zero active admins.

### WR-07: `POST /cms/sub-categories` does not validate `categoryId` as an ObjectId

**File:** `src/app/api/v1/cms/sub-categories/route.ts:41-49`

**Issue:** `categoryId` is only truthiness-checked. A non-ObjectId string reaches `SubCategoryModel.create({ category_id: categoryId, ... })`, Mongoose throws a CastError, and the `catch` returns `500 "Lỗi tạo danh mục con"` rather than a `400`. Combined with CR-04 this is how the UI currently fails.

**Fix:** Validate with `Types.ObjectId.isValid(String(categoryId))` and return `400` on failure (and confirm the parent category exists).

### WR-08: Upload validates only the client-supplied MIME type

**File:** `src/app/api/v1/cms/upload/route.ts:24-29`

**Issue:** `ALLOWED_TYPES.includes(file.type)` trusts the browser-provided `Content-Type`. The bytes are uploaded to R2 and later served with that same attacker-chosen content type (`storage.ts` passes `contentType` through). There is no magic-byte/content sniff. A CMS account (any role — the route only requires `user`) can upload arbitrary content mislabeled as an image. SVG is correctly excluded, but the sniff gap remains.

**Fix:** Sniff the file signature server-side before upload (e.g. `file-type`) and derive the stored `ContentType` from the detected type rather than the request, rejecting mismatches.

### WR-09: Blacklist helpers swallow all errors, so re-sweep can report success on failure

**File:** `src/lib/blacklist.ts:191-194` (`sweepDomains` catch), `:226-229` (`restoreSweep` catch)

**Issue:** Both functions `console.error` and return `{ swept: 0 }` / `{ restored: 0 }` on any failure. That is defensible for the post-response background path (D-05), but `sweepBlacklistAndRestore` is called synchronously by the admin `re-sweep` route, which then returns `{ status:'success', swept: 0, restored: 0 }`. A DB outage is thus reported to the admin as "Re-sweep complete. No campaigns needed changing." — a misleading success.

**Fix:** Let the synchronous callers surface failure: either have the sweep functions rethrow and let `re-sweep/route.ts` catch and return `500`, or add a distinct error/`failed` indicator to the result so the route/UI can distinguish "nothing to do" from "the operation failed".

## Info

### IN-01: Unused lucide-react imports in the admin shell

**File:** `src/app/admin/page.tsx:15,21,29,32,38,39` (`User`, `BarChart3`, `ImageIcon`, `Share2`, `Code`, `Type`)

**Issue:** These six icons are imported but never referenced in JSX (verified by a case-sensitive JSX search). They were carried in when the file was consolidated.
**Fix:** Remove the unused imports.

### IN-02: Dead `handleBatchImportGoogleSheet` references a superseded sync-sweep contract

**File:** `src/app/admin/page.tsx:679-720`

**Issue:** `handleBatchImportGoogleSheet` is defined but never called (only the `import-sheet-url` flow is wired up). It posts to the legacy `/cms/blacklist/import` route and alerts `data.data.totalSweptCampaigns`, which is the synchronous-sweep shape this phase explicitly moved away from (D-05 eventual copy). Dead code plus a stale contract in one function.
**Fix:** Delete the function, or migrate it to the `cmsFetch` + eventual-copy pattern if it is still needed.

### IN-03: `useSearchParams` without a `Suspense` boundary

**File:** `src/app/admin/page.tsx:4,389`

**Issue:** Next 16 requires a `Suspense` boundary around a `useSearchParams` call for statically-prerendered routes (build error "Missing Suspense boundary with useSearchParams"). This route is currently saved because `src/app/layout.tsx:102` calls `await headers()`, which forces dynamic rendering for the whole tree. The safety is incidental, not explicit, and would break if that layout ever stopped reading a dynamic API.
**Fix:** Add `export const dynamic = 'force-dynamic'` to the admin page (explicit intent), or wrap the search-params consumer in `<Suspense>`.

### IN-04: `restoreSweep` `.filter(Boolean)` on matcher functions is a no-op

**File:** `src/lib/blacklist.ts:210-212`

**Issue:** `buildDomainMatcher` always returns a function (even for empty input it returns a predicate that is always false), so `.filter(Boolean)` never removes anything. A blacklist entry with an empty domain produces a matcher that silently never matches instead of being skipped.
**Fix:** Filter the *inputs* before mapping (`activeBlacklists.filter((e) => e.extracted_domain || e.website_url).map(...)`).

### IN-05: `scripts/seed-taxonomy.ts` connection close is unreachable

**File:** `scripts/seed-taxonomy.ts:14-20`

**Issue:** `.then(() => process.exit(0))` terminates the process synchronously, so the `.finally(() => mongoose.connection.close())` never executes (same for the `process.exit(1)` in the catch). Harmless because the process is exiting, but the explicit close is dead and the pattern can truncate buffered output on some platforms.
**Fix:** Drop the `process.exit` calls and let the `.finally` close the connection, setting `process.exitCode` instead.

### IN-06: Duplicate `connectToDatabase()` calls in the sweep composite

**File:** `src/lib/blacklist.ts:237,246,247`

**Issue:** `sweepBlacklistAndRestore` connects, then calls `sweepDomains` and `restoreSweep`, each of which connects again (and each of which re-reads `BlacklistModel`). Redundant round-trips; not a correctness bug because `connectToDatabase` should be idempotent.
**Fix:** Accept pre-loaded domains/matchers in the helpers, or drop the outer connect.

### IN-07: `/api/v1/auth/me` returns the token payload lacking `name`/`avatar`

**File:** `src/app/api/v1/auth/me/route.ts:13-16`, consumed at `src/app/admin/page.tsx:474`

**Issue:** The response `data` is the `AuthPayload` (`userId`, `username`, `role`). The admin shell reads `currentUser.name` and `currentUser.avatar` (e.g. lines 4326, 4329, 2655), which are always `undefined`; the UI silently falls back to `username` / first letter. Not a crash, but the "By {author}" preview and sidebar identity lose the display name. The DB lookup already performed in `getAuthUser` could supply these.
**Fix:** Include `name`/`avatar` (and `status`) in the `me` response, or stop reading those fields client-side.

### IN-08: Encoding corruption in a test title

**File:** `tests/api/blacklist-import-async.test.ts:110`

**Issue:** The `describe` title contains a U+FFFD replacement character (`... re-sweep � admin-only ...`), indicating a non-UTF-8 byte survived into the committed source.
**Fix:** Replace the stray byte with an em-dash or ASCII hyphen.

---

_Reviewed: 2026-09-21T09:10:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
