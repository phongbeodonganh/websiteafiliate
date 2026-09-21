/**
 * AUTH-01 — parameterized 401/403 gate over the complete CMS route inventory.
 *
 * What this gate proves (and must keep proving — SEC-02 regressed once in this exact
 * codebase via a route-local fallback-secret duplicate guard):
 *   1. Every auth verb on every route under `src/app/api/v1/cms/**` rejects with 401 or
 *      403 when invoked with a Request that has no Authorization header — no route is
 *      silently public, including `blacklist/check` (which historically had no auth at
 *      all) and the settings GET/PUT (which were historically public).
 *   2. A self-signed JWT carrying either of the two former hardcoded route-local
 *      fallback secrets is rejected on every CMS route — the canonical single-secret
 *      verification in `src/lib/auth.ts` is the only authority and a leaked fallback
 *      literal never crosses as valid.
 *   3. A logout-blacklisted canonical token is rejected uniformly (Pitfall 6: the swap
 *      to `getAuthUser` extends revocation across the whole surface, not just the secret).
 *   4. A non-Bearer Authorization header (e.g. Basic) is treated identically to a
 *      missing header — only `Bearer <token>` is ever consulted.
 *
 * Status contract (preserved verbatim from each route's existing role matrix — the plan
 * forbids weakening or dropping role checks): the simple `if (!user)` guards return 401,
 * the combined `if (!user || user.role !== 'admin')` writes-guards return 403 on a
 * missing token; both classes are correct rejections of an unauthenticated request. The
 * gate pins the expected status per route so a silent downgrade to 200 fails loudly.
 *
 * Route table is verified against a filesystem glob of every route.ts under
 * src/app/api/v1/cms at runtime (Task 2): if a CMS route is added and not registered
 * here, the inventory guard fails — preventing exactly the kind of drift that
 * the (historically authless) blacklist/check route represented. Update the table
 * when you add a route; do not exclude.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import jwt from 'jsonwebtoken';
import { blacklistToken } from '@/lib/tokenBlacklist';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';

// Canonical handlers — one import per route file. The [id]-route imports carry the
// literal bracket segment; TS resolves them like any import path.
import { GET as affLinksGET, POST as affLinksPOST } from '@/app/api/v1/cms/affiliate-links/route';
import { PUT as affLinkPUT, DELETE as affLinkDELETE } from '@/app/api/v1/cms/affiliate-links/[id]/route';
import { POST as genArticlePOST } from '@/app/api/v1/cms/ai/generate-article/route';
import { POST as genTakeawaysPOST } from '@/app/api/v1/cms/ai/generate-takeaways/route';
import { GET as articlesGET, POST as articlesPOST } from '@/app/api/v1/cms/articles/route';
import { GET as articleGET, PUT as articlePUT, DELETE as articleDELETE } from '@/app/api/v1/cms/articles/[id]/route';
import { GET as blacklistGET, POST as blacklistPOST, DELETE as blacklistDELETE } from '@/app/api/v1/cms/blacklist/route';
import { POST as blacklistCheckPOST } from '@/app/api/v1/cms/blacklist/check/route';
import { POST as blacklistImportPOST } from '@/app/api/v1/cms/blacklist/import/route';
import { POST as blacklistSheetPOST } from '@/app/api/v1/cms/blacklist/import-sheet-url/route';
import { POST as quickBlacklistPOST } from '@/app/api/v1/cms/blacklist/quick-blacklist/route';
import { GET as categoriesGET, POST as categoriesPOST } from '@/app/api/v1/cms/categories/route';
import { PUT as categoryPUT, DELETE as categoryDELETE } from '@/app/api/v1/cms/categories/[id]/route';
import { GET as clickLogsGET } from '@/app/api/v1/cms/click-logs/route';
import { GET as dashboardGET } from '@/app/api/v1/cms/dashboard/route';
import { POST as insiderSendPOST } from '@/app/api/v1/cms/insider/send-now/route';
import { GET as insightsGET } from '@/app/api/v1/cms/insights/route';
import { GET as settingsGET, PUT as settingsPUT } from '@/app/api/v1/cms/settings/route';
import { GET as subCatsGET, POST as subCatsPOST } from '@/app/api/v1/cms/sub-categories/route';
import { PUT as subCatPUT, DELETE as subCatDELETE } from '@/app/api/v1/cms/sub-categories/[id]/route';
import { GET as subscribersGET } from '@/app/api/v1/cms/subscribers/route';
import { DELETE as subscriberDELETE } from '@/app/api/v1/cms/subscribers/[id]/route';
import { POST as uploadPOST } from '@/app/api/v1/cms/upload/route';
import { GET as usersGET, POST as usersPOST } from '@/app/api/v1/cms/users/route';
import { PUT as userPUT, DELETE as userDELETE } from '@/app/api/v1/cms/users/[id]/route';

// --- constants --------------------------------------------------------------

/**
 * The two former hardcoded route-local fallback secrets (verbatim from the
 * pre-remediation source — excerpts captured in 01-PATTERNS.md). A token signed with
 * either of these must be rejected 401/403 on every CMS route: the canonical
 * `getAuthUser` verifies against the single canonical `JWT_SECRET` only, so these
 * literals (which are still floating around in git history) can never forge a session.
 *
 * NOTE: these literals appear in a string-typed array used ONLY for crafting rejection
 * test tokens. They are never used as a fallback for `process.env.JWT_SECRET` and never
 * exported — so they do not trip the SEC-02 secret-fallback gate (tests live outside
 * `src/`, which the gate scopes itself to).
 */
