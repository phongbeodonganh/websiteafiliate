import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';

async function seedUser() {
  await connectToDatabase();
  return UserModel.create({
    username: 'login-test-user',
    password_hash: await hashPassword('correct-password-123'),
    role: 'editor',
    status: 'active',
  });
}

function loginRequest(username: string, password: string) {
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
    expect(json.token.length).toBeGreaterThan(10);
    expect(json.user.username).toBe('login-test-user');
  });

  it('rejects an incorrect password with 401', async () => {
    await seedUser();

    const res = await loginHandler(loginRequest('login-test-user', 'wrong-password'));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.status).toBe('error');
    expect(json.token).toBeUndefined();
  });

  it('rejects a username that does not exist with 401', async () => {
    const res = await loginHandler(loginRequest('no-such-user', 'whatever'));
    expect(res.status).toBe(401);
  });
});
