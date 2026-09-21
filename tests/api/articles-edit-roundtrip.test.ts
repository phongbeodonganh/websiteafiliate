import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { POST as postArticle } from '@/app/api/v1/cms/articles/route';
import { GET as getArticle, PUT as putArticle } from '@/app/api/v1/cms/articles/[id]/route';

// ---------------------------------------------------------------------------
// CMS-01 / CMS-03 / D-04 — "reopen a published article, mutate it, save, reload
// sees the mutation", proven at the API boundary this repo can test (Vitest runs
// `environment: 'node'` with no jsdom, so the browser-only half is manual UAT).
//
// The round trip pins every field the editor accepts, with the GEO fields
// (focusKeyword, keyTakeaways, entities, faqSchema) fully populated, plus the
// three canonical affiliate placements (top_cta / middle_comparison /
// footer_banner) that success criterion #3 depends on.
// ---------------------------------------------------------------------------

async function seedAdmin() {
  await connectToDatabase();
  const admin = await UserModel.create({
    username: `roundtrip-admin-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  const token = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
  return { admin, token };
}

async function seedAffiliateLink(name: string, baseUrl: string) {
  await connectToDatabase();
  return AffiliateLinkModel.create({
    name,
    base_url: baseUrl,
    commission: '10%',
    cookie: '30 days',
    status: 'active',
  });
}

function jsonRequest(method: string, token: string, body: Record<string, unknown>, url: string) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

// GET/HEAD may not carry a body (undici throws "Request with GET/HEAD method
// cannot have body"), so read calls use a body-less request.
function getRequest(token: string, url: string) {
  return new Request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const GEO_PAYLOAD = {
  title: 'Best AI Writing Tools for 2026',
  slug: 'best-ai-writing-tools-2026-roundtrip',
  excerpt: 'A GEO-ready round-up of the best AI writing tools.',
  content: '<p>Rich <strong>content</strong> body.</p>',
  status: 'published',
  focusKeyword: 'best ai writing tools',
  keyTakeaways: ['Fast drafts', 'Structured GEO output', 'Affiliate-ready'],
  entities: ['OpenAI', 'Anthropic', 'Google'],
  faqSchema: [
    { question: 'What is the best AI writing tool?', answer: 'It depends on the workflow.' },
    { question: 'Are AI writing tools free?', answer: 'Many offer free tiers.' },
  ],
};

describe('POST → GET → PUT → GET /api/v1/cms/articles — edit round trip (CMS-01/CMS-03/D-04)', () => {
  it('persists GEO fields on create and returns them on read', async () => {
    const { token } = await seedAdmin();

    const createRes = await postArticle(
      jsonRequest('POST', token, GEO_PAYLOAD, 'http://localhost/api/v1/cms/articles')
    );
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.status).toBe('success');
    const id = createJson.data.id as string;
    expect(typeof id).toBe('string');

    const readRes = await getArticle(
      getRequest(token, `http://localhost/api/v1/cms/articles/${id}`),
      params(id)
    );
    expect(readRes.status).toBe(200);
    const readJson = await readRes.json();
    expect(readJson.status).toBe('success');

    expect(readJson.data.focusKeyword).toBe('best ai writing tools');
    expect(readJson.data.keyTakeaways).toEqual(['Fast drafts', 'Structured GEO output', 'Affiliate-ready']);
    expect(readJson.data.entities).toEqual(['OpenAI', 'Anthropic', 'Google']);
    expect(readJson.data.faqSchema).toHaveLength(2);
    // Mongoose subdocuments carry an auto-generated `_id`; assert the meaningful
    // question/answer fields rather than exact object equality.
    expect(readJson.data.faqSchema[0]).toMatchObject({
      question: 'What is the best AI writing tool?',
      answer: 'It depends on the workflow.',
    });
    expect(readJson.data.status).toBe('published');
  });

  it('persists a mutation to title and key takeaways, and advances updatedAt', async () => {
    const { token } = await seedAdmin();

    const createRes = await postArticle(
      jsonRequest('POST', token, GEO_PAYLOAD, 'http://localhost/api/v1/cms/articles')
    );
    const id = (await createRes.json()).data.id as string;

    const beforeRes = await getArticle(
      getRequest(token, `http://localhost/api/v1/cms/articles/${id}`),
      params(id)
    );
    const before = await beforeRes.json();

    // Ensure the PUT's `updated_at = new Date()` lands measurably after the create.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const putRes = await putArticle(
      jsonRequest(
        'PUT',
        token,
        { title: 'Mutated Title For Reopen Flow', keyTakeaways: ['Mutated takeaway'] },
        `http://localhost/api/v1/cms/articles/${id}`
      ),
      params(id)
    );
    expect(putRes.status).toBe(200);
    const putJson = await putRes.json();
    expect(putJson.status).toBe('success');

    const afterRes = await getArticle(
      getRequest(token, `http://localhost/api/v1/cms/articles/${id}`),
      params(id)
    );
    expect(afterRes.status).toBe(200);
    const after = await afterRes.json();

    expect(after.data.title).toBe('Mutated Title For Reopen Flow');
    expect(after.data.keyTakeaways).toEqual(['Mutated takeaway']);
    expect(new Date(after.data.updatedAt).getTime()).toBeGreaterThan(
      new Date(before.data.updatedAt).getTime()
    );
  });

  it('round-trips the three canonical affiliate placements through create and both reads (CMS-03)', async () => {
    const { token } = await seedAdmin();
    const top = await seedAffiliateLink('Top Pick Campaign', 'https://top.example.com/offer');
    const middle = await seedAffiliateLink('Comparison Campaign', 'https://middle.example.com/offer');
    const footer = await seedAffiliateLink('Footer Campaign', 'https://footer.example.com/offer');

    const affiliatePlacements = [
      { affiliate_link_id: top._id.toString(), position_label: 'top_cta' },
      { affiliate_link_id: middle._id.toString(), position_label: 'middle_comparison' },
      { affiliate_link_id: footer._id.toString(), position_label: 'footer_banner' },
    ];

    const createRes = await postArticle(
      jsonRequest(
        'POST',
        token,
        { ...GEO_PAYLOAD, slug: 'affiliate-placements-roundtrip', affiliatePlacements },
        'http://localhost/api/v1/cms/articles'
      )
    );
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const createdPlacements = createJson.data.affiliate_placements as { position_label: string }[];
    expect(createdPlacements.map((p) => p.position_label)).toEqual([
      'top_cta',
      'middle_comparison',
      'footer_banner',
    ]);

    const id = createJson.data.id as string;
    const readRes = await getArticle(
      getRequest(token, `http://localhost/api/v1/cms/articles/${id}`),
      params(id)
    );
    const readJson = await readRes.json();
    expect(readJson.data.affiliatePlacements.map((p: { position_label: string }) => p.position_label)).toEqual([
      'top_cta',
      'middle_comparison',
      'footer_banner',
    ]);

    const putRes = await putArticle(
      jsonRequest(
        'PUT',
        token,
        { affiliatePlacements },
        `http://localhost/api/v1/cms/articles/${id}`
      ),
      params(id)
    );
    expect(putRes.status).toBe(200);

    const afterRes = await getArticle(
      getRequest(token, `http://localhost/api/v1/cms/articles/${id}`),
      params(id)
    );
    const afterJson = await afterRes.json();
    const afterPlacements = afterJson.data.affiliatePlacements as { position_label: string }[];
    expect(afterPlacements).toHaveLength(3);
    expect(afterPlacements.map((p) => p.position_label)).toEqual([
      'top_cta',
      'middle_comparison',
      'footer_banner',
    ]);
  });
});
