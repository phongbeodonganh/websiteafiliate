import { describe, expect, it } from 'vitest';
import { signToken } from '@/lib/auth';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { POST as postHandler } from '@/app/api/v1/cms/affiliate-links/route';
import { PUT as putHandler } from '@/app/api/v1/cms/affiliate-links/[id]/route';

async function adminToken() {
  await connectToDatabase();
  const admin = await UserModel.create({
    username: `duplicate-admin-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'admin',
    status: 'active',
  });
  return signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
}

function postRequest(token: string, base_url: string) {
  return new Request('http://localhost/api/v1/cms/affiliate-links', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Campaign', base_url }),
  });
}

function putRequest(token: string, id: string, base_url: string) {
  return new Request(`http://localhost/api/v1/cms/affiliate-links/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_url }),
  });
}

describe('affiliate tracking URL uniqueness', () => {
  it('returns 409 and does not insert the same normalized URL twice', async () => {
    const token = await adminToken();
    const first = await postHandler(postRequest(token, 'https://EXAMPLE.com:443/?b=2&a=1'));
    expect(first.status).toBe(201);

    const duplicate = await postHandler(postRequest(token, ' https://example.com/?a=1&b=2 '));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ status: 'error', code: 'AFFILIATE_URL_EXISTS' });
    expect(await AffiliateLinkModel.countDocuments()).toBe(1);
  });

  it('rejects duplicate URLs when updating a different campaign', async () => {
    const token = await adminToken();
    const first = await postHandler(postRequest(token, 'https://first.example.com/offer'));
    const second = await postHandler(postRequest(token, 'https://second.example.com/offer'));
    const firstBody = await first.json();
    const secondBody = await second.json();

    const duplicate = await putHandler(
      putRequest(token, secondBody.data.id, 'https://first.example.com/offer'),
      { params: Promise.resolve({ id: secondBody.data.id }) }
    );
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: 'AFFILIATE_URL_EXISTS', existingId: firstBody.data.id });

    const unchanged = await AffiliateLinkModel.findById(secondBody.data.id);
    expect(unchanged?.base_url).toBe('https://second.example.com/offer');
  });

  it('allows idempotently saving the URL on the same campaign', async () => {
    const token = await adminToken();
    const created = await postHandler(postRequest(token, 'https://same.example.com/?z=9&a=1'));
    const body = await created.json();

    const updated = await putHandler(
      putRequest(token, body.data.id, 'https://SAME.example.com:443/?a=1&z=9'),
      { params: Promise.resolve({ id: body.data.id }) }
    );
    expect(updated.status).toBe(200);
    expect(await AffiliateLinkModel.countDocuments()).toBe(1);
  });

  it('keeps the database unique under concurrent batch-style requests', async () => {
    const token = await adminToken();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        postHandler(postRequest(token, 'https://batch.example.com/offer?ref=abc'))
      )
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(4);
    expect(await AffiliateLinkModel.countDocuments()).toBe(1);
  });
});
