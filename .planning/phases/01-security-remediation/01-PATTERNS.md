# Phase 1: Security Remediation - Pattern Map

**Mapped:** 2026-09-14
**Files analyzed:** 26 (8 new, 15 modified, 3 deleted)
**Analogs found:** 24 / 26 (2 gate-test files have no in-repo analog — sketched in RESEARCH.md)

**All analog paths below verified git-tracked via `git ls-files`** (no gitignored mirrors). All excerpts read from source this session.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/blocked/page.tsx` (NEW) | component (RSC page) | request-response + DB read | `src/app/insider/success/page.tsx` | exact (Promise searchParams + noindex metadata) |
| `scripts/reset-admin.ts` (NEW) | utility (CLI script) | CRUD (DB upsert) | `scripts/create-admin.ts` | exact |
| `tests/api/cms-auth-401.test.ts` (NEW) | test (integration) | request-response | `tests/api/tracking-redirect.test.ts` | exact (direct handler invocation) |
| `tests/api/security-regressions.test.ts` (NEW) | test (fs/grep gate) | file-I/O | — none in repo | **no analog** (shape sketched in RESEARCH.md §Code Examples) |
| `tests/api/rate-limit.test.ts` (NEW) | test (integration) | request-response | `tests/api/tracking-redirect.test.ts` + `tests/api/auth-login.test.ts` | role-match |
| `tests/lib/redos.test.ts` (NEW) | test (unit) | transform | `tests/lib/sanitize.test.ts` | role-match |
| `tests/lib/client-ip.test.ts` (NEW) | test (unit) | transform | `tests/lib/sanitize.test.ts` | role-match |
| `tests/api/affiliate-links-scheme.test.ts` (NEW) | test (integration) | request-response | `tests/api/tracking-redirect.test.ts` | role-match |
| `src/app/api/v1/cms/blacklist/{route,quick-blacklist,import,import-sheet-url}/route.ts` (MOD) | controller | request-response | `src/app/api/v1/cms/affiliate-links/route.ts` | exact (canonical-auth target shape) |
| `src/app/api/v1/cms/ai/generate-article/route.ts` (MOD) | controller | request-response | `src/app/api/v1/cms/affiliate-links/route.ts` | exact |
| `src/app/api/v1/cms/blacklist/check/route.ts` (MOD) | controller | request-response | `src/app/api/v1/cms/affiliate-links/route.ts` | exact |
| `src/app/api/v1/cms/affiliate-links/route.ts` (MOD) | controller | CRUD | self (`:46-107`) + `src/lib/seo.ts` | exact (self-analog) |
| `src/app/api/v1/cms/affiliate-links/[id]/route.ts` (MOD) | controller | CRUD | self (`:7-44`) + `src/lib/seo.ts` | exact (self-analog) |
| `src/app/api/v1/public/insider/route.ts` (MOD, + `/subscribe` alias) | controller | request-response | `src/app/api/v1/auth/login/route.ts` | exact (429 + Retry-After pattern) |
| `src/app/api/v1/public/tracking/click/route.ts` (MOD) | controller | event-driven write | `src/app/api/v1/auth/login/route.ts` + self | role-match |
| `src/app/api/v1/public/tracking/redirect/route.ts` (MOD) | controller | streaming (302 redirect) | self (`:98-104` healthy 302 branch) | exact (self-analog) |
| `src/lib/rateLimit.ts` (MOD) | utility | in-memory state | self + `src/lib/tokenBlacklist.ts` | exact |
| `src/lib/utils.ts` (MOD) | utility | transform | self (`:52-54` helper style) + `src/lib/homepage-articles.ts` | exact |
| `src/lib/gemini.ts` (MOD) | service (AI client) | request-response (external API) | `src/lib/auth.ts` (lazy-getter) | role-match |
| `src/lib/blacklist.ts` (MOD) | service | DB read + transform | `src/lib/homepage-articles.ts:43` | exact (usage shape) |
| `src/lib/homepage-articles.ts` (MOD) | service | DB read | self | exact (trivial import swap) |
| `src/lib/db/models.ts` (MOD) | model | schema | self (`:269-298` SettingSchema) | exact (self-analog) |
| `src/app/api/v1/public/articles/route.ts` (MOD) | controller | DB read | `src/lib/homepage-articles.ts:43` | exact (usage shape) |
| `package.json` (MOD) | config | — | self (`:12` seed script) | exact |
| `DEPLOY.md` (MOD) | docs | — | self (§8 Nginx template, admin CLI docs) | exact |
| `.github/workflows/deploy.yml` (MOD, optional) | config (CI) | — | self (`:21-22` npm test step) | exact |
| `src/app/api/v1/seed/route.ts`, `src/lib/db/seed-mongodb.ts`, `src/lib/db/seed.ts` (DELETE) | — | — | no analog needed | — |

---

## Pattern Assignments

### `src/app/api/v1/cms/blacklist/*` + `cms/ai/generate-article` (auth swap — 5 routes, same workstream)

**Analog (the fixed shape):** `src/app/api/v1/cms/affiliate-links/route.ts`

**Import to copy** (lines 5):
```typescript
import { getAuthUser } from '@/lib/auth';
```

**Canonical guard invocation + 401/403 shape** (lines 7-11, 46-53):
```typescript
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }
  // ...
export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }
```

**Block to DELETE from each of the 5 routes** — `src/app/api/v1/cms/blacklist/route.ts:5-23` (shape identical in `quick-blacklist/route.ts:8-22`, `import/route.ts:8-22`, `import-sheet-url/route.ts:8-22`; generate-article uses literal `'affiliate_secret_key_v3_super_secure'` at line 11 instead):
```typescript
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';

async function verifyAdminAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}
```
**Call-site migration:** each `const user = await verifyAdminAuth();` (blacklist/route.ts:28, 57, 109) becomes `const user = getAuthUser(req);` — NOT async. For `generate-article/route.ts:28`, the handler's `req: NextRequest` passes directly to `getAuthUser` (same `Request` interface). Preserve the existing role checks verbatim (generate-article:29 `admin|editor`; affiliate-links:48 `admin`).

**Canonical implementation being imported** — `src/lib/auth.ts:48-55` (do NOT modify this file):
```typescript
export function getAuthUser(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);   // checks logout blacklist FIRST (auth.ts:39)
}
```

---

### `src/app/api/v1/cms/blacklist/check/route.ts` (add missing auth — new finding)

**Analog:** `src/app/api/v1/cms/affiliate-links/route.ts:7-11` (GET, authed-read shape — this route is read-only so copy the 401 variant, not the 403 variant).

Insert at top of the existing POST (`check/route.ts:4-7`):
```typescript
// Current (line 4-5) — no auth:
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
// Becomes:
export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }
  try {
    const body = await req.json();
```

---

### `src/app/blocked/page.tsx` (NEW — RSC warning page)

**Primary analog:** `src/app/insider/success/page.tsx` — same shape: `searchParams` is a **Promise** (Next 16 contract), awaited in an async server component, noindex metadata.

**searchParams + noindex pattern** (insider/success/page.tsx:4-16):
```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insider confirmed',
  description: 'Your AIDEALSUK Insider email status.',
  robots: { index: false, follow: false },
};

type SuccessPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function InsiderSuccessPage({ searchParams }: SuccessPageProps) {
  const { status: rawStatus } = await searchParams;
  const status = typeof rawStatus === 'string' ? rawStatus : 'confirmed';
```

**DB-read-in-RSC + guard pattern** (`src/app/article/[slug]/page.tsx:68-81` — connectToDatabase + model reads + `notFound()` from `next/navigation`):
```typescript
import { notFound } from 'next/navigation';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  await connectToDatabase();
  // ... model reads ...
  if (!article) notFound();
```

**CSP arrives for free** — `src/proxy.ts:37-41` matcher `/((?!api|_next/static|_next/image|favicon.ico).*)` already covers every non-`/api` path. **Zero proxy changes.** Do NOT add any third-party script tag (the old page's `cdn.tailwindcss.com`, redirect/route.ts:61, is what CSP now blocks). Style with build-pipeline Tailwind classes like every other page (site theme via root layout).

**Ref validation** — reuse existing helper `src/lib/utils.ts:52-54`:
```typescript
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
```
(redirect route currently uses `mongoose.isValidObjectId` — redirect/route.ts:16 — either convention is acceptable; utils version avoids the mongoose import in the page.)

**Data resolution chain** (per RESEARCH.md /blocked flow): `ClickLogModel.findById(ref)` → `affiliate_link_id` → `AffiliateLinkModel.findById` → `link.status === 'blacklisted' || checkUrlAgainstBlacklist(link.base_url).isBlacklisted` → render `projectName`/`reason`/`blockedCountries` **as React text children only** (never `dangerouslySetInnerHTML` — React escaping is the XSS fix). Un-blacklisted since click → `redirect('/')` from `next/navigation`.

**Vietnamese warning copy to preserve (D-11)** — current inline page text, `src/app/api/v1/public/tracking/redirect/route.ts:60-87`: title `Cảnh Báo An Toàn | AI AFFILIATE HUB`, badge `Blacklist Interceptor Guard`, heading `Đã Chặn Liên Kết Rủi Ro`, body `Đường dẫn tới dự án {projectName} đã bị hệ thống AI AFFILIATE HUB vô hiệu hóa nhằm bảo vệ độc giả.`, fields `Lý do chặn:` / `Quốc gia cấm:`, CTA `← Quay Về Trang Chủ An Toàn`.

---

### `src/app/api/v1/public/tracking/redirect/route.ts` (redirect swap)

**Self-analog, healthy 302 branch** (lines 98-104 — copy this exact shape for the blacklisted branch):
```typescript
    const destinationUrl = appendSubId(
      affiliateLink.base_url,
      article?.slug || 'homepage',
    );
    const response = NextResponse.redirect(destinationUrl, 302);
    response.headers.set('Cache-Control', 'no-store');
    return response;
```
**Rules (RESEARCH.md Pitfall 4):** `NextResponse.redirect` requires an absolute URL — always `new URL('/blocked?ref=...', req.url)` — and defaults to 307; pass `302` explicitly. Note the fallback branch (lines 14, 17) returns 307 today; leave it or normalize to 302 consistently.

**ClickLog created BEFORE blacklist check (unchanged, D-10 foundation)** (lines 34-47):
```typescript
    await Promise.all([
      ClickLogModel.create({
        ...(article ? { article_id: article._id } : {}),
        affiliate_link_id: affiliateLink._id,
        ip_address: getClientIp(req),
      }),
      AffiliateLinkModel.findByIdAndUpdate(
        affiliateLink._id,
        { $inc: { click_count: 1 } },
        { new: true, strict: false }
      ),
    ]);

    const blacklistCheck = await checkUrlAgainstBlacklist(affiliateLink.base_url);
```
The blacklisted branch (lines 48-96: `projectName` at :52, `reason` at :49-51, `warningHtml` string :54-91, `new Response(warningHtml)` :93-95) is **deleted entirely** and replaced with:
```typescript
      return NextResponse.redirect(new URL(`/blocked?ref=${clickLog._id}`, req.url), 302);
```
(requires lifting the ClickLog create result out of the `Promise.all` — bind it to a variable instead of discarding).

---

### `src/app/api/v1/public/insider/route.ts` (+ `/subscribe` alias — hard 429 rate limit)

**Analog:** `src/app/api/v1/auth/login/route.ts` — the only route in the repo with limiter integration.

**Import + helper + pre-check shape** (login/route.ts:6-21):
```typescript
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/utils';

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { status: 'error', message: 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau ít phút.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

export async function POST(req: Request) {
  try {
    const rateLimitKey = `login:${getClientIp(req)}`;
    const preCheck = checkRateLimit(rateLimitKey);
    if (preCheck.limited) {
      return tooManyRequests(preCheck.retryAfterSeconds!);
    }
```
**Apply to insider POST:** first lines of `try` (insider/route.ts:19-20), key `subscribe:${getClientIp(req)}`, message adapted (e.g. `'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'`). The alias `src/app/api/v1/public/subscribe/route.ts` is `export { POST } from '../insider/route';` — one file, both paths covered. **Do NOT 429 click/redirect** (D-13) — see next.

---

### `src/app/api/v1/public/tracking/{click,redirect}/route.ts` (flood cap + dedupe — no 429)

**Analog:** same limiter integration shape as login (pre-check at top of handler), but over-limit → **skip the write, still return success/302**. Write-skip points: click/route.ts:40-51 (`Promise.all([ClickLogModel.create(...), AffiliateLinkModel.findByIdAndUpdate(... $inc click_count ...)])`) and redirect/route.ts:34-45 (same pair). On skip, click still returns the `{ status: 'success', redirect_url }` envelope (:53-56); redirect still 302s.

**Dedupe key** uses values already in scope: `"${getClientIp(req)}:${affiliateLinkId}"` — no new plumbing.

---

### `src/lib/rateLimit.ts` (add count-based limiter)

**Analog 1 — the module's own Map + interface + reset conventions** (rateLimit.ts:13-18, 53-55):
```typescript
const attempts = new Map<string, Entry>();

export interface RateLimitStatus {
  limited: boolean;
  retryAfterSeconds?: number;
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
```
**Analog 2 — lazy-prune-on-read** (`src/lib/tokenBlacklist.ts:17-24`):
```typescript
export function isBlacklisted(token: string): boolean {
  const expiresAt = blacklist.get(token);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    blacklist.delete(token); // tự hết hạn, không cần dọn tay
    return false;
  }
  return true;
}
```
**New function to add** (keep existing failure-lockout exports untouched — login route depends on them):
```typescript
export interface ConsumeResult { allowed: boolean; retryAfterSeconds?: number }
export function consumeRequest(key: string, limit: number, windowMs: number): ConsumeResult {
  // Map<string, { count: number; windowStart: number }>, reset-on-new-window,
  // prune entries older than windowMs on touch (tokenBlacklist pattern above)
}
```
Copy the module's comment style: the single-instance caveat comment (rateLimit.ts:11-12) and reference `ecosystem.config.js` `instances:1, fork` as prerequisite. **Include a `_resetForTests()` export** (RESEARCH.md Pitfall 3: module-level Map state leaks across tests in a file — `fileParallelism: false` shares the process; insider-lifecycle suite hits subscribe repeatedly from `127.0.0.1`).

---

### `src/lib/utils.ts` (getClientIp last-hop + escapeRegExp relocation)

**Current spoofable code** (utils.ts:57-67 — verbatim, the fix target):
```typescript
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();   // ← trusts FIRST (client-controlled) entry
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}
```
**Fix:** `forwarded.split(',').pop()!.trim()` (LAST hop = appended by most-recent trusted proxy), paired with the Nginx overwrite in DEPLOY.md. Keep the function signature and `'127.0.0.1'` default (tests rely on it — RESEARCH.md Pitfall 3).

**escapeRegExp to move here** (source `src/lib/homepage-articles.ts:28-30`, verbatim):
```typescript
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```
Export from utils; homepage-articles.ts then imports it (deleting its local copy) alongside existing utils imports (`appendSubId`, `getClientIp` etc. — see redirect/route.ts:5 for the `@/lib/utils` import convention).

---

### ReDoS fix sites (escapeRegExp applied — exactly two)

**Site 1 — `src/app/api/v1/public/articles/route.ts:33-36` (public, unauthenticated):**
```typescript
    if (searchKeyword && searchKeyword.trim()) {
      const regex = new RegExp(searchKeyword.trim(), 'i');      // ← wrap arg in escapeRegExp(...)
      filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
    }
```
**Site 2 — `src/lib/blacklist.ts:135-144` (admin/sheet input):**
```typescript
export async function sweepRetroactiveBlacklist(targetDomainOrUrl: string): Promise<...> {
  await connectToDatabase();
  const { hostname, rootDomain } = extractDomainFromUrl(targetDomainOrUrl);
  const searchRegex = new RegExp(rootDomain || hostname || targetDomainOrUrl, 'i');   // ← wrap in escapeRegExp(...)
```
**Usage shape to copy** (`src/lib/homepage-articles.ts:42-45` — the already-fixed reference):
```typescript
  if (query) {
    const regex = new RegExp(escapeRegExp(query), "i");
    filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
  }
```
Add a search-length cap (~100 chars) per RESEARCH.md as defense in depth.

---

### `src/lib/gemini.ts` + `cms/ai/generate-article/route.ts` (secrets cleanup, D-05/D-07)

**Literal 1 to remove** — `src/lib/gemini.ts:70-81` (default-parameter fallback + the fail-fast that activates once it's gone):
```typescript
  const {
    topic,
    landingPageContext = '',
    campaignName = '',
    trackingUrl = '#',
    apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6LfIjKqSrL5Ax8dYKyuMyapxXiVpsfSI2OoFDJuBB-kZQ',  // ← DELETE fallback literal
    language = 'vi-VN',
  } = options;

  if (!apiKey) {
    throw new Error('Chưa cung cấp Gemini API Key. Vui lòng nhập API Key vào Cài Đặt Hệ Thống hoặc ô Gemini API Key.');  // ← already exists (fail-fast, D-06 style)
  }
```
**Literal 2 to remove** — `src/app/api/v1/cms/ai/generate-article/route.ts:91-97` (note the phantom `as any` settings read — RESEARCH.md Pitfall 2):
```typescript
    let geminiApiKey = userApiKey || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6LfIjKqSrL5Ax8dYKyuMyapxXiVpsfSI2OoFDJuBB-kZQ';  // ← DELETE literal
    if (!geminiApiKey) {
      const dbSetting = await SettingModel.findOne({});
      if (dbSetting && (dbSetting as any).geminiApiKey) {   // ← always undefined today
        geminiApiKey = (dbSetting as any).geminiApiKey;
      }
    }
```
D-07 precedence: request `userApiKey` → env `GEMINI_API_KEY` → settings `gemini_api_key` (requires new schema field). **Never echo the raw key from `GET /api/v1/cms/settings`** (that GET is unauthenticated) — return masked hint (last 4) or omit.

**Literal 3 to remove** — `src/lib/gemini.ts:199-205` (leaked Google Cloud project ID in error string):
```typescript
      `👉 Nếu key tạo từ Google Cloud (Project 1050033519961): Hãy đảm bảo đã bật "Generative Language API" tại https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n` +
```
**Lazy-getter pattern to extend if needed** (`src/lib/auth.ts:9-14` — the D-06 canonical shape):
```typescript
function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Provide it via the JWT_SECRET environment variable.');
  }
  return process.env.JWT_SECRET;
}
```

---

### `src/lib/db/models.ts` (gemini_api_key field, D-07)

**Self-analog — SettingSchema + hot-reload-safe model export** (models.ts:269-298, 313-324):
```typescript
const SettingSchema = new Schema<ISetting>({
  site_title: { type: String, default: 'AIDEALSUK' },
  metaDescription: { type: String },
  // ... string fields follow this exact shape ...
  updated_at: { type: Date, default: Date.now }
});

// Model Exports (preventing overwrite model errors in Next.js hot reload)
export const SettingModel: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
```
Add `gemini_api_key: { type: String }` to SettingSchema + optional field on `ISetting` interface (lines ~250-267). Accept it in `PUT /api/v1/cms/settings` (already admin-verified? — verify; RESEARCH.md flags settings GET as unauthenticated).

---

### `src/app/api/v1/cms/affiliate-links/{route.ts,[id]/route.ts}` (scheme validation, AFF-01)

**Self-analog 400 shape** (affiliate-links/route.ts:61-66 — copy this response envelope):
```typescript
    if (!name || !finalBaseUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng nhập Tên chiến dịch và Link gốc' },
        { status: 400 }
      );
    }
```
**Validation insertion points:** POST after `finalBaseUrl`/`finalProductUrl` resolution (route.ts:58-66, before `connectToDatabase()` at :71); PUT before assignment `[id]/route.ts:32`:
```typescript
    if (base_url !== undefined) link.base_url = base_url;   // ← validate BEFORE this
```
**Logic reference** (`src/lib/seo.ts:28-37` — normalizeHttpUrl silently falls back; at this boundary reject with 400 instead):
```typescript
export function normalizeHttpUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
```
New helper shape (per RESEARCH.md): `new URL(value.trim())` + `protocol === 'http:' || 'https:'` → boolean; message `'base_url phải là URL http/https'`. Blocks `javascript:`/`data:` reaching the 302 redirect and Jina scrape.

---

### `scripts/reset-admin.ts` (NEW — D-04)

**Exact analog:** `scripts/create-admin.ts` (whole file, 39 lines — copy structure wholesale):
```typescript
import { connectToDatabase } from '../src/lib/db/mongodb';
import { UserModel } from '../src/lib/db/models';
import { hashPassword } from '../src/lib/auth';

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: tsx scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }

  await connectToDatabase();
  const password_hash = await hashPassword(password);

  const user = await UserModel.findOneAndUpdate(
    { username },
    { $set: { password_hash, role: 'admin', status: 'active', name: username },
      $setOnInsert: { avatar: username.charAt(0).toUpperCase() } },
    { upsert: true, new: true }
  );

  console.log(`Admin user ready: ${user.username} (id: ${user._id})`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
```
reset-admin differs only in intent messaging (recover existing admin's password — same upsert works: `$set` resets `password_hash`). Note relative imports (`../src/lib/...`) — scripts do NOT use `@/` aliases. Runnable via `npx tsx scripts/reset-admin.ts` (tsx is already a devDependency). Document in `DEPLOY.md` next to the existing admin/CLI docs.

---

### Seed deletions (SEC-01/D-02) + config edits

- **Delete:** `src/app/api/v1/seed/route.ts`, `src/lib/db/seed-mongodb.ts`, `src/lib/db/seed.ts`. Check no other importer references them (RESEARCH.md states all importers verified).
- **`package.json:12`** — delete `"seed": "tsx src/lib/db/seed-mongodb.ts"` in the SAME task as the file deletions (RESEARCH.md Pitfall 1 — broken npm script otherwise). `scripts/seed-*.ts` remain the only seeding path.
- **`.github/workflows/deploy.yml:21-22`** — `npm test` already runs before build; the RESEARCH-recommended gate is a Vitest test (`tests/api/security-regressions.test.ts`), so **no workflow change is strictly required**. If a workflow grep step is added anyway, scope it to secret env names only (`JWT_SECRET|GEMINI_API_KEY|MONGODB_URI|INSIDER_TOKEN_SECRET|RESEND_API`) over `src/` only — a naive `|| '` grep fails on `searchParams.get('page') || '1'`-style defaults (RESEARCH.md Pitfall 5).

---

## Test File Patterns (all new tests)

**Integration-test conventions** — analog `tests/api/tracking-redirect.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ArticleModel, ClickLogModel, UserModel } from '@/lib/db/models';
import { GET as redirectHandler } from '@/app/api/v1/public/tracking/redirect/route';

// Handlers imported DIRECTLY (no HTTP server) — invoke with `new Request(url)`:
function redirectRequest(articleId?: string, affiliateLinkId?: string) {
  const url = new URL('http://localhost/api/v1/public/tracking/redirect');
  if (articleId) url.searchParams.set('article_id', articleId);
  if (affiliateLinkId) url.searchParams.set('affiliate_link_id', affiliateLinkId);
  return new Request(url.toString());
}
const res = await redirectHandler(redirectRequest(article._id.toString(), affiliateLink._id.toString()));
```
Seed helpers create `UserModel` → `AffiliateLinkModel` → `ArticleModel` rows per test with unique usernames (`author-${Date.now()}-${Math.random()}`); assertions query models directly (`ClickLogModel.countDocuments()`).

**Unit-test conventions** — analog `tests/lib/sanitize.test.ts:1-10` (flat describes, behavior-named its, string-contains assertions):
```typescript
import { describe, expect, it } from 'vitest';
import { sanitizeArticleContent } from '@/lib/sanitize';

describe('sanitizeArticleContent (SEC-03 XSS defense)', () => {
  it('strips <script> tags entirely', () => {
    const result = sanitizeArticleContent('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script');
  });
});
```

**Env/setup contract** — `tests/setup.ts:5-6` sets test-only `JWT_SECRET` at module top (before static imports; do NOT move into `beforeAll`):
```typescript
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'vitest-only-test-secret-never-used-outside-tests';
```
Crafting a fallback-secret token for the AUTH-01 test: `jwt.sign(payload, 'nexus_super_secret_jwt_key_2026')` must yield 401 against all fixed routes. For the cms-auth-401 parameterized test: build the 25-route table, loop `expect((await handler(reqNoAuth)).status).toBe(401)` — remember duplicate-route fixes are now `getAuthUser(req)` (sync, takes `req`), and `blacklist/check` must be included.

**Rate-limit tests:** call the exported `_resetForTests()` in `beforeEach` (RESEARCH.md Pitfall 3) or send distinct `X-Forwarded-For` per scenario.

---

## Shared Patterns

### Canonical JWT guard (AUTH-01)
**Source:** `src/lib/auth.ts:38-55` · **Apply to:** all 5 fallback CMS routes + `blacklist/check`
- Always `getAuthUser(req)` with the handler's request object — never `headers()` from `next/headers`, never a route-local secret.
- The swap automatically adds the logout-token-blacklist check the duplicates skipped (`verifyToken` → `isBlacklisted`, auth.ts:39). Do not preserve the duplicates' variant.

### Lazy env getter with loud failure (SEC-02/D-06)
**Source:** `src/lib/auth.ts:9-14`, `src/lib/db/mongodb.ts:11-34` · **Apply to:** every required-secret read
- Throw at first use with a message naming the env var; never at import time; never a `|| 'literal'` fallback. Build/CI/tests must not require real secrets.

### In-memory Map state store (SEC-04)
**Source:** `src/lib/rateLimit.ts:11-13`, `src/lib/tokenBlacklist.ts:3-6` · **Apply to:** new `consumeRequest` + click dedupe map
- Module-level `Map`, lazy prune/delete on read, comment citing the PM2 `instances:1, fork` single-instance contract (`ecosystem.config.js` — do not change this phase). Export a test-reset affordance.

### Error/response envelope
**Source:** all route handlers, e.g. `login/route.ts:8-13`, `click/route.ts:12-15` · **Apply to:** every modified route
- `{ status: 'error'|'success', message|data }` JSON via `NextResponse.json`; 429 carries `Retry-After` header; errors logged via `console.error('<Context> error:', error)` before the response.

### RSC page contract (Next 16 — NOT training-data Next.js)
**Sources:** `src/app/insider/success/page.tsx` (Promise searchParams), `src/app/article/[slug]/page.tsx:23` (`export const revalidate = 0`), `src/proxy.ts:37-41` (CSP matcher)
- `searchParams`/`params` are Promises — `await` them. DB-backed per-request page → `export const dynamic = 'force-dynamic'` (redirect route precedent, redirect/route.ts:8) or `revalidate = 0`. Redirect via `redirect()` from `next/navigation` inside pages (per bundled docs), `NextResponse.redirect(new URL(...), 302)` only inside route handlers. No `dangerouslySetInnerHTML` anywhere on this page.

### CLI script contract (D-04)
**Source:** `scripts/create-admin.ts` · **Apply to:** `scripts/reset-admin.ts`
- Relative `../src/lib/...` imports, `process.argv` args, usage-error + `process.exit(1)`, top-level `.catch` wrapper, `npx tsx scripts/<name>.ts` invocation.

---

## No Analog Found

| File | Role | Data Flow | Reason | Guidance |
|------|------|-----------|--------|----------|
| `tests/api/security-regressions.test.ts` | test (gate) | file-I/O | Repo has no fs-walking/grep-gate test; nothing scans source text | Use RESEARCH.md §Code Examples gate sketch (lines 484-510); vitest conventions from tests/api analogs above |
| `tests/api/cms-auth-401.test.ts` (parameterization half) | test (integration) | request-response | No parameterized route-table test exists yet | Parameterization is new; per-route invocation mechanics copy tracking-redirect.test.ts; route inventory in RESEARCH.md (25 CMS routes) |

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/v1/**` (cms, public, auth), `src/app/` (pages), `scripts/`, `tests/`, `.github/workflows/`
**Files scanned:** 22 source files read in full or in targeted sections + 1 grep sweep (`verifyAdminAuth|JWT_SECRET \|\||jwt\.verify`) + `git ls-files` tracked-status verification
**Pattern extraction date:** 2026-09-14

**Cross-cutting note for the planner:** workstreams (2) secrets-cleanup and (3) canonical-auth both touch the same 5 CMS routes — the research recommends executing them as one task; PATTERNS.md keeps them as separate assignment sections only so each excerpt is findable.