const FORMER_FALLBACK_SECRETS = [
  'nexus_super_secret_jwt_key_2026',          // the 4 blacklist-route duplicate guards
  'affiliate_secret_key_v3_super_secure',     // the generate-article duplicate guard
];

const CANONICAL_TEST_SECRET =
  process.env.JWT_SECRET || 'vitest-only-test-secret-never-used-outside-tests';

const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011'; // any 24-hex; only travels as request context, never reaches the DB on rejection

// --- helpers ----------------------------------------------------------------

/**
 * Build a Request with no Authorization header for the given method and CMS path.
 * A body is supplied for write verbs so `req.json()` (were it reached) would resolve
 * cleanly; the auth guard runs before any body parse in every CMS route, so the actual
 * body shape is irrelevant to the rejection outcome.
 */
function unauthenticatedRequest(method: string, path: string): Request {
  const url = new URL(`http://localhost${path}`);
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    init.body = JSON.stringify({});
  }
  return new Request(url.toString(), init);
}

/**
 * A Next.js dynamic- route second argument: `{ params: Promise<{id}> }`. Auth
 * guards run before `await params`, so even a rejecting promise would not be reached
 * on the no-token path; we resolve normally regardless.
 */
function paramsArg(id: string = DUMMY_OBJECT_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Marker token for a `Bearer` scheme with a token that fails canonical verification. */
function bearer(token: string): string {
  return `Bearer ${token}`;
}

// --- route inventory table --------------------------------------------------
//
// Single source of truth for the parameterized tests below. The "runtime glob
// verification" describe-block asserts that this table covers EVERY verb on EVERY
// `route.ts` under `src/app/api/v1/cms/**` — so adding a CMS route without
// registering it here fails the inventory guard (no silent drift).
//
// Each entry maps (verb, route file) to:
//   - handler: the imported handler function
//   - path: a representative URL path for the request factory
//   - expectedNoAuthStatus: the status the existing role matrix returns on a missing
//     token (401 for `if(!user)` guards, 403 for combined `if(!user||user.role!=='admin')`
//     write-guards — both are correct rejections; the gate pins the exact expected
//     value so a silent downgrade to 200 fails loudly)
//   - hasParamsArg: the [id] dynamic routes require the `{ params }` second arg

interface RouteEntry {
  verb: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  routeFile: string; // repo-relative, forward slashes
  path: string;
  expectedNoAuthStatus: 401 | 403;
  hasParamsArg: boolean;
  // The handler's parameter list varies across routes (Request vs NextRequest;
  // some take a {params} second arg, some do not). Accept any call signature that
  // returns a Response/Promise<Response> — we control argument shape at each call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => Promise<Response> | Response;
}

const ROUTES: RouteEntry[] = [
  // affiliate-links (POST/PUT/DELETE are admin-only writes → 403 on missing token; GET → 401)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/affiliate-links/route.ts', path: '/api/v1/cms/affiliate-links', expectedNoAuthStatus: 401, hasParamsArg: false, handler: affLinksGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/affiliate-links/route.ts', path: '/api/v1/cms/affiliate-links', expectedNoAuthStatus: 403, hasParamsArg: false, handler: affLinksPOST },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/affiliate-links/[id]/route.ts', path: '/api/v1/cms/affiliate-links/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: affLinkPUT },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/affiliate-links/[id]/route.ts', path: '/api/v1/cms/affiliate-links/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: affLinkDELETE },

  // ai (admin|editor for generate-article; admin|editor implied for takeaways)
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/ai/generate-article/route.ts', path: '/api/v1/cms/ai/generate-article', expectedNoAuthStatus: 401, hasParamsArg: false, handler: genArticlePOST },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/ai/generate-takeaways/route.ts', path: '/api/v1/cms/ai/generate-takeaways', expectedNoAuthStatus: 401, hasParamsArg: false, handler: genTakeawaysPOST },

  // articles (collection: any authed user GETs; writes admin-only → 403; [id] same matrix)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/articles/route.ts', path: '/api/v1/cms/articles', expectedNoAuthStatus: 401, hasParamsArg: false, handler: articlesGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/articles/route.ts', path: '/api/v1/cms/articles', expectedNoAuthStatus: 401, hasParamsArg: false, handler: articlesPOST },
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/articles/[id]/route.ts', path: '/api/v1/cms/articles/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 401, hasParamsArg: true, handler: articleGET },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/articles/[id]/route.ts', path: '/api/v1/cms/articles/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 401, hasParamsArg: true, handler: articlePUT },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/articles/[id]/route.ts', path: '/api/v1/cms/articles/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 401, hasParamsArg: true, handler: articleDELETE },

  // blacklist (read routes GET/POST → 401; admin-only writes quick/import/import-sheet-url use
  // the combined guard but historically return 401 not 403; DELETE admin-only → 401)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/blacklist/route.ts', path: '/api/v1/cms/blacklist', expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/blacklist/route.ts', path: '/api/v1/cms/blacklist', expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistPOST },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/blacklist/route.ts', path: '/api/v1/cms/blacklist?id=' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistDELETE },
  // blacklist/check — historically had NO auth at all (CONCERNS blind spot, research Open
  // Question 1). The plan's Task 1 step 2 mandates adding getAuthUser; covered here.
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/blacklist/check/route.ts', path: '/api/v1/cms/blacklist/check', expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistCheckPOST },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/blacklist/import/route.ts', path: '/api/v1/cms/blacklist/import', expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistImportPOST },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/blacklist/import-sheet-url/route.ts', path: '/api/v1/cms/blacklist/import-sheet-url', expectedNoAuthStatus: 401, hasParamsArg: false, handler: blacklistSheetPOST },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/blacklist/quick-blacklist/route.ts', path: '/api/v1/cms/blacklist/quick-blacklist', expectedNoAuthStatus: 401, hasParamsArg: false, handler: quickBlacklistPOST },

  // categories (GET → 401; admin-only writes → 403)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/categories/route.ts', path: '/api/v1/cms/categories', expectedNoAuthStatus: 401, hasParamsArg: false, handler: categoriesGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/categories/route.ts', path: '/api/v1/cms/categories', expectedNoAuthStatus: 403, hasParamsArg: false, handler: categoriesPOST },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/categories/[id]/route.ts', path: '/api/v1/cms/categories/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: categoryPUT },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/categories/[id]/route.ts', path: '/api/v1/cms/categories/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: categoryDELETE },

  // admin-only reads: separated guard — `if (!user) 401` then `if (role!=='admin') 403`;
  // no-token path returns 401 (the no-user branch), not 403.
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/click-logs/route.ts', path: '/api/v1/cms/click-logs', expectedNoAuthStatus: 401, hasParamsArg: false, handler: clickLogsGET },
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/dashboard/route.ts', path: '/api/v1/cms/dashboard', expectedNoAuthStatus: 401, hasParamsArg: false, handler: dashboardGET },

  // insider send (admin-only) → 403
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/insider/send-now/route.ts', path: '/api/v1/cms/insider/send-now', expectedNoAuthStatus: 403, hasParamsArg: false, handler: insiderSendPOST },

  // insights: separated guard — `if (!user) 401` then `if (role!=='admin') 403` (403 admin-only applies to the in-role check only)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/insights/route.ts', path: '/api/v1/cms/insights', expectedNoAuthStatus: 401, hasParamsArg: false, handler: insightsGET },

  // settings — GET/PUT historically public; plan Task 1 step 3 locks both behind getAuthUser → 401
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/settings/route.ts', path: '/api/v1/cms/settings', expectedNoAuthStatus: 401, hasParamsArg: false, handler: settingsGET },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/settings/route.ts', path: '/api/v1/cms/settings', expectedNoAuthStatus: 401, hasParamsArg: false, handler: settingsPUT },

  // sub-categories (GET → 401; admin writes → 403)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/sub-categories/route.ts', path: '/api/v1/cms/sub-categories', expectedNoAuthStatus: 401, hasParamsArg: false, handler: subCatsGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/sub-categories/route.ts', path: '/api/v1/cms/sub-categories', expectedNoAuthStatus: 403, hasParamsArg: false, handler: subCatsPOST },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/sub-categories/[id]/route.ts', path: '/api/v1/cms/sub-categories/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: subCatPUT },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/sub-categories/[id]/route.ts', path: '/api/v1/cms/sub-categories/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: subCatDELETE },

  // subscribers (admin-only GET → 403; admin-only DELETE → 403)
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/subscribers/route.ts', path: '/api/v1/cms/subscribers', expectedNoAuthStatus: 403, hasParamsArg: false, handler: subscribersGET },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/subscribers/[id]/route.ts', path: '/api/v1/cms/subscribers/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: subscriberDELETE },

  // upload → 401
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/upload/route.ts', path: '/api/v1/cms/upload', expectedNoAuthStatus: 401, hasParamsArg: false, handler: uploadPOST },

  // users: all four verbs use the combined `!currentUser || user.role!=='admin'` guard → 403 on a missing token
  { verb: 'GET', routeFile: 'src/app/api/v1/cms/users/route.ts', path: '/api/v1/cms/users', expectedNoAuthStatus: 403, hasParamsArg: false, handler: usersGET },
  { verb: 'POST', routeFile: 'src/app/api/v1/cms/users/route.ts', path: '/api/v1/cms/users', expectedNoAuthStatus: 403, hasParamsArg: false, handler: usersPOST },
  { verb: 'PUT', routeFile: 'src/app/api/v1/cms/users/[id]/route.ts', path: '/api/v1/cms/users/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: userPUT },
  { verb: 'DELETE', routeFile: 'src/app/api/v1/cms/users/[id]/route.ts', path: '/api/v1/cms/users/' + DUMMY_OBJECT_ID, expectedNoAuthStatus: 403, hasParamsArg: true, handler: userDELETE },
];

