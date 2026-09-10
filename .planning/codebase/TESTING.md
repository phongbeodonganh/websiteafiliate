# Testing Patterns

**Analysis Date:** 2026-09-10

Tests exist and are an active part of this codebase: **9 Vitest test files** (6 API-route suites, 3 lib suites) running against an in-memory MongoDB. There are **no component/UI tests** and **no E2E tests**.

## Test Framework

**Runner:**
- Vitest `^4.1.10` (devDependency in `package.json:60`)
- Config: `vitest.config.mts`
  - `environment: 'node'` (no jsdom — nothing renders React in tests)
  - `setupFiles: ['./tests/setup.ts']`
  - `fileParallelism: false` — each test file gets its own `MongoMemoryServer` from setup.ts; serial execution avoids multiple mongod instances on small CI runners (per the Vietnamese comment in `vitest.config.mts:10-11`)
  - `testTimeout: 20000`, `hookTimeout: 30000`
  - `resolve: { tsconfigPaths: true }` — the `@/*` path alias works in tests

**Assertion Library:**
- Vitest built-in `expect` (no chai/sinon/jest add-ons)

**Run Commands:**
```bash
npm test              # vitest run — full suite
npm run test:watch    # vitest — watch mode
```
There is no coverage script and **no coverage provider installed** (`@vitest/coverage-v8` is absent from devDependencies). Adding it would be required before any coverage reporting is possible.

Note: the root `test.mjs` is an **ad-hoc manual Gemini API smoke script** (`tsx`-style, run by hand), not part of the Vitest suite — `vitest.config.mts` does not include `test.mjs` and it contains a hardcoded API key, so never use it as a pattern for real tests and never commit similar files.

## Test File Organization

**Location:**
- Separate top-level `tests/` directory (not co-located), mirrored to source layout:
  - `tests/api/` — route-level integration tests, one file per API feature
  - `tests/lib/` — unit tests for pure server logic
  - `tests/setup.ts` — global setup (see below)

**Naming:**
- Kebab-case `<feature-or-route>.test.ts`: `auth-login.test.ts`, `tracking-redirect.test.ts`, `articles-ownership.test.ts`, `sanitize.test.ts`, `insider-tokens.test.ts`, `insider-digest.test.ts`

**Structure:**
```
tests/
├── setup.ts                          # global env + MongoMemoryServer lifecycle
├── api/                              # integration: real DB + imported route handlers
│   ├── auth-login.test.ts
│   ├── auth-logout.test.ts
│   ├── articles-ownership.test.ts
│   ├── tracking-redirect.test.ts
│   ├── insider-lifecycle.test.ts
│   └── insider-admin.test.ts
└── lib/                              # unit: pure logic, no DB (or DB for tokens)
    ├── sanitize.test.ts
    ├── insider-tokens.test.ts
    └── insider-digest.test.ts
```

## Test Structure

**Suite Organization** (actual pattern from `tests/api/auth-login.test.ts`):

```typescript
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route'; // import the handler directly

async function seedUser() {                 // per-file seeding helper
  await connectToDatabase();
  return UserModel.create({ username: 'login-test-user', password_hash: await hashPassword('correct-password-123'), role: 'editor', status: 'active' });
}

function loginRequest(username: string, password: string) {  // Request-builder helper
  return new Request('http://localhost/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

describe('POST /api/v1/auth/login', () => {
  it('returns a valid token for the correct password', async () => {
    await seedUser();
    const res = await loginHandler(loginRequest('login-test-user', 'correct-password-123'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(typeof json.token).toBe('string');
  });
});
```

**Patterns:**
- **No HTTP server / no supertest.** Route handlers are imported by aliasing the verb (`POST as loginHandler`, `PUT as putArticle`, `DELETE as deleteArticle`) and called directly with constructed `Request` objects (`tests/api/articles-ownership.test.ts:5`)
- **Dynamic routes:** pass the second argument as `{ params: Promise.resolve({ id }) }` — matching the installed Next.js Promise-params API (`tests/api/articles-ownership.test.ts:52-54`)
- **Setup:** global `tests/setup.ts` runs top-level `await MongoMemoryServer.create()` and sets `process.env.MONGODB_URI` **before any app module import** (a beforeAll would be too late — static imports evaluate first; the Vietnamese comment at `tests/setup.ts:1-4` explains this). It also sets `JWT_SECRET` with a test-only value. `afterEach` wipes every mongoose collection; `afterAll` disconnects and stops mongod
- **Per-suite env:** secrets needed only by some suites are set in that file's `beforeAll` (`process.env.INSIDER_TOKEN_SECRET` in `tests/lib/insider-tokens.test.ts:7-9`)
- **Teardown:** rely on the global `afterEach` collection wipe; individual tests do not clean up after themselves
- **Assertion pattern:** assert on `res.status`, then on parsed JSON (`await res.json()`), redirect `res.headers.get('location')`, and **direct DB state** after the call (`tests/api/tracking-redirect.test.ts:52-55`)

## Mocking

**Framework:** Vitest `vi.mock` + `vi.hoisted`

