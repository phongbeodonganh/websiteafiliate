# Phase 2: CMS End-to-End (V5.2) - Pattern Map (Gap Closure)

**Mapped:** 2026-09-22
**Mode:** `--gaps` — phase executed plans 02-01..02-06; VERIFICATION.md 5/10 with CR-01..CR-04 blockers + WR-02 partial
**Files analyzed:** 10 (6 source fixes + 4 regression test files)
**Analogs found:** 10 / 10

> This map exists for the gap-closure planner. Every excerpt below is from a
> **git-tracked** source file (verified with `git ls-files`). The planner should
> reference the analog + line numbers directly in each plan action.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/admin/page.tsx` (CR-01, CR-02, CR-04, WR-02) | component (client shell) | request-response | self — existing handlers `handleImportGoogleSheetUrl`, `handleEditUser`, `UsersView` modal | self-pattern |
| `src/app/api/v1/cms/blacklist/route.ts` (CR-03) | route handler | CRUD | same-file `DELETE` guard; `affiliate-links/route.ts` POST | exact |
| `src/app/api/v1/cms/sub-categories/route.ts` (WR-07) | route handler | CRUD | `blacklist/re-sweep/route.ts`; self POST guard | role-match |
| `src/app/api/v1/cms/sub-categories/[id]/route.ts` (WR-07) | route handler | CRUD | `articles/[id]/route.ts` (ObjectId pre-check) | role-match |
| `src/app/article/[slug]/page.tsx` (WR-02) | RSC page | transform/render | self — existing placements split | self-pattern |
| `tests/api/blacklist-post-rbac.test.ts` (NEW, CR-03) | test | request-response | `tests/api/cms-rbac-affiliate-403.test.ts` | exact |
| `tests/api/sub-categories-objectid.test.ts` (NEW, CR-04/WR-07) | test | CRUD | `tests/api/cms-users-update.test.ts` | exact |
| `tests/api/admin-edit-user-modal.test.ts` (NEW, CR-02 source-contract) | test | source-contract | `tests/api/cms-rbac-affiliate-403.test.ts` D-13 block | exact |
| `tests/api/admin-blacklist-check-token.test.ts` (NEW, CR-01 source-contract) | test | source-contract | `tests/api/cms-auth-inactive.test.ts` source walk | exact |
| `tests/lib/placement-verdict-order.test.ts` (NEW, WR-02) | test | unit | `tests/lib/placement-order.test.ts` | exact |

---

## Pattern Assignments

### `src/app/admin/page.tsx` — CR-01: blacklist pre-check must send bearer + fail closed

**Analog:** self — the already-correct D-03 call sites in the same file.

**The bug** (`page.tsx:517-544`) — raw `fetch` with no `Authorization` header; the `catch`/`else` both call `setAffUrlBlacklistError(null)`, silently clearing the warning on the route's now-required 401:

```ts
const res = await fetch('/api/v1/cms/blacklist/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },   // ← no bearer
  body: JSON.stringify({ url: urlStr }),
});
```

**Canonical in-file analog — import handler** (`page.tsx:615-645`, `[VERIFIED]`). Copy this shape: `cmsFetch<T>` with `token`, then `if (!result.ok) { handleCmsFailure(...); return; }`:

```ts
const token = localStorage.getItem('token');
const result = await cmsFetch<{ totalImported: number; csvExportUrl: string }>(
  '/api/v1/cms/blacklist/import-sheet-url',
  { method: 'POST', body: { sheetUrl: importSheetUrl }, token }
);
if (!result.ok) {
  handleCmsFailure(result.status, result.message);
  return;
}
```

**Canonical error/toast helpers** (`page.tsx:286-315`, `[VERIFIED]`):

```ts
const showCmsToast = (type: 'success' | 'error', text: string, options: { showSignIn?: boolean } = {}) => { /* ... */ };
const handleCmsFailure = (status: number, message?: string) => {
  if (status === 401) {
    try { localStorage.removeItem('token'); } catch { /* ignore */ }
    showCmsToast('error', errorMessageForResponse(401), { showSignIn: true });
    return;
  }
  showCmsToast('error', errorMessageForResponse(status, message));
};
```

**Shape to apply** (from REVIEW.md CR-01 fix, lines 101-112): call `cmsFetch<{ isBlacklisted: boolean; projectName?: string; matchedDomain?: string; reason?: string; blockedCountries?: string[] }>('/api/v1/cms/blacklist/check', { method: 'POST', body: { url: urlStr }, token })`; on `!result.ok` **fail closed** by keeping a visible banner rather than `setAffUrlBlacklistError(null)`. Only clear when `result.ok && !result.data?.isBlacklisted`.

**Helper contract** (`src/lib/cms-fetch.ts:9-11, 68-119`, `[VERIFIED]`): `CmsFetchResult<T>` is a discriminated union `{ ok: true; status; data } | { ok: false; status; message }`; it never throws on HTTP error and maps 401→session copy.

---

### `src/app/admin/page.tsx` — CR-02: move edit-user modal into `UsersView`

**Analog:** self — the **Add Team Member** modal, which is correctly co-located inside `UsersView`.

**The bug** (`[VERIFIED]` by grep): `openEditUserModal` trigger is at `page.tsx:1614` inside `UsersView` (starts `:1545`); the modal JSX `{showEditUserModal && editingUser && (...)}` is at `page.tsx:3241-3322` inside `BlacklistView` (starts `:2908`, ends `:3326`). `renderContent` (`page.tsx:4229-4241`, `[VERIFIED]`) returns exactly one view: `if (activeTab === 'users' && ...) return <UsersView />; if (activeTab === 'blacklist' && ...) return <BlacklistView />;`.

**Correct co-location analog — the Add-user modal inside `UsersView`** (`page.tsx:1628-1639`, `[VERIFIED]`):

```tsx
const UsersView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* table with Edit buttons at :1613-1620 -> openEditUserModal(u) */}
    {showAddUserModal && (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
          ...
        </div>
      </div>
    )}
  </div>
);
```

**Fix:** move the exact `{showEditUserModal && editingUser && (...)}` block (`page.tsx:3241-3322`) out of `BlacklistView` and place it inside `UsersView`'s returned JSX, right after the `{showAddUserModal && (...)}` block (the `UsersView` return ends at `:1626`'s `</div>` around the table, before the modal). The handlers `openEditUserModal` (`:871-878`), `handleEditUser` (`:883-912`), and state (`:326-327`) already exist and need no change. **Do not** relocate into `renderContent` — keeping it in `UsersView` matches the established Add-user modal pattern.

**Do not touch** the `buildAdminUrl`/`navigate`/restore-`useEffect` URL-state contract (RESEARCH Pitfall 7).

---

### `src/app/admin/page.tsx` — CR-04: stop coercing the sub-category parent ObjectId

**Analog:** self — every other ObjectId-string pass-through in the file (`categoryId: categoryId || undefined` at `page.tsx:2103`, `[VERIFIED]`).

**The bug** (`page.tsx:1122-1132`, `[VERIFIED]`): `categoryId: Number(subCatParentId)`; `Number('507f1f77bcf86cd799439011') === NaN`, `JSON.stringify` → `null`.

**Canonical string pass-through analog** (`page.tsx:2103`):

```ts
categoryId: categoryId || undefined,
subCategoryId: subCategoryId || undefined,
```

**Fix shape** (REVIEW.md CR-04 fix, lines 157-164): keep the payload otherwise identical but replace only the coercion:

```ts
const payload = {
  categoryId: subCatParentId ? String(subCatParentId) : undefined,
  name: subCatName,
  slug: subCatSlug || subCatName.toLowerCase().trim().replace(/\s+/g, '-'),  // preserve existing ternary form
  description: subCatDesc,
  metaTitle: subCatMetaTitle,
  metaDescription: subCatMetaDesc,
};
```

Leave the rest of `handleSaveSubCategory` (`:1133-1160`: PUT when `editingSubCategoryObj?.id`, else POST; `alert`s; `loadAllData()`) as-is — only the one line changes.

---

### `src/app/api/v1/cms/blacklist/route.ts` — CR-03: add the combined sibling guard to `POST`

**Analog:** same-file `DELETE` (`route.ts:90-94`, `[VERIFIED]`) — the canonical sibling-blacklist-write contract.

**Current vulnerable POST** (`route.ts:37-42`):

```ts
const user = await getAuthUser(req);
if (!user) {
  return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
}
```

**Sibling DELETE guard** (`route.ts:91-94`, `[VERIFIED]`):

```ts
const user = await getAuthUser(req);
if (!user || user.role !== 'admin') {
  return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
}
```

**Cross-file sibling analog** — `affiliate-links/route.ts:48-54` (`[VERIFIED]`) uses the same combined guard but returns **403** with a role message.

**Critical contract note:** `tests/api/cms-auth-401.test.ts:176` pins `POST /cms/blacklist` `expectedNoAuthStatus: 401`. Both sibling forms (`{!user||role!=='admin'}` → 401, or split `if(!user)401; if(role!=='admin')403`) keep the no-token path at 401 and satisfy the inventory gate. **Choose the same-file DELETE form** (`route.ts:91-94`) for consistency with the rest of the blacklist feature — 401 on both, no test churn. Optionally also fix WR-04 (`error.message` leaks at `route.ts:32,84,108`) in the same edit using the fixed-message pattern from `articles/route.ts` (`'Failed to create article'`).

---

### `src/app/api/v1/cms/sub-categories/route.ts` — WR-07: validate `categoryId` as an ObjectId (400)

**Analog:** the combined admin guard already at `route.ts:32-35` (`[VERIFIED]`); pair the new validation with the existing 400 branch at `:41-43`.

**Current** (`route.ts:38-43`):

```ts
const { categoryId, name, slug, description, metaTitle, metaDescription } = body;
if (!categoryId || !name || !slug) {
  return NextResponse.json({ status: 'error', message: 'CategoryId, name, and slug are required' }, { status: 400 });
}
```

**ObjectId-validation pattern analog** — `src/lib/auth.ts:58-81` uses `Types.ObjectId.isValid(String(userId))` before `findById` (the "fail closed with the normal reject status, never a 500" discipline pinned by `tests/api/cms-auth-inactive.test.ts:96-109`). Import `Types` from `mongoose` and add:

```ts
import { Types } from 'mongoose';
// ...
if (!categoryId || !name || !slug) { /* existing 400 */ }
if (!Types.ObjectId.isValid(String(categoryId))) {
  return NextResponse.json({ status: 'error', message: 'CategoryId không hợp lệ' }, { status: 400 });
}
```

Optionally confirm the parent exists (`CategoryModel.findById(categoryId)`) per REVIEW.md WR-07; if so, follow the 404 shape from `sub-categories/[id]/route.ts:21-23`.

---

### `src/app/api/v1/cms/sub-categories/[id]/route.ts` — WR-07: validate `categoryId` before assigning to `category_id`

**Analog:** the existing `findById` + 404 branch in the same file (`route.ts:19-23`, `[VERIFIED]`).

**Current** (`route.ts:25`):

```ts
if (categoryId !== undefined) subCat.category_id = categoryId;   // null/non-ObjectId -> save() throws 500
```

**Fix:** mirror the POST fix — before the assignment, guard:

```ts
if (categoryId !== undefined) {
  if (!Types.ObjectId.isValid(String(categoryId))) {
    return NextResponse.json({ status: 'error', message: 'CategoryId không hợp lệ' }, { status: 400 });
  }
  subCat.category_id = categoryId;
}
```

Add `import { Types } from 'mongoose';`. The 404 pattern to copy is verbatim in this same file at `:21-23`. This turns the former generic 500 (`'Lỗi cập nhật danh mục con'`, `:48`) into a proper 400.

---

### `src/app/article/[slug]/page.tsx` — WR-02: select verdict by position, not by index

**Analog:** self — the existing `sortPlacementsByPosition` wiring and the `EditorVerdict`/`AffiliateCtaBlock` consumers in the same file.

**The bug** (`page.tsx:99-113`, `[VERIFIED]`):

```ts
const placements = sortPlacementsByPosition(/* ...mapped... */);
// Separate first placement for Editor's Verdict (mid-article)
const verdictPlacement = placements[0] || null;   // always top_cta after canonical sort
const remainingPlacements = placements.slice(1);
```

**Consumers** (`page.tsx:269-283` render `verdictPlacement` via `EditorVerdict` and `remainingPlacements` via `AffiliateCtaBlock`; `:342-345` duplicates the verdict in a mobile/sticky block) — both read the two variables above, so only the selection lines change.

**Fix shape** (REVIEW.md WR-02 fix, lines 197-199):

```ts
const verdictIdx = placements.findIndex((p) => p.positionLabel === 'middle_comparison');
const verdictPlacement = verdictIdx >= 0 ? placements[verdictIdx] : placements[0] ?? null;
const remainingPlacements = placements.filter((_, i) => i !== (verdictIdx >= 0 ? verdictIdx : 0));
```

**Canonical label constants** (`src/lib/placement-order.ts:5`, `[VERIFIED]`): `ORDERED_POSITION_LABELS = ['top_cta', 'middle_comparison', 'footer_banner']`. Prefer importing/using these labels over a bare `'middle_comparison'` literal. **Confirm against UI-SPEC** which position is the intended verdict (REVIEW.md says "confirm intended mapping"); the natural reading of top/middle/footer is `middle_comparison` = verdict, `top_cta` stays at top.

---

### `tests/api/blacklist-post-rbac.test.ts` (NEW) — CR-03 regression

**Analog:** `tests/api/cms-rbac-affiliate-403.test.ts` (`[VERIFIED]`, tracked).

**Copy the structure:** `seedScenario()` creates real `UserModel` docs (admin/editor/author, all `status:'active'`), signs tokens with `signToken({ userId, username, role })`, builds `new Request(url, { method, headers: { 'Content-Type': 'application/json', Authorization: Bearer } , body })`, imports the handler directly, asserts `res.status`, then asserts the **DB side-effect did not happen**. For blacklist: seed an `AffiliateLinkModel` active campaign on `badsite.com`, have an editor POST `{ websiteUrl:'https://badsite.com', reason:'x' }`, assert **401** (the sibling contract) and that the link is still `'active'` (proves the sweep never ran). Add the admin-success control (`200` + link flips `'blacklisted'`) so the gate is proven role-based, not blanket — exactly the two-describe structure at `cms-rbac-affiliate-403.test.ts:80-198`.

**Guard-status note:** `tests/api/cms-auth-401.test.ts:176` pins no-token POST → 401, so if the split guard is chosen (403 for non-admin), assert `401` for editor, `401` for no-token, `403` only if the split form is used. Match whatever the route actually implements; do not weaken the pre-existing gate.

---

### `tests/api/sub-categories-objectid.test.ts` (NEW) — CR-04 / WR-07 regression

**Analog:** `tests/api/cms-users-update.test.ts` (`[VERIFIED]`, tracked).

**Copy:** `seedScenario()` creating an admin `UserModel` + `signToken`, a `jsonRequest(token, body)` factory, a `params(id)` factory (`{ params: Promise.resolve({ id }) }`) for the `[id]` route. Then add two tests on the POST handler (`import { POST as subCatsPOST } from '@/app/api/v1/cms/sub-categories/route'`):

1. **Happy path (real 24-hex categoryId):** create a `CategoryModel`, POST `{ categoryId: category._id.toString(), name, slug }` → **201/200** and `SubCategoryModel` persisted with `category_id.toString() === category._id.toString()`.
2. **Invalid id (WR-07):** POST `{ categoryId: 'not-an-object-id', name, slug }` → **400** (never 500).

Mirror the `expect(...).not.toBe(500)` discipline from `cms-auth-inactive.test.ts:104,108`. See the category GET shape analog in `tests/api/categories-taxonomy.test.ts` (`[VERIFIED]`) for how a seeded admin token is built without a fixed username collision (`Date.now()`/`Math.random()` suffix).

---

### `tests/api/admin-edit-user-modal.test.ts` (NEW) — CR-02 source-contract

**Analog:** `tests/api/cms-rbac-affiliate-403.test.ts:209-238` (`[VERIFIED]`) — the D-13 source-contract describe block.

**Copy the exact technique:** read `src/app/admin/page.tsx` into a string with `readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8')`, then assert substring/position relationships. For CR-02, assert that the `{showEditUserModal && editingUser && (` marker appears **after** the `const UsersView = () => (` marker and **before** the `const BlacklistView = () => {` marker — i.e. the modal is co-located with its trigger's view. This is the "at minimum a source-contract assertion" CR-02's fix explicitly permits. Use the same `indexOf` ordering idiom as `cms-rbac-affiliate-403.test.ts:224-232`.