// --- runtime glob verification (Task 2 step 2: route-inventory confirmation) -

/** Recursively collect every route.ts under the given root, repo-relative forward-slash. */
function globRouteFiles(rootRel: string): string[] {
  const root = join(process.cwd(), rootRel);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry === 'route.ts') {
        out.push(full.replace(process.cwd() + sep, '').replace(/\\/g, '/'));
      }
    }
  };
  walk(root);
  return out.sort();
}

/** Read a route.ts source and extract its exported verb handler names. */
function verbsInRouteFile(routeFileRel: string): string[] {
  // Lazy require — only used inside the inventory assertions.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('node:fs');
  const src = fs.readFileSync(join(process.cwd(), routeFileRel), 'utf8');
  const matches = [...src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g)];
  const verbs = matches.map((m) => m[1]);
  return verbs.filter((v, i, a) => a.indexOf(v) === i).sort();
}

// --- the tests ---------------------------------------------------------------

describe('AUTH-01 — CMS route inventory covers every route.ts under src/app/api/v1/cms/**', () => {
  it('the static ROUTES table lists every verb on every discovered route file (no route silently skipped)', () => {
    const discoveredFiles = globRouteFiles('src/app/api/v1/cms');

    // Group directory routes vs [id] routes — filesystem lists them as literals
    // ('[id]' is a real directory name), so the mapping to routeFile strings above
    // should be 1:1 against the discovered list.
    const tableFiles = new Set(ROUTES.map((r) => r.routeFile));

    const missingFiles = discoveredFiles.filter((f) => !tableFiles.has(f));
    const extraFiles = [...tableFiles].filter((f) => !discoveredFiles.includes(f));

    expect(missingFiles, 'route files discovered on disk but not in the ROUTES table — register them').toEqual([]);
    expect(extraFiles, 'route files in the ROUTES table but not on disk — drift').toEqual([]);

    // Every verb exported by each route file must be covered.
    const tableByFile = new Map<string, Set<string>>();
    for (const r of ROUTES) {
      if (!tableByFile.has(r.routeFile)) tableByFile.set(r.routeFile, new Set());
      tableByFile.get(r.routeFile)!.add(r.verb);
    }

    const verbMismatches: string[] = [];
    for (const file of discoveredFiles) {
      const onDisk = new Set(verbsInRouteFile(file));
      const inTable = tableByFile.get(file) || new Set<string>();
      for (const v of onDisk) if (!inTable.has(v)) verbMismatches.push(`${file} exports ${v} but the table does not cover it`);
      for (const v of inTable) if (!onDisk.has(v)) verbMismatches.push(`${file}: table claims ${v} but the file does not export it`);
    }
    expect(verbMismatches, 'verb mismatches between the table and route files').toEqual([]);
  });
});

