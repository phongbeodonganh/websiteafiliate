/**
 * AUTH-02 / D-16 — `GET /api/v1/cms/articles` is scoped by author for non-admins.
 *
 * Pins the list-path data isolation contract:
 *   - author A's token returns exactly A's articles.
 *   - author B's token returns exactly B's articles.
 *   - the admin token returns articles from both authors.
 *   - a non-admin with zero articles receives `{ status:'success', data: [] }`
 *     — an empty list, never a 403 and never a leak of the global list.
 *   - the response never includes the other author's article title.
 *
 * Companion to tests/api/articles-ownership.test.ts (PUT/DELETE ownership); this
 * file covers the collection GET path, which the research flagged as untested.
 */
import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as articlesGET } from '@/app/api/v1/cms/articles/route';

async function seedScenario() {
  await connectToDatabase();

  const authorA = await UserModel.create({
    username: 'scoping-author-a',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });
  const authorB = await UserModel.create({
    username: 'scoping-author-b',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });
  const authorEmpty = await UserModel.create({
    username: 'scoping-author-empty',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'author',
    status: 'active',
  });
  const admin = await UserModel.create({
    username: 'scoping-admin',
    password_hash: 'irrelevant-not-used-in-this-test',
    role: 'admin',
    status: 'active',
  });

  const articleA = await ArticleModel.create({
    author_id: authorA._id,
    title: 'Article Owned By A',
    slug: 'article-owned-by-a-scoping-test',
    content: '<p>a</p>',
    status: 'draft',
  });
  const articleB = await ArticleModel.create({
    author_id: authorB._id,
    title: 'Article Owned By B',
    slug: 'article-owned-by-b-scoping-test',
    content: '<p>b</p>',
    status: 'draft',
  });

  const tokenA = signToken({ userId: authorA._id.toString(), username: authorA.username, role: 'author' });
  const tokenB = signToken({ userId: authorB._id.toString(), username: authorB.username, role: 'author' });
  const tokenEmpty = signToken({
    userId: authorEmpty._id.toString(),
    username: authorEmpty.username,
    role: 'author',
  });
  const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });

  return { articleA, articleB, tokenA, tokenB, tokenEmpty, adminToken };
}

function getRequest(token: string, path = 'http://localhost/api/v1/cms/articles') {
  return new Request(path, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe('GET /api/v1/cms/articles — author_id scoping (AUTH-02, D-16)', () => {
  it("author A sees exactly A's article", async () => {
    const { articleA, tokenA } = await seedScenario();

    const res = await articlesGET(getRequest(tokenA));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    const ids = json.data.map((a: { id: string }) => a.id);
    expect(ids).toEqual([articleA._id.toString()]);
    expect(json.data.map((a: { title: string }) => a.title)).not.toContain('Article Owned By B');
  });

  it("author B sees exactly B's article", async () => {
    const { articleB, tokenB } = await seedScenario();

    const res = await articlesGET(getRequest(tokenB));
    const json = await res.json();

    expect(res.status).toBe(200);
    const ids = json.data.map((a: { id: string }) => a.id);
    expect(ids).toEqual([articleB._id.toString()]);
    expect(json.data.map((a: { title: string }) => a.title)).not.toContain('Article Owned By A');
  });

  it('admin sees articles from both authors', async () => {
    const { articleA, articleB, adminToken } = await seedScenario();

    const res = await articlesGET(getRequest(adminToken));
    const json = await res.json();

    expect(res.status).toBe(200);
    const ids = json.data.map((a: { id: string }) => a.id).sort();
    expect(ids).toEqual([articleA._id.toString(), articleB._id.toString()].sort());
  });

  it('a non-admin with zero articles gets success + an empty data array (not 403)', async () => {
    const { tokenEmpty } = await seedScenario();

    const res = await articlesGET(getRequest(tokenEmpty));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data).toEqual([]);
  });
});