**Patterns** (actual pattern from `tests/api/insider-lifecycle.test.ts:1-17`):

```typescript
const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/mailer', () => ({
  isEmailConfigured: () => true,
  sendEmail: emailMocks.sendEmail,
  sendEmailBatch: vi.fn(),
}));
// ...then in beforeEach:
emailMocks.sendEmail.mockReset();
emailMocks.sendEmail.mockResolvedValue({ id: 'test-confirmation-email-id' });
```

- `vi.hoisted` creates the mock handle before the `vi.mock` factory and before importing app modules
- Assertions on mock interaction: `expect(emailMocks.sendEmail).toHaveBeenCalledOnce()` (`tests/api/insider-lifecycle.test.ts:54`)

**What to Mock:**
- External network side effects only — email delivery (`@/lib/email/mailer`) is the established example
- Env vars for external services (`RESEND_API`, `INSIDER_TOKEN_SECRET`) — set dummy values in `beforeAll`

**What NOT to Mock:**
- The database — always real, via `mongodb-memory-server` + the app's own `connectToDatabase()`
- Mongoose models, auth (`signToken`/`hashPassword` are used for real in tests), sanitizers, and the route handlers themselves

## Fixtures and Factories

**Test Data:**
- Inline factory helpers at the top of each test file, creating records with Mongoose models directly. Uniqueness via timestamp + random suffix:

```typescript
const user = await UserModel.create({
  username: `author-${Date.now()}-${Math.random()}`,
  password_hash: 'irrelevant',
  role: 'author',
  status: 'active',
});
```
(`tests/api/tracking-redirect.test.ts:6-33`, `tests/api/auth-logout.test.ts:8-17`)

- Override objects for scenario variation: `seedLinkAndArticle(overrides: Partial<{ status: 'active' | 'inactive' | 'blacklisted' }> = {})` (`tests/api/tracking-redirect.test.ts:6`)
- Raw `collection.insertOne` for out-of-model-shape fixtures (legacy documents): `tests/api/insider-lifecycle.test.ts:40-43`
- There is no shared fixture/factory directory — keep helpers local to the test file

**Location:** helpers live inside each test file; global concerns only in `tests/setup.ts`

## Coverage

**Requirements:** None enforced. No coverage provider installed, no thresholds configured.

**View Coverage:** Not available until `@vitest/coverage-v8` is added to devDependencies and a `vitest run --coverage` script is created.

## Test Types

**Unit Tests:**
- `tests/lib/*.test.ts` — pure functions with no I/O (`insider-digest.test.ts` verifies GMT+12 period math and email HTML escaping), or crypto/token round-trips (`insider-tokens.test.ts` verifies create/verify/tamper/expiry/purpose-scoping)

**Integration Tests:**
- `tests/api/*.test.ts` — the dominant style: real Mongoose models against in-memory MongoDB, real JWT auth (real `signToken` produces a `Bearer` token the handler accepts, `tests/api/articles-ownership.test.ts:37-39`), real redirects/headers asserted. Full lifecycle flows are covered end-to-end in one suite (subscribe → confirm → unsubscribe in `tests/api/insider-lifecycle.test.ts`)

**E2E Tests:** Not used (no Playwright/Cypress, no browser environment)

## Common Patterns

**Async Testing:**
```typescript
it('...', async () => {           // every DB-touching test is async/await
  await seedUser();
  const res = await handler(req); // await the handler call
  const json = await res.json();  // await body parsing
  expect(json.status).toBe('success');
});
```

**Error Testing:**
```typescript
// HTTP error surfaces — assert status codes and DB non-mutation:
const res = await putArticle(jsonRequest('PUT', otherToken, { title: 'Hijacked Title' }), params(id));
expect(res.status).toBe(403);
const stillOriginal = await ArticleModel.findById(id);
expect(stillOriginal?.title).toBe('Original Title');   // state unchanged (tests/api/articles-ownership.test.ts:57-68)

// Thrown errors from pure functions:
expect(() => verifyInsiderToken(`${validToken}x`, 'confirm')).toThrow('Invalid or expired Insider token');
// (tests/lib/insider-tokens.test.ts:24)
```

**Feature-tagged suites:** security requirement IDs appear in suite names, tying tests to specs — `describe('sanitizeArticleContent (SEC-03 XSS defense)')` (`tests/lib/sanitize.test.ts:4`), `describe('POST /api/v1/auth/logout (SEC-06 token revocation)')` (`tests/api/auth-logout.test.ts:26`). Follow this convention when a test suite implements a numbered requirement.

**Gaps to be aware of (for future test work):**
- No tests for page components, React UI, or anything requiring a DOM (`environment: 'node'`)
- No tests for CMS AI routes (`src/app/api/v1/cms/ai/*`), upload (`src/app/api/v1/cms/upload/route.ts`), webhook (`src/app/api/v1/webhooks/resend/route.ts`), or cron (`src/app/api/v1/cron/insider-digest/route.ts`) — `insider-admin.test.ts` covers the admin insider send path
- No CI pipeline exists (no `.github/`); tests are run manually via `npm test`

---

*Testing analysis: 2026-09-10*