describe('AUTH-01 — every CMS route rejects an unauthenticated request (no Authorization header)', () => {
  for (const route of ROUTES) {
    it(`${route.verb} ${route.routeFile} → ${route.expectedNoAuthStatus} without a token`, async () => {
      const req = unauthenticatedRequest(route.verb, route.path);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = route.hasParamsArg
        ? await route.handler(req, paramsArg())
        : await route.handler(req);

      // Invariant: NEVER 200/2xx without a token. Pin the exact expected status so a
      // silent downgrade (e.g. a route accidentally dropping the guard) fails loudly.
      expect(res.status, `expected ${route.expectedNoAuthStatus} but got`).toBe(route.expectedNoAuthStatus);
      // Belt-and-braces: also assert it is one of the two valid rejection codes.
      expect([401, 403]).toContain(res.status);
    });
  }
});

describe('AUTH-01 — non-Bearer Authorization scheme is treated identically to a missing header', () => {
  // Run only on a representative subset (the plan requires the behavior is uniform;
  // routing logic for the scheme check lives once in getAuthUser). One read route and
  // one write route is sufficient — both go through the same canonical guard.
  const representatives: RouteEntry[] = [
    ROUTES.find((r) => r.routeFile.endsWith('cms/blacklist/route.ts') && r.verb === 'GET')!,
    ROUTES.find((r) => r.routeFile.endsWith('cms/categories/route.ts') && r.verb === 'POST')!,
  ];

  for (const route of representatives) {
    it(`${route.verb} ${route.routeFile} → ${route.expectedNoAuthStatus} for a Basic-scheme Authorization header`, async () => {
      const url = new URL(`http://localhost${route.path}`);
      const init: RequestInit = {
        method: route.verb,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from('user:pass').toString('base64'),
        },
      };
      if (route.verb === 'POST' || route.verb === 'PUT' || route.verb === 'PATCH') {
        init.body = JSON.stringify({});
      }
      const req = new Request(url.toString(), init);

      const res = route.hasParamsArg
        ? await route.handler(req, paramsArg())
        : await route.handler(req);

      expect(res.status).toBe(route.expectedNoAuthStatus);
    });
  }
});

