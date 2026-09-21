/**
 * AUTH-03 / D-16 — affiliate-link management is admin-only; selection is not.
 *
 * Pins the RBAC contract on the affiliate-link routes:
 *   - POST/PUT/DELETE return 403 for editor and author tokens; the link document
 *     is unchanged after each rejected write.
 *   - The same verbs succeed for an admin token — proving the gate is role-based,
 *     not a blanket rejection.
 *   - GET remains permitted for editor/author tokens (200) — AUTH-03 hides
 *     management but still allows selecting an existing link to attach to an article.
 *
 * This is a regression pin, not a change: the routes already enforce admin-only
 * writes. If an assertion fails it is a real RBAC defect — fix the route, never
 * weaken the test (plan Task 2 step 3).
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as affLinksGET, POST as affLinksPOST } from '@/app/api/v1/cms/affiliate-links/route';
import { PUT as affLinkPUT, DELETE as affLinkDELETE } from '@/app/api/v1/cms/affiliate-links/[id]/route';

async function seedScenario() {
  await connectToDatabase();

  const admin = await UserModel.create({
    username: 'rbac-admin',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  const editor = await UserModel.create({
    username: 'rbac-editor',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'editor',
    status: 'active',
  });
  const author = await UserModel.create({
    username: 'rbac-author',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });

  const link = await AffiliateLinkModel.create({
    name: 'Original Campaign',
    base_url: 'https://example.com/original',
    product_url: 'https://example.com/original',
    commission: '15%',
    cookie: '30 Days',
  });

  const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
  const editorToken = signToken({ userId: editor._id.toString(), username: editor.username, role: 'editor' });
  const authorToken = signToken({ userId: author._id.toString(), username: author.username, role: 'author' });

  return { link, adminToken, editorToken, authorToken };
}

function jsonRequest(method: string, token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/affiliate-links/x', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const NEW_LINK_BODY = {
  name: 'Injected Campaign',
  base_url: 'https://example.com/injected',
  product_url: 'https://example.com/injected',
};

describe('AUTH-03 — non-admin tokens get 403 on affiliate-link management', () => {
  it('editor POST is rejected 403 and creates no link', async () => {
    const { editorToken } = await seedScenario();
    const before = await AffiliateLinkModel.countDocuments();

    const res = await affLinksPOST(jsonRequest('POST', editorToken, NEW_LINK_BODY));
    expect(res.status).toBe(403);

    expect(await AffiliateLinkModel.countDocuments()).toBe(before);
  });

  it('author POST is rejected 403 and creates no link', async () => {
    const { authorToken } = await seedScenario();
    const before = await AffiliateLinkModel.countDocuments();

    const res = await affLinksPOST(jsonRequest('POST', authorToken, NEW_LINK_BODY));
    expect(res.status).toBe(403);

    expect(await AffiliateLinkModel.countDocuments()).toBe(before);
  });

  it('editor PUT is rejected 403 and leaves the link unchanged', async () => {
    const { link, editorToken } = await seedScenario();

    const res = await affLinkPUT(
      jsonRequest('PUT', editorToken, { name: 'Hijacked Campaign' }),
      params(link._id.toString())
    );
    expect(res.status).toBe(403);

    const persisted = await AffiliateLinkModel.findById(link._id);
    expect(persisted?.name).toBe('Original Campaign');
  });

  it('author PUT is rejected 403 and leaves the link unchanged', async () => {
    const { link, authorToken } = await seedScenario();

    const res = await affLinkPUT(
      jsonRequest('PUT', authorToken, { base_url: 'https://evil.example.com' }),
      params(link._id.toString())
    );
    expect(res.status).toBe(403);

    const persisted = await AffiliateLinkModel.findById(link._id);
    expect(persisted?.base_url).toBe('https://example.com/original');
  });

  it('editor DELETE is rejected 403 and the link survives', async () => {
    const { link, editorToken } = await seedScenario();

    const res = await affLinkDELETE(jsonRequest('DELETE', editorToken, {}), params(link._id.toString()));
    expect(res.status).toBe(403);

    expect(await AffiliateLinkModel.findById(link._id)).not.toBeNull();
  });

  it('author DELETE is rejected 403 and the link survives', async () => {
    const { link, authorToken } = await seedScenario();

    const res = await affLinkDELETE(jsonRequest('DELETE', authorToken, {}), params(link._id.toString()));
    expect(res.status).toBe(403);

    expect(await AffiliateLinkModel.findById(link._id)).not.toBeNull();
  });

  it('editor/author GET remains permitted (200) — select-to-attach is allowed', async () => {
    const { editorToken, authorToken } = await seedScenario();

    const editorRes = await affLinksGET(
      new Request('http://localhost/api/v1/cms/affiliate-links', {
        method: 'GET',
        headers: { Authorization: `Bearer ${editorToken}` },
      })
    );
    expect(editorRes.status).toBe(200);

    const authorRes = await affLinksGET(
      new Request('http://localhost/api/v1/cms/affiliate-links', {
        method: 'GET',
        headers: { Authorization: `Bearer ${authorToken}` },
      })
    );
    expect(authorRes.status).toBe(200);
  });
});

describe('AUTH-03 — the same verbs succeed for an admin token (role-based gate, not blanket)', () => {
  it('admin POST creates a link (201)', async () => {
    const { adminToken } = await seedScenario();

    const res = await affLinksPOST(jsonRequest('POST', adminToken, NEW_LINK_BODY));
    expect(res.status).toBe(201);

    const created = await AffiliateLinkModel.findOne({ name: 'Injected Campaign' });
    expect(created).not.toBeNull();
  });

  it('admin PUT updates the link (200)', async () => {
    const { link, adminToken } = await seedScenario();

    const res = await affLinkPUT(
      jsonRequest('PUT', adminToken, { name: 'Admin Renamed' }),
      params(link._id.toString())
    );
    expect(res.status).toBe(200);

    const persisted = await AffiliateLinkModel.findById(link._id);
    expect(persisted?.name).toBe('Admin Renamed');
  });

  it('admin DELETE removes the link (200)', async () => {
    const { link, adminToken } = await seedScenario();

    const res = await affLinkDELETE(jsonRequest('DELETE', adminToken, {}), params(link._id.toString()));
    expect(res.status).toBe(200);

    expect(await AffiliateLinkModel.findById(link._id)).toBeNull();
  });
});
