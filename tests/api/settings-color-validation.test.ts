import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel, SettingModel } from '@/lib/db/models';
import { hashPassword, signToken } from '@/lib/auth';
import { PUT as settingsPutHandler } from '@/app/api/v1/cms/settings/route';

// SEC-03 / CONCERNS #11 — admin color-format validation at the settings
// write boundary. Invalid primary_color/accent_color values must be rejected
// with a 400 envelope naming the offending field AND leave the DB document
// unchanged. Valid hex values persist. Modeled on tests/api/auth-login.test.ts
// (seed user via UserModel + hashPassword, call the route handler directly
// with a Request).

async function seedAdminAndGetToken() {
  await connectToDatabase();
  const admin = await UserModel.create({
    username: 'settings-color-admin',
    password_hash: await hashPassword('password-123'),
    role: 'admin',
    status: 'active',
  });
  return signToken({
    userId: String(admin._id),
    username: admin.username,
    role: 'admin',
  });
}

function settingsPutRequest(body: Record<string, unknown>, token: string) {
  return new Request('http://localhost/api/v1/cms/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/v1/cms/settings — primary_color/accent_color hex validation (SEC-03)', () => {
  it('rejects an invalid primary_color with 400 and names the field', async () => {
    const token = await seedAdminAndGetToken();

    // Seed the current settings doc with a known-good color so we can prove
    // the DB is unchanged after the rejected PUT.
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { primary_color: '#111111' } },
      { upsert: true }
    );

    const res = await settingsPutHandler(
      settingsPutRequest({ primaryColor: 'red; } body{x}' }, token)
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe('error');
    // The envelope must name the offending field (the requirement literal).
    expect(String(json.message)).toMatch(/primary/i);

    // DB document MUST be unchanged — the rejected value never persisted.
    const after = await SettingModel.findOne({});
    expect(after?.primary_color).toBe('#111111');
  });

  it('rejects an invalid accent_color with 400 and names the field', async () => {
    const token = await seedAdminAndGetToken();
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { accent_color: '#abcdef' } },
      { upsert: true }
    );

    const res = await settingsPutHandler(
      settingsPutRequest({ accentColor: 'url(javascript:alert(1))' }, token)
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe('error');
    expect(String(json.message)).toMatch(/accent/i);

    const after = await SettingModel.findOne({});
    expect(after?.accent_color).toBe('#abcdef');
  });

  it('persists a valid hex primary_color (no false rejection)', async () => {
    const token = await seedAdminAndGetToken();
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { primary_color: '#000000' } },
      { upsert: true }
    );

    const res = await settingsPutHandler(
      settingsPutRequest({ primaryColor: '#0f172a' }, token)
    );

    expect(res.status).toBe(200);
    const after = await SettingModel.findOne({});
    expect(after?.primary_color).toBe('#0f172a');
  });

  it('persists a valid hex accent_color (no false rejection)', async () => {
    const token = await seedAdminAndGetToken();
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { accent_color: '#000000' } },
      { upsert: true }
    );

    const res = await settingsPutHandler(
      settingsPutRequest({ accentColor: '#f59e0b' }, token)
    );

    expect(res.status).toBe(200);
    const after = await SettingModel.findOne({});
    expect(after?.accent_color).toBe('#f59e0b');
  });

  it('leaves color fields untouched when absent from the body', async () => {
    const token = await seedAdminAndGetToken();
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { primary_color: '#112233', accent_color: '#aabbcc' } },
      { upsert: true }
    );

    // PUT a totally unrelated field; the colors must not change.
    const res = await settingsPutHandler(
      settingsPutRequest({ siteTitle: 'Unrelated Title' }, token)
    );
    expect(res.status).toBe(200);

    const after = await SettingModel.findOne({});
    expect(after?.primary_color).toBe('#112233');
    expect(after?.accent_color).toBe('#aabbcc');
  });
});
