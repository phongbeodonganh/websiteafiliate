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
 * The guard is called directly through the real route handlers, matching the
 * convention in tests/api/auth-logout.test.ts and articles-ownership.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as articlesHandler } from '@/app/api/v1/cms/articles/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';

function authedRequest(url: string, token: string): Request {
  return new Request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
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