describe('AUTH-01 — every CMS route rejects a JWT signed with a former route-local fallback secret', () => {
  // Per plan Task 1 step 4: cover all six routes that historically carried route-local
  // fallback-secret duplicate guards — the four blacklist routes, the
  // blacklist/check route (now-authed), and generate-article. The four-blacklist-route
  // set's parent file (cms/blacklist/route.ts) covers GET/POST/DELETE; quick/import/
  // import-sheet-url are separate. We assert across the whole set as called out in the
  // plan, and additionally assert on generate-article with its specific literal.
  const historicallyFallbackRoutes: RouteEntry[] = ROUTES.filter((r) =>
    [
      'src/app/api/v1/cms/blacklist/route.ts',
      'src/app/api/v1/cms/blacklist/check/route.ts',
      'src/app/api/v1/cms/blacklist/quick-blacklist/route.ts',
      'src/app/api/v1/cms/blacklist/import/route.ts',
      'src/app/api/v1/cms/blacklist/import-sheet-url/route.ts',
      'src/app/api/v1/cms/ai/generate-article/route.ts',
    ].includes(r.routeFile)
  );

  // For each former fallback literal, sign a token with an admin payload so a naive
  // "the role check would pass" state cannot mask the rejection — the rejection must
  // come from the secret mismatch, not a role failure.
  const adminPayload = { userId: 1, username: 'fallback-attacker', role: 'admin' as const };

  for (const secret of FORMER_FALLBACK_SECRETS) {
    describe(`token signed with former literal "${secret}"`, () => {
      const forgedToken = jwt.sign(adminPayload, secret);

      for (const route of historicallyFallbackRoutes) {
        it(`${route.verb} ${route.routeFile} rejects the forged token with ${route.expectedNoAuthStatus}`, async () => {
          const url = new URL(`http://localhost${route.path}`);
          const init: RequestInit = {
            method: route.verb,
            headers: {
              'Content-Type': 'application/json',
              Authorization: bearer(forgedToken),
            },
          };
          if (route.verb === 'POST' || route.verb === 'PUT' || route.verb === 'PATCH') {
            init.body = JSON.stringify({});
          }
          const req = new Request(url.toString(), init);

          const res = route.hasParamsArg
            ? await route.handler(req, paramsArg())
            : await route.handler(req);

          // The forged token MUST be rejected: the canonical guard verifies against the
          // single canonical JWT_SECRET, so a signature with any other key fails
          // jwt.verify → verifyToken returns null → !user → rejection.
          expect(res.status).toBe(route.expectedNoAuthStatus);
          expect([401, 403]).toContain(res.status);
        });
      }
    });
  }
});

