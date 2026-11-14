/**
 * Phase 06 TRF-02 / TRF-03 — POST/GET /api/v1/cms/traffic/domains (+[id], refresh).
 *
 * Pins:
 *   1. POST add&run: normalizes the domain, fetches via the ported getTraffic
 *      (24h in-memory cache) and upserts a TrafficDomain row — a duplicate
 *      domain updates the same document instead of duplicating it.
 *   2. Missing TabAPI credential → 500 missing_api_key and the fetch stub is
 *      NEVER called (no upstream attempt without a resolved credential).
 *   3. Upstream 402 passes through with code insufficient_credits + the
 *      Vietnamese message from the ported tabapi lib.
 *   4. POST refresh uses force:true — it bypasses the cache read (a fresh
 *      fetch happens even with a warm cache) and updates lastFetchedAt; on
 *      upstream failure the previous report stays intact and lastError is set.
 *   5. GET [id] serves the stored report with zero fetch calls.
 *   6. DELETE removes the row.
 *
 * All upstream traffic goes through a stubbed global fetch (the route calls
 * getTraffic without an explicit fetchImpl, which defaults to global fetch) —
 * zero real network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllTrafficCaches } from '@/lib/traffic/caches';
import { clearTrafficCache } from '@/lib/traffic/tabapi';
import { SettingModel, TrafficDomainModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db/mongodb';
import { trafficFixture } from '../lib/traffic/fixture';
import { GET as domainsGET, POST as domainsPOST } from '@/app/api/v1/cms/traffic/domains/route';
import { GET as domainGET, DELETE as domainDELETE } from '@/app/api/v1/cms/traffic/domains/[id]/route';
import { POST as refreshPOST } from '@/app/api/v1/cms/traffic/domains/[id]/refresh/route';

const UNIQUE = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
const TABAPI_KEY = 'test-tabapi-key-abcdef123456';

let token = '';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonRequest(method: string, body?: Record<string, unknown>) {
  return new Request(`http://localhost/api/v1/cms/traffic/domains${body ? '' : ''}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function idRequest(method: string, id: string) {
  return new Request(`http://localhost/api/v1/cms/traffic/domains/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
}

async function seedAdmin() {
  await connectToDatabase();
  const user = await UserModel.create({
    username: `traffic-domains-${UNIQUE()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  token = signToken({
    userId: user._id.toString(),
    username: user.username,
    role: 'admin',
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  await connectToDatabase();
  await SettingModel.deleteMany({});
  await TrafficDomainModel.deleteMany({});
  clearAllTrafficCaches();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(() => jsonResponse(trafficFixture));
  await seedAdmin();
  await SettingModel.create({ traffic_tabapi_key: TABAPI_KEY });
});

afterEach(() => {
  vi.unstubAllGlobals();
  token = '';
  clearTrafficCache();
});

describe('POST /api/v1/cms/traffic/domains (add & run, TRF-02)', () => {
  it('lưu báo cáo vào TrafficDomain (happy path)', async () => {
    const res = await domainsPOST(jsonRequest('POST', { domain: 'https://vercel.com' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.domain).toBe('vercel.com');
    expect(json.data.report).toEqual(trafficFixture);
    expect(json.data.lastFetchedAt).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const stored = await TrafficDomainModel.findOne({ domain: 'vercel.com' });
    expect(stored).not.toBeNull();
    expect(stored!.report).toEqual(trafficFixture);
    expect(stored!.lastError).toBeNull();
  });

  it('domain trùng lặp → upsert (vẫn 1 document)', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const res = await domainsPOST(jsonRequest('POST', { domain: 'https://vercel.com/' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(await TrafficDomainModel.countDocuments()).toBe(1);
    expect(json.data.domain).toBe('vercel.com');
  });

  it('domain không hợp lệ → 400 invalid_domain với thông điệp tiếng Việt', async () => {
    const res = await domainsPOST(jsonRequest('POST', { domain: 'không phải domain!!' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('invalid_domain');
    expect(json.message).toContain('tên miền');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('thiếu TABAPI key → 500 missing_api_key, không gọi upstream', async () => {
    await SettingModel.deleteMany({});
    delete process.env.TABAPI_KEY;

    const res = await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error.code).toBe('missing_api_key');
    expect(json.message).toContain('TABAPI_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('upstream 402 → passthrough insufficient_credits + thông điệp tiếng Việt', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({ error: { code: 'insufficient_credits', message: 'out of credits' } }, 402)
    );

    const res = await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.error.code).toBe('insufficient_credits');
    expect(json.message).toBe('Tài khoản TabAPI không đủ credits.');
    expect(await TrafficDomainModel.countDocuments()).toBe(0);
  });
});

describe('GET /api/v1/cms/traffic/domains/[id] (TRF-03)', () => {
  it('phục vụ báo cáo đã lưu — zero fetch calls', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    fetchMock.mockClear();

    const row = await TrafficDomainModel.findOne({ domain: 'vercel.com' });
    const res = await domainGET(idRequest('GET', row!._id.toString()), {
      params: Promise.resolve({ id: row!._id.toString() }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.report).toEqual(trafficFixture);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('id không hợp lệ → 400', async () => {
    const res = await domainGET(idRequest('GET', 'not-an-id'), {
      params: Promise.resolve({ id: 'not-an-id' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/cms/traffic/domains/[id]/refresh (TRF-03)', () => {
  it('force bypass cache — fetch lại và cập nhật lastFetchedAt', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const before = (await TrafficDomainModel.findOne({ domain: 'vercel.com' }))!.lastFetchedAt as Date;

    const updated = { ...trafficFixture, overview: { ...trafficFixture.overview, visits: 42_000_000 } };
    fetchMock.mockImplementation(() => jsonResponse(updated));

    const row = await TrafficDomainModel.findOne({ domain: 'vercel.com' });
    const res = await refreshPOST(idRequest('POST', `${row!._id.toString()}/refresh`), {
      params: Promise.resolve({ id: row!._id.toString() }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.report.overview.visits).toBe(42_000_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Date(json.data.lastFetchedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('upstream lỗi → giữ nguyên report cũ, lưu lastError', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    fetchMock.mockImplementation(() =>
      jsonResponse({ error: { code: 'insufficient_credits', message: 'out of credits' } }, 402)
    );

    const row = await TrafficDomainModel.findOne({ domain: 'vercel.com' });
    const res = await refreshPOST(idRequest('POST', `${row!._id.toString()}/refresh`), {
      params: Promise.resolve({ id: row!._id.toString() }),
    });
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.error.code).toBe('insufficient_credits');

    const stored = await TrafficDomainModel.findOne({ domain: 'vercel.com' });
    expect(stored!.report).toEqual(trafficFixture);
    expect(stored!.lastError?.code).toBe('insufficient_credits');
    expect(stored!.lastError?.message).toContain('credits');
  });
});

describe('DELETE /api/v1/cms/traffic/domains/[id] (TRF-03)', () => {
  it('xoá row', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const row = await TrafficDomainModel.findOne({ domain: 'vercel.com' });

    const res = await domainDELETE(idRequest('DELETE', row!._id.toString()), {
      params: Promise.resolve({ id: row!._id.toString() }),
    });
    expect(res.status).toBe(200);
    expect(await TrafficDomainModel.countDocuments()).toBe(0);
  });
});

describe('GET /api/v1/cms/traffic/domains (danh sách, TRF-03)', () => {
  it('trả về danh sách row kèm report', async () => {
    await domainsPOST(jsonRequest('POST', { domain: 'vercel.com' }));
    const res = await domainsGET(jsonRequest('GET'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].domain).toBe('vercel.com');
    expect(json.data[0].report).toEqual(trafficFixture);
  });
});
