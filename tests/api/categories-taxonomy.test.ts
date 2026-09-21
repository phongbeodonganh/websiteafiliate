import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { seedTaxonomy } from '@/lib/seed-taxonomy';
import { GET as getCategories } from '@/app/api/v1/cms/categories/route';

// The read path the CMS CategoriesView tree renders from (CMS-04): the seeded
// taxonomy must be served by the existing categories shape with no route change.
async function seedAdminToken() {
  await connectToDatabase();
  const admin = await UserModel.create({
    username: `taxonomy-admin-${Date.now()}-${Math.random()}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });
  return signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
}

function getRequest(token: string) {
  return new Request('http://localhost/api/v1/cms/categories', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('GET /api/v1/cms/categories — seeded taxonomy read path (CMS-04)', () => {
  it('requires authentication', async () => {
    await connectToDatabase();
    const res = await getCategories(
      new Request('http://localhost/api/v1/cms/categories', { method: 'GET' })
    );
    expect(res.status).toBe(401);
  });

  it('serves the six seeded categories, with AI Use Cases carrying its five sub-categories', async () => {
    const token = await seedAdminToken();
    await seedTaxonomy();

    const res = await getCategories(getRequest(token));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe('success');

    const categories = json.data as {
      name: string;
      slug: string;
      subCategories: { name: string; slug: string }[];
    }[];

    const slugs = categories.map((c) => c.slug).sort();
    expect(slugs).toEqual(
      [
        'ai-audio-code',
        'ai-automation-agents',
        'ai-content-copywriting',
        'ai-marketing-sales',
        'ai-use-cases',
        'ai-video-image-generation',
      ].sort()
    );

    const useCases = categories.find((c) => c.slug === 'ai-use-cases');
    expect(useCases).toBeDefined();
    expect(useCases?.subCategories).toHaveLength(5);
    expect(useCases?.subCategories.map((s) => s.slug).sort()).toEqual(
      [
        'ai-for-creators-media',
        'ai-for-e-commerce-online-business',
        'ai-for-finance-legal-consulting',
        'ai-for-marketers-agencies',
        'ai-for-real-estate-sales',
      ].sort()
    );
  });

  it('carries the two-level tree on the exact shape the CMS tree consumes (id/name/slug/subCategories)', async () => {
    const token = await seedAdminToken();
    await seedTaxonomy();

    const res = await getCategories(getRequest(token));
    const json = await res.json();
    const first = (json.data as Record<string, unknown>[])[0];

    expect(typeof first.id).toBe('string');
    expect(typeof first.name).toBe('string');
    expect(typeof first.slug).toBe('string');
    expect(Array.isArray(first.subCategories)).toBe(true);
  });
});
