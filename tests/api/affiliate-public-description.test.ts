import { describe, expect, it } from 'vitest';
import { signToken } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { POST, GET as cmsGet } from '@/app/api/v1/cms/affiliate-links/route';
import { PUT } from '@/app/api/v1/cms/affiliate-links/[id]/route';
import { GET as affiliatesGet } from '@/app/api/v1/public/affiliates/route';
import { GET as picksGet } from '@/app/api/v1/public/top-picks/route';

async function adminHeaders() {
  await connectToDatabase();
  const admin = await UserModel.create({ username: 'description-admin', password_hash: 'test', role: 'admin', status: 'active' });
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken({ userId: admin.id, username: admin.username, role: 'admin' })}` };
}

describe('affiliate short descriptions and private management terms', () => {
  it('saves and edits descriptions while exposing commission and cookie only through CMS', async () => {
    const headers = await adminHeaders();
    const response = await POST(new Request('http://localhost/api/v1/cms/affiliate-links', {
      method: 'POST', headers, body: JSON.stringify({ name: 'Example AI', base_url: 'https://example.com', description: '  AI tools for small teams.  ', commission: '25%', cookie: '90 Days', isTopPick: true }),
    }));
    expect(response.status).toBe(201);
    const { data: created } = await response.json();
    expect(created.description).toBe('AI tools for small teams.');
    const edited = await PUT(new Request(`http://localhost/api/v1/cms/affiliate-links/${created.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ description: 'Automation for growing teams.' }),
    }), { params: Promise.resolve({ id: created.id }) });
    expect(edited.status).toBe(200);
    const cms = await (await cmsGet(new Request('http://localhost/api/v1/cms/affiliate-links', { headers }))).json();
    expect(cms.data[0]).toMatchObject({ description: 'Automation for growing teams.', commission: '25%', cookie: '90 Days' });
    for (const response of [await affiliatesGet(new Request('http://localhost/api/v1/public/affiliates')), await picksGet()]) {
      const { data } = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].description).toBe('Automation for growing teams.');
      for (const key of ['commission', 'commissionRate', 'commission_rate', 'cookie', 'cookieDays', 'cookie_days']) expect(data[0]).not.toHaveProperty(key);
    }
  });

  it('rejects invalid descriptions without changing an existing campaign', async () => {
    const headers = await adminHeaders();
    const link = await AffiliateLinkModel.create({ name: 'Existing', base_url: 'https://example.com', description: 'Original' });
    for (const description of ['a'.repeat(301), { text: 'Invalid' }, null]) {
      const response = await PUT(new Request(`http://localhost/api/v1/cms/affiliate-links/${link.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ description }),
      }), { params: Promise.resolve({ id: link.id }) });
      expect(response.status).toBe(400);
    }
    expect((await AffiliateLinkModel.findById(link.id))?.description).toBe('Original');
  });

  it('keeps legacy campaigns with no description usable', async () => {
    await connectToDatabase();
    await AffiliateLinkModel.create({ name: 'Legacy', base_url: 'https://example.com', commission: '30%' });
    const { data } = await (await affiliatesGet(new Request('http://localhost/api/v1/public/affiliates'))).json();
    expect(data[0]).toMatchObject({ name: 'Legacy', description: '' });
    expect(data[0]).not.toHaveProperty('commission');
  });
});
