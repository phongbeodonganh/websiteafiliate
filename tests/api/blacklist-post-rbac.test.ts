/**
 * CR-03 — POST /api/v1/cms/blacklist is admin-only; non-admin principals cannot
 * trigger a global campaign sweep.
 *
 * Pins the RBAC contract on the most destructive blacklist write:
 *   - An editor/author POST is rejected with 401 (the sibling combined-guard
 *     contract identical to DELETE in the same file) and the retroactive sweep
 *     never runs — the seeded active campaign stays active.
 *   - An admin POST with the same body succeeds (200), the BlacklistModel
 *     document exists for the domain, and the matching campaign is swept
 *     to 'blacklisted'. This proves the gate is role-based, not a blanket
 *     rejection.
 *
 * If an assertion fails it is a real RBAC regression on the most destructive
 * endpoint in the CMS — fix the route, never weaken the test.
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, BlacklistModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { POST as blacklistPOST } from '@/app/api/v1/cms/blacklist/route';

async function seedScenario() {
  await connectToDatabase();

  // Unique suffix so parallel test runs do not collide on username or domain.
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testDomain = `badsite-${suffix}.com`;

  const admin = await UserModel.create({
    username: `bl-admin-${suffix}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  const editor = await UserModel.create({
    username: `bl-editor-${suffix}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'editor',
    status: 'active',
  });
  const author = await UserModel.create({
    username: `bl-author-${suffix}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });

  const campaign = await AffiliateLinkModel.create({
    name: `Campaign on ${testDomain}`,
    base_url: `https://${testDomain}/offer`,
    product_url: `https://${testDomain}/offer`,
    commission: '10%',
    cookie: '30 Days',
  });

  const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
  const editorToken = signToken({ userId: editor._id.toString(), username: editor.username, role: 'editor' });
  const authorToken = signToken({ userId: author._id.toString(), username: author.username, role: 'author' });

  const body = { websiteUrl: `https://${testDomain}`, reason: 'x' };

  return { testDomain, campaign, adminToken, editorToken, authorToken, body };
}

function jsonRequest(method: string, token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/blacklist', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe('CR-03 — non-admin POST /cms/blacklist is rejected and no sweep runs', () => {
  it('editor POST is rejected 401 and the seeded campaign stays active', async () => {
    const { campaign, editorToken, body } = await seedScenario();

    const res = await blacklistPOST(jsonRequest('POST', editorToken, body));
    expect(res.status).toBe(401);

    const envelope = await res.json();
    expect(envelope.status).toBe('error');

    // sweepRetroactiveBlacklist never executed — campaign unchanged.
    const persisted = await AffiliateLinkModel.findById(campaign._id);
    expect(persisted?.status).toBe('active');
  });

  it('author POST is rejected 401 and the seeded campaign stays active', async () => {
    const { campaign, authorToken, body } = await seedScenario();

    const res = await blacklistPOST(jsonRequest('POST', authorToken, body));
    expect(res.status).toBe(401);

    const envelope = await res.json();
    expect(envelope.status).toBe('error');

    const persisted = await AffiliateLinkModel.findById(campaign._id);
    expect(persisted?.status).toBe('active');
  });
});

describe('CR-03 — admin POST succeeds and sweeps matching campaigns (role-based gate, not blanket)', () => {
  it('admin POST creates a blacklist entry and flips the matching campaign to blacklisted', async () => {
    const { testDomain, campaign, adminToken, body } = await seedScenario();

    const res = await blacklistPOST(jsonRequest('POST', adminToken, body));
    expect(res.status).toBe(200);

    const envelope = await res.json();
    expect(envelope.status).toBe('success');

    // BlacklistModel document exists for this domain.
    const entry = await BlacklistModel.findOne({ extracted_domain: testDomain });
    expect(entry).not.toBeNull();

    // The sweep ran and flipped the matching campaign.
    const persisted = await AffiliateLinkModel.findById(campaign._id);
    expect(persisted?.status).toBe('blacklisted');
  });
});
