/**
 * AFF-04 / D-05 — the Google Sheet import returns immediately and schedules the
 * sweep after the response.
 *
 * Proves:
 *   - The import POST persists rows and returns `{ status:'success', data:{ totalImported } }`
 *     WITHOUT awaiting the sweep. No `totalSweptCampaigns` is promised synchronously.
 *   - The scheduled sweep runs via the `scheduleAfterResponse` fallback path (no
 *     request scope in a direct route-handler test) and marks a matching active link
 *     blacklisted after the background promise settles — and the import does NOT
 *     throw E468 / "outside a request scope".
 *
 * The D-08 re-sweep route cases are added in Task 2.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { POST as importSheetPOST } from '@/app/api/v1/cms/blacklist/import-sheet-url/route';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/ABC123/edit#gid=0';
const CSV_BODY = [
  'Project Name,Website URL,Reason,Blocked Countries',
  'BadSite,https://badsite.com/,Bắt Ads - Không trả tiền,',
].join('\n');

async function seedActiveUser(role: 'admin' | 'editor' = 'admin') {
  await connectToDatabase();
  const user = await UserModel.create({
    username: `import-async-${role}-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role,
    status: 'active',
  });
  return signToken({ userId: user._id.toString(), username: user.username, role });
}

function importRequest(token?: string, sheetUrl: string = SHEET_URL) {
  return new Request('http://localhost/api/v1/cms/blacklist/import-sheet-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sheetUrl }),
  });
}

describe('POST /api/v1/cms/blacklist/import-sheet-url — non-blocking import (D-05)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns immediately with a numeric totalImported (no synchronous swept count)', async () => {
    const token = await seedActiveUser('admin');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(CSV_BODY, { status: 200, headers: { 'Content-Type': 'text/csv' } })
    );

    const res = await importSheetPOST(importRequest(token) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(typeof json.data.totalImported).toBe('number');
    expect(json.data.totalImported).toBe(1);
    // D-05: the response does NOT promise a final swept count synchronously.
    expect(json.data).not.toHaveProperty('totalSweptCampaigns');

    // The row was persisted.
    expect(await BlacklistModel.countDocuments({ extracted_domain: 'badsite.com' })).toBe(1);
  });

  it('schedules the sweep post-response — a matching active link flips blacklisted, and no E468 is thrown', async () => {
    const token = await seedActiveUser('admin');
    await connectToDatabase();
    const link = await AffiliateLinkModel.create({
      name: 'will-be-swept',
      base_url: 'https://badsite.com/x',
      status: 'active',
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(CSV_BODY, { status: 200, headers: { 'Content-Type': 'text/csv' } })
    );

    // If `after()` were called bare, this await would reject with E468.
    const res = await importSheetPOST(importRequest(token) as never);
    expect(res.status).toBe(200);

    // Let the fire-and-forget fallback promise settle.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect((await AffiliateLinkModel.findById(link._id))?.status).toBe('blacklisted');
  });
});
