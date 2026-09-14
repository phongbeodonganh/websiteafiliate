import { describe, expect, it } from 'vitest';
import { signToken } from '@/lib/auth';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { POST as postHandler } from '@/app/api/v1/cms/affiliate-links/route';
import { isHttpUrl } from '@/lib/seo';

// AFF-01: base_url/product_url are restricted to http(s) at the CMS write boundary.
// Handlers invoked directly (tracking-redirect.test.ts convention) with a Bearer token
// signed by the canonical test secret from tests/setup.ts (via signToken).

async function seedAdmin() {
  await connectToDatabase();
  const admin = await UserModel.create({
    username: `admin-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant',
    role: 'admin',
    status: 'active',
  });
  const token = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
  return { admin, token };
}

function postRequest(token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/affiliate-links', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('isHttpUrl (AFF-01 strict helper)', () => {
  it('accepts http/https in any case with surrounding whitespace', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('HTTP://EXAMPLE.COM')).toBe(true);
    expect(isHttpUrl('  https://example.com  ')).toBe(true);
  });

  it('rejects non-http(s) schemes and unparseable values', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,<h1>x</h1>')).toBe(false);
    expect(isHttpUrl('ftp://x')).toBe(false);
    expect(isHttpUrl('not-a-url')).toBe(false);
    expect(isHttpUrl('//protocol-relative.example')).toBe(false);
  });
});

describe('POST /api/v1/cms/affiliate-links — scheme validation (AFF-01)', () => {
  it('accepts valid http(s) base_url values and stores them verbatim (no normalization on write)', async () => {
    const { token } = await seedAdmin();

    const accepted = [
      'https://example.com',
      'http://example.com',
      'HTTP://EXAMPLE.COM', // WHATWG URL lowercases the protocol, so uppercase passes
      ' https://example.com ', // whitespace is trimmed before parsing, stored verbatim
    ];

    for (const base_url of accepted) {
      const res = await postHandler(postRequest(token, { name: 'Campaign', base_url }));
      expect(res.status).toBe(201);

      const payload = await res.json();
      const stored = await AffiliateLinkModel.findById(payload.data.id);
      expect(stored?.base_url).toBe(base_url); // accept/reject only — never mutated
    }
  });

  it('rejects every non-http(s) or unparseable base_url with 400 and writes nothing', async () => {
    const { token } = await seedAdmin();

    const rejected = [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'ftp://x',
      'not-a-url',
      '//protocol-relative.example',
    ];

    for (const base_url of rejected) {
      const before = await AffiliateLinkModel.countDocuments();

      const res = await postHandler(postRequest(token, { name: 'Campaign', base_url }));
      expect(res.status).toBe(400);

      const payload = await res.json();
      expect(payload.status).toBe('error');

      const after = await AffiliateLinkModel.countDocuments();
      expect(after).toBe(before); // DB unchanged
    }
  });

  it('validates product_url by the same http(s) rule when provided (Jina scrape target)', async () => {
    const { token } = await seedAdmin();

    const before = await AffiliateLinkModel.countDocuments();

    const res = await postHandler(
      postRequest(token, {
        name: 'Campaign',
        base_url: 'https://store.example.com',
        product_url: 'javascript:alert(1)',
      })
    );
    expect(res.status).toBe(400);

    const after = await AffiliateLinkModel.countDocuments();
    expect(after).toBe(before);
  });

  it('keeps the pre-existing required-field 400 for a missing/empty base_url', async () => {
    const { token } = await seedAdmin();

    const before = await AffiliateLinkModel.countDocuments();

    const missing = await postHandler(postRequest(token, { name: 'Campaign' }));
    expect(missing.status).toBe(400);

    const empty = await postHandler(postRequest(token, { name: 'Campaign', base_url: '' }));
    expect(empty.status).toBe(400);

    const after = await AffiliateLinkModel.countDocuments();
    expect(after).toBe(before);
  });
});