describe('AUTH-01 — logout-blacklisted canonical token rejected uniformly (Pitfall 6: revocation extends across the whole surface)', () => {
  // Per plan Task 1 step 4: a canonical token, blacklisted via the exported
  // tokenBlacklist API, must be rejected on a canonical route (blacklist GET) AND on
  // generate-article (the historically duplicate-guard route) — proves the swap to
  // getAuthUser extends the logout blacklist check the duplicates skipped.
  beforeEach(() => {
    // The blacklist is module-level in-memory state shared across tests in a file
    // (vitest fileParallelism:false). Each test below uses a fresh token; we also
    // expire any prior entries by signing short-lived tokens — no reset hook exists
    // for tokenBlacklist, but a distinct token per test sidesteps cross-contamination.
  });

  it('rejects a logout-blacklisted canonical admin token on cms/blacklist GET', async () => {
    const route = ROUTES.find((r) => r.routeFile.endsWith('cms/blacklist/route.ts') && r.verb === 'GET')!;
    const blacklistedToken = jwt.sign(
      { userId: 2, username: 'logged-out-admin', role: 'admin' },
      CANONICAL_TEST_SECRET,
      { expiresIn: '1h' }
    );
    blacklistToken(blacklistedToken);

    const req = new Request(`http://localhost${route.path}`, {
      method: 'GET',
      headers: { Authorization: bearer(blacklistedToken) },
    });
    const res = await route.handler(req);
    expect(res.status).toBe(route.expectedNoAuthStatus);
  });

  it('rejects the SAME logout-blacklisted canonical admin token on cms/ai/generate-article (Pitfall 6)', async () => {
    const route = ROUTES.find((r) => r.routeFile.endsWith('cms/ai/generate-article/route.ts') && r.verb === 'POST')!;
    const blacklistedToken = jwt.sign(
      { userId: 3, username: 'logged-out-editor', role: 'editor' },
      CANONICAL_TEST_SECRET,
      { expiresIn: '1h' }
    );
    blacklistToken(blacklistedToken);

    const req = new Request(`http://localhost${route.path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: bearer(blacklistedToken),
      },
      body: JSON.stringify({}),
    });
    const res = await route.handler(req);
    expect(res.status).toBe(route.expectedNoAuthStatus);
  });

  it('control: a fresh canonical admin token is NOT rejected on cms/blacklist GET (sanity — proves the rejection above is the blacklist, not a misconfiguration)', async () => {
    const route = ROUTES.find((r) => r.routeFile.endsWith('cms/blacklist/route.ts') && r.verb === 'GET')!;
    // D-15: the async guard now looks up the principal in the DB, so the control
    // principal must be a real, active user — otherwise the guard would reject it
    // for the wrong reason (missing user) and the sanity assertion would be vacuous.
    await connectToDatabase();
    const freshAdmin = await UserModel.create({
      username: `fresh-admin-${Date.now()}-${Math.random()}`,
      password_hash: 'irrelevant-not-used-in-this-test',
      role: 'admin',
      status: 'active',
    });
    const freshToken = jwt.sign(
      { userId: freshAdmin._id.toString(), username: freshAdmin.username, role: 'admin' },
      CANONICAL_TEST_SECRET,
      { expiresIn: '1h' }
    );
    // Note: do NOT call blacklistToken() for the fresh token.

    const req = new Request(`http://localhost${route.path}`, {
      method: 'GET',
      headers: { Authorization: bearer(freshToken) },
    });
    const res = await route.handler(req);
    // An unblacklisted canonical token passes the auth guard — the handler then
    // runs its body (here, a DB read). The status is NOT the rejection code.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
