/**
 * Phase 06 TRF-01 — GET/PUT /api/v1/cms/traffic/config contract.
 *
 * Pins:
 *   1. GET returns only masked strings (never a raw key), with per-key
 *      source (db|env|null) and the missing-env list.
 *   2. DB value wins over env; env is used when the DB field is empty.
 *   3. PUT with an empty string clears the stored key (source falls back
 *      to env/null); non-empty stores it; months outside 3–12 → 400.
 *   4. PUT invalidates all in-memory traffic caches (spy on
 *      clearAllTrafficCaches) so a rotated key can never be served from
 *      a stale cache keyed without the credential.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/traffic/caches', () => ({
  clearAllTrafficCaches: vi.fn(),
}));

import { clearAllTrafficCaches } from '@/lib/traffic/caches';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as trafficConfigGET, PUT as trafficConfigPUT } from '@/app/api/v1/cms/traffic/config/route';

const UNIQUE = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

async function seedUser(role: 'admin' | 'editor') {
  await connectToDatabase();
  const user = await UserModel.create({
    username: `traffic-config-${role}-${UNIQUE()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role,
    status: 'active',
  });
  return signToken({
    userId: user._id.toString(),
    username: user.username,
    role,
  });
}

function getRequest(token: string) {
  return new Request('http://localhost/api/v1/cms/traffic/config', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function putRequest(token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/traffic/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await connectToDatabase();
  await SettingModel.deleteMany({});
  await SettingModel.create({ traffic_tabapi_key: 'db-tabapi-secret-123456' });
});

describe('GET /api/v1/cms/traffic/config (TRF-01)', () => {
  it('trả về chỉ giá trị đã mask — không bao giờ lộ key thô', async () => {
    const token = await seedUser('admin');
    const res = await trafficConfigGET(getRequest(token));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    const raw = JSON.stringify(json);
    expect(raw).not.toContain('db-tabapi-secret-123456');
    expect(json.data.masked.tabApiKey).toBe('••••••3456');
    expect(json.data.source.tabApiKey).toBe('db');
    expect(json.data.months).toBe(3);
    expect(Array.isArray(json.data.missing)).toBe(true);
    expect(json.data.missing).toContain('SERPAPI_KEY');
  });

  it('fallback env khi DB trống (source env)', async () => {
    process.env.SERPAPI_KEY = 'env-serpapi-key-987654';
    try {
      const token = await seedUser('admin');
      const res = await trafficConfigGET(getRequest(token));
      const json = await res.json();

      expect(json.data.masked.serpApiKey).toBe('••••••7654');
      expect(json.data.source.serpApiKey).toBe('env');
      expect(JSON.stringify(json)).not.toContain('env-serpapi-key-987654');
    } finally {
      delete process.env.SERPAPI_KEY;
    }
  });

  it('non-admin nhận 403', async () => {
    const token = await seedUser('editor');
    const res = await trafficConfigGET(getRequest(token));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/cms/traffic/config (TRF-01)', () => {
  it('chuỗi rỗng xoá key DB — source fallback về env/null', async () => {
    process.env.TABAPI_KEY = '';
    try {
      delete process.env.TABAPI_KEY;
      const token = await seedUser('admin');
      const res = await trafficConfigPUT(putRequest(token, { tabApiKey: '' }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.status).toBe('success');
      expect(json.data.masked.tabApiKey).toBeNull();
      expect(json.data.source.tabApiKey).toBeNull();

      const stored = await SettingModel.findOne();
      expect(stored?.traffic_tabapi_key).toBe('');
    } finally {
      delete process.env.TABAPI_KEY;
    }
  });

  it('lưu key mới (mask trong phản hồi) và clear traffic caches', async () => {
    const token = await seedUser('admin');
    const res = await trafficConfigPUT(putRequest(token, { tabApiKey: 'fresh-key-abcdef42' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.masked.tabApiKey).toBe('••••••ef42');
    expect(json.data.source.tabApiKey).toBe('db');
    expect(JSON.stringify(json)).not.toContain('fresh-key-abcdef42');
    expect(clearAllTrafficCaches).toHaveBeenCalled();
  });

  it('months ngoài 3–12 → 400', async () => {
    const token = await seedUser('admin');
    const res = await trafficConfigPUT(putRequest(token, { months: 13 }));
    expect(res.status).toBe(400);
  });

  it('months hợp lệ được lưu', async () => {
    const token = await seedUser('admin');
    const res = await trafficConfigPUT(putRequest(token, { months: 6 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.months).toBe(6);
    const stored = await SettingModel.findOne();
    expect(stored?.traffic_months).toBe(6);
  });
});
