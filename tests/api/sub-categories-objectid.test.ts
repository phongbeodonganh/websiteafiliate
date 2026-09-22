/**
 * CR-04 / WR-07 — sub-category ObjectId pass-through + route validation.
 *
 * Pins three contracts:
 *   1. (CR-04) A POST with a real 24-hex `categoryId` succeeds and persists
 *      `category_id` equal to the supplied id — the UI payload stopped coercing
 *      the id via `Number()` and now passes the string through.
 *   2. (WR-07) A POST with a malformed `categoryId` returns HTTP 400 — never a
 *      generic 500 from a Mongoose CastError. Mirrors the `not.toBe(500)`
 *      discipline of `tests/api/cms-auth-inactive.test.ts`.
 *   3. (WR-07) A PUT with a malformed `categoryId` returns 400, never 500, and
 *      leaves the stored `category_id` unchanged.
 *
 * Mirrors the structure of `tests/api/cms-users-update.test.ts:18-58`
 * (`seedScenario` + `jsonRequest` + `params`).
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel, CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { POST as subCatsPOST } from '@/app/api/v1/cms/sub-categories/route';
import { PUT as subCatPUT } from '@/app/api/v1/cms/sub-categories/[id]/route';

const UNIQUE = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

async function seedScenario() {
  await connectToDatabase();
  const suffix = UNIQUE();

  const admin = await UserModel.create({
    username: `subcat-admin-${suffix}`,
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });

  const category = await CategoryModel.create({
    name: `Test Category ${suffix}`,
    slug: `test-category-${suffix}`,
  });

  const token = signToken({
    userId: admin._id.toString(),
    username: admin.username,
    role: 'admin',
  });

  return { admin, category, token };
}

function jsonRequest(method: string, token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/sub-categories', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonPutRequest(token: string, id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/v1/cms/sub-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/cms/sub-categories — categoryId ObjectId (CR-04 / WR-07)', () => {
  it('persists a sub-category with a real 24-hex categoryId', async () => {
    const { category, token } = await seedScenario();
    const slug = `happy-${UNIQUE()}`;

    const res = await subCatsPOST(
      jsonRequest('POST', token, {
        categoryId: category._id.toString(),
        name: 'Happy Sub-Cat',
        slug,
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.categoryId).toBe(category._id.toString());

    const persisted = await SubCategoryModel.findById(json.data.id);
    expect(persisted, 'sub-category persisted').not.toBeNull();
    expect(persisted!.category_id.toString()).toBe(category._id.toString());
  });

  it('rejects a malformed categoryId with 400, never 500 (WR-07)', async () => {
    const { token } = await seedScenario();

    const res = await subCatsPOST(
      jsonRequest('POST', token, {
        categoryId: 'not-an-object-id',
        name: 'Bad Sub-Cat',
        slug: `bad-${UNIQUE()}`,
      }),
    );

    expect(res.status).toBe(400);
    expect(res.status).not.toBe(500);
    const json = await res.json();
    expect(json.status).toBe('error');
  });
});

describe('PUT /api/v1/cms/sub-categories/:id — categoryId ObjectId (WR-07)', () => {
  it('rejects a malformed categoryId with 400, never 500, and leaves the stored category_id unchanged', async () => {
    const { category, token } = await seedScenario();
    const slug = `put-${UNIQUE()}`;

    // create a valid sub-category first
    const created = await subCatsPOST(
      jsonRequest('POST', token, {
        categoryId: category._id.toString(),
        name: 'Reparent Me',
        slug,
      }),
    );
    const createdJson = await created.json();
    const subCatId = createdJson.data.id;

    // capture original category_id
    const before = await SubCategoryModel.findById(subCatId);
    const originalCatId = before!.category_id.toString();

    // attempt re-parent to a malformed id
    const res = await subCatPUT(
      jsonPutRequest(token, subCatId, { categoryId: 'not-an-object-id' }),
      params(subCatId),
    );

    expect(res.status).toBe(400);
    expect(res.status).not.toBe(500);
    const json = await res.json();
    expect(json.status).toBe('error');

    // the stored category_id is unchanged
    const after = await SubCategoryModel.findById(subCatId);
    expect(after!.category_id.toString()).toBe(originalCatId);
  });
});