---

### `tests/api/admin-blacklist-check-token.test.ts` (NEW) — CR-01 source-contract

**Analog:** `tests/api/cms-auth-inactive.test.ts:189-219` (`[VERIFIED]`) — the awaited-guard source walk.

**Copy the technique:** `readFileSync` the admin page; locate `handleCheckAffUrl`; assert the body does **not** contain a bare `fetch('/api/v1/cms/blacklist/check'` and **does** contain `cmsFetch(` targeting that path (i.e. it goes through the bearer-attaching helper). Optionally assert the fail-closed branch does not unconditionally `setAffUrlBlacklistError(null)`. Keep it a source contract — the node-env suite has no jsdom (VERIFICATION.md human-verification #2).

---

### `tests/lib/placement-verdict-order.test.ts` (NEW) — WR-02 unit

**Analog:** `tests/lib/placement-order.test.ts` (`[VERIFIED]`, tracked).

**Extend the existing pure-function approach:** if the verdict selection is extracted into a small pure helper (recommended — e.g. `selectVerdictPlacement(placements)` added to `src/lib/placement-order.ts`), test it directly with the three-label fixtures already used at `placement-order.test.ts:29-41` and `:57-69` (top_cta + middle_comparison + footer_banner; only-footer; legacy `middle`). Assert: `top_cta` is never chosen as verdict when a `middle_comparison` exists; it is when none does; `remainingPlacements` excludes exactly the verdict and preserves canonical order. Extracting the selector keeps the RSC untestable part minimal and matches the repo's "pure builder + unit test" convention (`faq-jsonld.ts`, `placement-order.ts`).

---

## Shared Patterns

### Route auth / role guard (all modified routes)
**Source:** `src/app/api/v1/cms/blacklist/route.ts:91-94` (combined sibling write guard) and `:10-13` (plain read guard).
**Apply to:** `blacklist/route.ts` POST (CR-03); keep `sub-categories/*` guards unchanged.
```ts
const user = await getAuthUser(req);
if (!user || user.role !== 'admin') {
  return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
}
```
`getAuthUser` is async DB-backed (`src/lib/auth.ts:58-81`) and rejects inactive/missing/malformed users — never add a route-local guard (SEC-02 regression).

### ObjectId validation before persistence
**Source:** `src/lib/auth.ts:58-81` (`Types.ObjectId.isValid(String(userId))` → normal reject, never CastError→500).
**Apply to:** `sub-categories/route.ts` (POST) and `sub-categories/[id]/route.ts` (PUT).
```ts
import { Types } from 'mongoose';
if (!Types.ObjectId.isValid(String(categoryId))) {
  return NextResponse.json({ status: 'error', message: 'CategoryId không hợp lệ' }, { status: 400 });
}
```

### Error envelope + fixed 500 message
**Source:** `src/app/api/v1/cms/articles/route.ts` (`'Failed to create article'`), envelope `{ status:'error', message }`.
**Apply to:** blacklist routes when addressing WR-04 in the same edit.
```ts
} catch (error: any) {
  console.error('Blacklist POST error:', error);
  return NextResponse.json({ status: 'error', message: 'Lỗi xử lý yêu cầu' }, { status: 500 });
}
```

### Client CMS request (admin page)
**Source:** `src/lib/cms-fetch.ts:68-119`; call-site shape at `page.tsx:615-645` and `:2115-2138`.
**Apply to:** CR-01 `handleCheckAffUrl`, and any other raw `fetch` in the admin shell that targets an authenticated CMS route.
```ts
const token = localStorage.getItem('token');
const result = await cmsFetch<T>('/api/v1/cms/...', { method: 'POST', body: {...}, token });
if (!result.ok) { handleCmsFailure(result.status, result.message); return; }
```

### Source-contract test (UI co-location / token wiring)
**Source:** `tests/api/cms-rbac-affiliate-403.test.ts:209-238`; `tests/api/cms-auth-inactive.test.ts:189-219`.
**Apply to:** CR-01 and CR-02 regression tests.
```ts
const source = readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8');
expect(source.indexOf('...')).toBeGreaterThan(source.indexOf('...'));
```

### Test seed + direct handler invocation
**Source:** `tests/api/cms-rbac-affiliate-403.test.ts:25-72`; `cms-users-update.test.ts:18-58`.
**Apply to:** all new `tests/api/*` files.
- `connectToDatabase()` + real `UserModel.create({ ..., status:'active' })` per role.
- `signToken({ userId: user._id.toString(), username, role })` — the user **must exist** (D-15 guard).
- `new Request(url, { method, headers, body })`; call the imported handler directly.
- Dynamic routes: `params(id) => ({ params: Promise.resolve({ id }) })`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All gap-closure targets have a concrete tracked analog (in-file self-pattern, sibling route, or existing test). |

## Metadata

**Analog search scope:** `src/app/admin/`, `src/app/api/v1/cms/`, `src/app/article/`, `src/lib/`, `tests/api/`, `tests/lib/`
**Files scanned:** 25+
**Git-tracking:** every named analog path verified tracked via `git ls-files` (no `.gsd/` mirror paths emitted)
**Pattern extraction date:** 2026-09-22
