import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as affiliateLinksHandler } from '@/app/api/v1/cms/affiliate-links/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';

async function seedTokenForUser(role: 'admin' | 'editor' | 'author' = 'admin') {
  await connectToDatabase();
  const user = await UserModel.create({
    username: `user-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role,
    status: 'active',
  });
  return signToken({ userId: user._id.toString(), username: user.username, role });
}

function authedRequest(url: string, token?: string, method = 'GET') {
  return new Request(url, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('POST /api/v1/auth/logout (SEC-06 token revocation)', () => {
  it('a valid token works before logout, and stops working immediately after logout', async () => {
    const token = await seedTokenForUser();

    const before = await affiliateLinksHandler(authedRequest('http://localhost/api/v1/cms/affiliate-links', token));
    expect(before.status).toBe(200);

    const logoutRes = await logoutHandler(authedRequest('http://localhost/api/v1/auth/logout', token, 'POST'));
    expect(logoutRes.status).toBe(200);

    const after = await affiliateLinksHandler(authedRequest('http://localhost/api/v1/cms/affiliate-links', token));
    expect(after.status).toBe(401);
  });

  it('a fresh token from a new login is unaffected by another token being blacklisted', async () => {
    const tokenA = await seedTokenForUser();
    const tokenB = await seedTokenForUser();

    await logoutHandler(authedRequest('http://localhost/api/v1/auth/logout', tokenA, 'POST'));

    const res = await affiliateLinksHandler(authedRequest('http://localhost/api/v1/cms/affiliate-links', tokenB));
    expect(res.status).toBe(200);
  });

  it('rejects logout without a Bearer token', async () => {
    const res = await logoutHandler(authedRequest('http://localhost/api/v1/auth/logout', undefined, 'POST'));
    expect(res.status).toBe(401);
  });

  it('rejects logout with a malformed token', async () => {
    const res = await logoutHandler(
      authedRequest('http://localhost/api/v1/auth/logout', 'garbage.not-a-real-token', 'POST')
    );
    expect(res.status).toBe(401);
  });
});
