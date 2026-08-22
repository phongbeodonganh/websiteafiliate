import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { PUT as putArticle, DELETE as deleteArticle } from '@/app/api/v1/cms/articles/[id]/route';

async function seedScenario() {
  await connectToDatabase();

  const owner = await UserModel.create({
    username: 'owner-author',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });
  const otherAuthor = await UserModel.create({
    username: 'other-author',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });
  const admin = await UserModel.create({
    username: 'the-admin',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });

  const article = await ArticleModel.create({
    author_id: owner._id,
    title: 'Original Title',
    slug: 'original-title-ownership-test',
    content: '<p>original</p>',
    status: 'draft',
  });

  const ownerToken = signToken({ userId: owner._id.toString(), username: owner.username, role: 'author' });
  const otherToken = signToken({ userId: otherAuthor._id.toString(), username: otherAuthor.username, role: 'author' });
  const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });

  return { article, ownerToken, otherToken, adminToken };
}

function jsonRequest(method: string, token: string, body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/articles/x', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PUT/DELETE /api/v1/cms/articles/:id — ownership check', () => {
  it('forbids an author who does not own the article from editing it (403)', async () => {
    const { article, otherToken } = await seedScenario();

    const res = await putArticle(
      jsonRequest('PUT', otherToken, { title: 'Hijacked Title' }),
      params(article._id.toString())
    );
    expect(res.status).toBe(403);

    const stillOriginal = await ArticleModel.findById(article._id);
    expect(stillOriginal?.title).toBe('Original Title');
  });

  it('allows the owning author to edit their own article', async () => {
    const { article, ownerToken } = await seedScenario();

    const res = await putArticle(
      jsonRequest('PUT', ownerToken, { title: 'Updated By Owner' }),
      params(article._id.toString())
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');

    const updated = await ArticleModel.findById(article._id);
    expect(updated?.title).toBe('Updated By Owner');
  });

  it('allows admin to edit any article regardless of ownership', async () => {
    const { article, adminToken } = await seedScenario();

    const res = await putArticle(
      jsonRequest('PUT', adminToken, { title: 'Updated By Admin' }),
      params(article._id.toString())
    );
    expect(res.status).toBe(200);

    const updated = await ArticleModel.findById(article._id);
    expect(updated?.title).toBe('Updated By Admin');
  });

  it('forbids a non-owning author from deleting the article (403)', async () => {
    const { article, otherToken } = await seedScenario();

    const res = await deleteArticle(jsonRequest('DELETE', otherToken, {}), params(article._id.toString()));
    expect(res.status).toBe(403);

    const stillExists = await ArticleModel.findById(article._id);
    expect(stillExists).not.toBeNull();
  });

  it('allows admin to delete any article', async () => {
    const { article, adminToken } = await seedScenario();

    const res = await deleteArticle(jsonRequest('DELETE', adminToken, {}), params(article._id.toString()));
    expect(res.status).toBe(200);

    const deleted = await ArticleModel.findById(article._id);
    expect(deleted).toBeNull();
  });
});
