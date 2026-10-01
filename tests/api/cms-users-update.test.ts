/**
 * AUTH-04 / D-14 — user management via `PUT /api/v1/cms/users/:id`.
 *
 * Pins the contract that completes user management:
 *   - An admin can update `role`, `status`, `name`, and `avatar`; all four persist.
 *   - `avatar` is returned in the success response (it was previously omitted).
 *   - `password` is NOT accepted or applied: a password-only PUT leaves
 *     `password_hash` unchanged (password recovery stays CLI-only, Phase 1 D-04).
 *   - A non-admin token is rejected with 403 (route enforcement, not UI hiding).
 *   - A missing user id returns 404.
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { signToken, hashPassword } from '@/lib/auth';
import { PUT as putUser } from '@/app/api/v1/cms/users/[id]/route';

async function seedScenario() {
  await connectToDatabase();

  const admin = await UserModel.create({
    username: 'the-admin',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  const target = await UserModel.create({
    username: 'target-editor',
    password_hash: await hashPassword('original-secret'),
    role: 'editor',
    status: 'active',
    name: 'Target Editor',
    avatar: 'T',
  });
  const editor = await UserModel.create({
    username: 'plain-editor',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'editor',
    status: 'active',
  });

  const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
  const editorToken = signToken({ userId: editor._id.toString(), username: editor.username, role: 'editor' });

  return { admin, target, adminToken, editorToken };
}

function jsonRequest(token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/users/x', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PUT /api/v1/cms/users/:id — role/status/name/avatar (AUTH-04, D-14)', () => {
  it('updates and persists role, status, name, and avatar, returning all four', async () => {
    const { target, adminToken } = await seedScenario();

    const res = await putUser(
      jsonRequest(adminToken, {
        name: 'Renamed Editor',
        role: 'author',
        status: 'inactive',
        avatar: 'RE',
      }),
      params(target._id.toString())
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.name).toBe('Renamed Editor');
    expect(json.data.role).toBe('author');
    expect(json.data.status).toBe('inactive');
    expect(json.data.avatar).toBe('RE');
    expect(json.data).not.toHaveProperty('password');
    expect(json.data).not.toHaveProperty('password_hash');

    const persisted = await UserModel.findById(target._id);
    expect(persisted?.name).toBe('Renamed Editor');
    expect(persisted?.role).toBe('author');
    expect(persisted?.status).toBe('inactive');
    expect(persisted?.avatar).toBe('RE');
  });

  it('ignores a password field — password_hash is unchanged and no password is returned', async () => {
    const { target, adminToken } = await seedScenario();
    const before = await UserModel.findById(target._id);

    const res = await putUser(
      jsonRequest(adminToken, { password: 'attacker-chosen-password' }),
      params(target._id.toString())
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).not.toHaveProperty('password');
    expect(json.data).not.toHaveProperty('password_hash');

    const after = await UserModel.findById(target._id);
    expect(after?.password_hash).toBe(before?.password_hash);
  });

  it('rejects a non-admin token with 403 and leaves the target untouched', async () => {
    const { target, editorToken } = await seedScenario();

    const res = await putUser(
      jsonRequest(editorToken, { role: 'admin' }),
      params(target._id.toString())
    );
    expect(res.status).toBe(403);

    const persisted = await UserModel.findById(target._id);
    expect(persisted?.role).toBe('editor');
  });

  it('returns 404 for a missing user id', async () => {
    const { adminToken } = await seedScenario();

    const res = await putUser(
      jsonRequest(adminToken, { name: 'Ghost' }),
      params('507f1f77bcf86cd799439011')
    );
    expect(res.status).toBe(404);
  });
});
