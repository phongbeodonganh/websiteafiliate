/**
 * AUTH-04 / D-15 — DB-backed auth guard regression matrix.
 *
 * Proves the canonical `getAuthUser` guard is async and enforces live database
 * state, not merely a valid signature:
 *   - a valid token for an existing but `inactive` user is rejected immediately
 *     (the account is locked out on the next request, not at 24h token expiry);
 *   - a valid token whose user document no longer exists is rejected (A1 — a
 *     deleted account cannot ride out its token lifetime);
 *   - a token carrying a malformed/non-ObjectId userId fails closed with the
 *     route's normal 401/403 — never a Mongoose CastError leaking as a 500;
 *   - a valid token for an existing, active user still passes (no over-rejection).
 *
 * Task 2 expands the inactive-token proof across route classes (plain-guard read,
 * admin-only write, resource route, logout), pins that the check reads live DB
 * state (reactivation restores access), and adds a source-contract assertion that
 * every `getAuthUser(` call site under src/app/api/v1/** is awaited.
 *
 * The guard is called directly through the real route handlers, matching the
 * convention in tests/api/auth-logout.test.ts and articles-ownership.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as articlesHandler } from '@/app/api/v1/cms/articles/route';
import { GET as articleHandler } from '@/app/api/v1/cms/articles/[id]/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';
import { GET as dashboardHandler } from '@/app/api/v1/cms/dashboard/route';
import { POST as usersPostHandler } from '@/app/api/v1/cms/users/route';

const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011';

function authedRequest(url: string, token: string, method = 'GET'): Request {
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    init.headers = { ...(init.headers as Record<string, string>), 'Content-Type': 'application/json' };
    init.body = JSON.stringify({});
  }
  return new Request(url, init);
}

function params(id: string = DUMMY_OBJECT_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

async function seedUser(
  status: 'active' | 'inactive',
  role: 'admin' | 'editor' | 'author' = 'admin',
  username?: string,
) {
  await connectToDatabase();
  return UserModel.create({
    username: username ?? `guard-${status}-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role,
    status,
  });
}

describe('D-15 — getAuthUser rejects tokens whose DB user is inactive, missing, or malformed', () => {
  it('rejects an inactive user token with 401 on GET /api/v1/cms/articles and GET /api/v1/auth/me', async () => {
    const inactive = await seedUser('inactive');
    const token = signToken({
      userId: inactive._id.toString(),
      username: inactive.username,
      role: 'admin',
    });

    const articlesRes = await articlesHandler(authedRequest('http://localhost/api/v1/cms/articles', token));
    expect(articlesRes.status).toBe(401);

    const meRes = await meHandler(authedRequest('http://localhost/api/v1/auth/me', token));
    expect(meRes.status).toBe(401);
  });

  it('rejects a token for a user document that does not exist with 401 (deleted account, A1)', async () => {
    await connectToDatabase();
    const missingId = new Types.ObjectId().toString();
    const token = signToken({ userId: missingId, username: 'deleted-admin', role: 'admin' });

    const articlesRes = await articlesHandler(authedRequest('http://localhost/api/v1/cms/articles', token));
    expect(articlesRes.status).toBe(401);

    const meRes = await meHandler(authedRequest('http://localhost/api/v1/auth/me', token));
    expect(meRes.status).toBe(401);
  });

  it('fails closed on a malformed/non-ObjectId userId with 401 — never a 500 (CastError closure)', async () => {
    // userId is a non-ObjectId literal that no user could ever have. `findById`
    // would throw CastError if unguarded, which a route calling the guard outside
    // a try/catch (e.g. insider/send-now) would surface as a 500.
    const token = signToken({ userId: 'not-an-object-id', username: 'legacy-admin', role: 'admin' });

    const articlesRes = await articlesHandler(authedRequest('http://localhost/api/v1/cms/articles', token));
    expect([401, 403]).toContain(articlesRes.status);
    expect(articlesRes.status).not.toBe(500);

    const meRes = await meHandler(authedRequest('http://localhost/api/v1/auth/me', token));
    expect([401, 403]).toContain(meRes.status);
    expect(meRes.status).not.toBe(500);
  });

  it('does NOT reject a valid token for an existing, active user (no over-rejection regression)', async () => {
    const active = await seedUser('active');
    const token = signToken({
      userId: active._id.toString(),
      username: active.username,
      role: 'admin',
    });

    const res = await articlesHandler(authedRequest('http://localhost/api/v1/cms/articles', token));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});

describe('D-15 — inactive lockout holds across route classes', () => {
  it('rejects an inactive token on the plain-guard admin read GET /cms/dashboard → 401', async () => {
    const inactive = await seedUser('inactive');
    const token = signToken({ userId: inactive._id.toString(), username: inactive.username, role: 'admin' });

    const res = await dashboardHandler(authedRequest('http://localhost/api/v1/cms/dashboard', token));
    expect(res.status).toBe(401);
  });

  it('rejects an inactive admin token on the admin-only write POST /cms/users → 403 (guard, not role)', async () => {
    // Seed the inactive user as admin so the combined `!user || role !== 'admin'`
    // guard rejects ONLY because the DB status lookup returned null — the role
    // check alone would have passed.
    const inactiveAdmin = await seedUser('inactive', 'admin');
    const token = signToken({
      userId: inactiveAdmin._id.toString(),
      username: inactiveAdmin.username,
      role: 'admin',
    });

    const res = await usersPostHandler(authedRequest('http://localhost/api/v1/cms/users', token, 'POST'));
    expect(res.status).toBe(403);
  });

  it('rejects an inactive token on the resource route GET /cms/articles/:id → 401', async () => {
    const inactive = await seedUser('inactive');
    const token = signToken({ userId: inactive._id.toString(), username: inactive.username, role: 'admin' });

    const res = await articleHandler(
      authedRequest(`http://localhost/api/v1/cms/articles/${DUMMY_OBJECT_ID}`, token),
      params(),
    );
    expect(res.status).toBe(401);
  });

  it('rejects an inactive token on POST /api/v1/auth/logout → 401', async () => {
    const inactive = await seedUser('inactive');
    const token = signToken({ userId: inactive._id.toString(), username: inactive.username, role: 'admin' });

    const res = await logoutHandler(authedRequest('http://localhost/api/v1/auth/logout', token, 'POST'));
    expect(res.status).toBe(401);
  });
});

describe('D-15 — reactivation restores access (check reads live DB state, not token-baked)', () => {
  it('a user rejected while inactive passes the guard after status flips to active', async () => {
    const user = await seedUser('inactive');
    const token = signToken({ userId: user._id.toString(), username: user.username, role: 'admin' });

    const before = await meHandler(authedRequest('http://localhost/api/v1/auth/me', token));
    expect(before.status).toBe(401);

    await UserModel.updateOne({ _id: user._id }, { $set: { status: 'active' } });

    // Same canonical token — the guard re-reads DB status on each request.
    const after = await meHandler(authedRequest('http://localhost/api/v1/auth/me', token));
    expect(after.status).toBe(200);
    const payload = await after.json();
    expect(payload.status).toBe('success');
    expect(payload.data.userId).toBe(user._id.toString());
  });
});

describe('D-15 — source contract: every getAuthUser( call site under src/app/api/v1/** is awaited', () => {
  function collectRouteFiles(rootRel: string): string[] {
    const root = join(process.cwd(), rootRel);
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry === 'route.ts') out.push(full);
      }
    };
    walk(root);
    return out.sort();
  }

  it('no route file calls getAuthUser( without await — an un-awaited call is a truthy Promise and silently disables auth', () => {
    const offenders = collectRouteFiles(join('src', 'app', 'api', 'v1'))
      .filter((f) => /(?<!await\s)getAuthUser\(req\)/.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(process.cwd() + sep, '').replace(/\\/g, '/'));

    expect(offenders, 'un-awaited getAuthUser( call sites — auth bypass regression').toEqual([]);
  });

  it('every route file that imports getAuthUser also awaits it (counter-vacuity guard)', () => {
    const routeFiles = collectRouteFiles(join('src', 'app', 'api', 'v1'));
    const importers = routeFiles.filter((f) => readFileSync(f, 'utf8').includes('getAuthUser('));
    expect(importers.length).toBeGreaterThan(0);
    for (const f of importers) {
      expect(readFileSync(f, 'utf8')).toContain('await getAuthUser(req)');
    }
  });
});
