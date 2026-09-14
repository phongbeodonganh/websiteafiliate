import { describe, expect, it } from 'vitest';
import { signToken } from '@/lib/auth';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { POST as postHandler } from '@/app/api/v1/cms/affiliate-links/route';
import { PUT as putHandler } from '@/app/api/v1/cms/affiliate-links/[id]/route';
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

async function seedLink(base_url = 'https://existing.example.com/offer') {
  await connectToDatabase();
  return AffiliateLinkModel.create({
    name: 'Existing Campaign',
    base_url,
    commission: '10%',
    cookie: '30 ngày',
    status: 'active',
  });
}

function postRequest(token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/affiliate-links', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function putRequest(token: string, id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/v1/cms/affiliate-links/${id}`, {
    method: 'PUT',
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

describe('PUT /api/v1/cms/affiliate-links/[id] — scheme validation (AFF-01)', () => {
  it('accepts an update to a valid https URL and stores it verbatim', async () => {
    const { token } = await seedAdmin();
    const link = await seedLink();

    const res = await putHandler(
      putRequest(token, link._id.toString(), { base_url: ' https://updated.example.com ' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.data.base_url).toBe(' https://updated.example.com ');

    const reloaded = await AffiliateLinkModel.findById(link._id);
    expect(reloaded?.base_url).toBe(' https://updated.example.com ');
  });

  it('rejects a scheme-carrying malicious base_url with 400 and leaves the stored document unchanged', async () => {
    const { token } = await seedAdmin();
    const link = await seedLink();

    const before = await AffiliateLinkModel.countDocuments();

    const res = await putHandler(
      putRequest(token, link._id.toString(), { base_url: 'javascript:alert(1)' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(res.status).toBe(400);

    const payload = await res.json();
    expect(payload.status).toBe('error');

    const reloaded = await AffiliateLinkModel.findById(link._id);
    expect(reloaded?.base_url).toBe('https://existing.example.com/offer'); // unchanged

    const after = await AffiliateLinkModel.countDocuments();
    expect(after).toBe(before); // no document created or deleted
  });

  it('rejects an unparseable base_url with 400 and leaves the stored document unchanged', async () => {
    const { token } = await seedAdmin();
    const link = await seedLink();

    const res = await putHandler(
      putRequest(token, link._id.toString(), { base_url: '//protocol-relative.example' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(res.status).toBe(400);

    const reloaded = await AffiliateLinkModel.findById(link._id);
    expect(reloaded?.base_url).toBe('https://existing.example.com/offer'); // unchanged
  });

  it('keeps partial-update semantics: a body without base_url proceeds unchanged', async () => {
    const { token } = await seedAdmin();
    const link = await seedLink();

    const res = await putHandler(
      putRequest(token, link._id.toString(), { commission: '15%' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(res.status).toBe(200);

    const reloaded = await AffiliateLinkModel.findById(link._id);
    expect(reloaded?.base_url).toBe('https://existing.example.com/offer'); // untouched
    expect(reloaded?.commission).toBe('15%'); // other fields still applied
  });

  it('is idempotent: PUTting the same valid base_url twice succeeds with no extra side effects', async () => {
    const { token } = await seedAdmin();
    const link = await seedLink();

    const first = await putHandler(
      putRequest(token, link._id.toString(), { base_url: 'https://same.example.com' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(first.status).toBe(200);

    const linksAfterFirst = await AffiliateLinkModel.countDocuments();
    const clicksAfterFirst = link.click_count; // captured pre-update

    const second = await putHandler(
      putRequest(token, link._id.toString(), { base_url: 'https://same.example.com' }),
      { params: Promise.resolve({ id: link._id.toString() }) }
    );
    expect(second.status).toBe(200);

    const reloaded = await AffiliateLinkModel.findById(link._id);
    expect(reloaded?.base_url).toBe('https://same.example.com');
    expect(await AffiliateLinkModel.countDocuments()).toBe(linksAfterFirst); // no duplicate docs
    expect(reloaded?.click_count).toBe(clicksAfterFirst); // no counter side effects
  });
});
