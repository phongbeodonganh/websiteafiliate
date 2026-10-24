import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel } from '@/lib/db/models';
import { signToken } from '@/lib/auth';
import { GET as list, POST } from '@/app/api/v1/cms/articles/route';
import { GET, PUT } from '@/app/api/v1/cms/articles/[id]/route';

async function author() {
  await connectToDatabase();
  const user = await UserModel.create({ username: 'tag-author', password_hash: 'unused', role: 'author', status: 'active' });
  const token = signToken({ userId: user.id, username: user.username, role: 'author' });
  const request = (method: string, body?: Record<string, unknown>) => new Request('http://localhost/api/v1/cms/articles', {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { request, user };
}

describe('Manually selected article content tags', () => {
  it.each(['review', 'case_study', 'guide'])('persists %s on creation, reads, list and edits', async (contentType) => {
    const { request } = await author();
    const created = await POST(request('POST', { title: 'Product article', content: '<p>Content</p>', contentType }));
    expect(created.status).toBe(201);
    const { data } = await created.json();
    const params = { params: Promise.resolve({ id: data.id }) };
    expect(data.contentType).toBe(contentType);
    expect((await ArticleModel.findById(data.id))!.content_type).toBe(contentType);
    expect((await (await GET(request('GET'), params)).json()).data.contentType).toBe(contentType);
    expect((await (await list(request('GET'))).json()).data[0].contentType).toBe(contentType);
    const nextType = contentType === 'guide' ? 'review' : 'guide';
    expect((await PUT(request('PUT', { contentType: nextType }), params)).status).toBe(200);
    expect((await (await GET(request('GET'), params)).json()).data.contentType).toBe(nextType);
    // Updating another field must not erase a manually assigned tag.
    await PUT(request('PUT', { title: 'Updated title' }), params);
    expect((await ArticleModel.findById(data.id))!.content_type).toBe(nextType);
  });

  it.each(['other', 'Review', '', null, ['review', 'guide']])('rejects invalid tags: %j', async (contentType) => {
    const { request, user } = await author();
    const article = await ArticleModel.create({ author_id: user.id, title: 'Existing', slug: 'existing', content: '<p>Content</p>', content_type: 'review' });
    expect((await POST(request('POST', { title: 'Invalid', content: '<p>Content</p>', contentType }))).status).toBe(400);
    expect((await PUT(request('PUT', { contentType }), { params: Promise.resolve({ id: article.id }) })).status).toBe(400);
    expect((await ArticleModel.findById(article.id))!.content_type).toBe('review');
    expect(await ArticleModel.countDocuments()).toBe(1);
  });

  it('keeps legacy and AI-created articles untagged instead of assigning a default', async () => {
    const { request } = await author();
    const created = await POST(request('POST', { title: 'Legacy', content: '<p>Content</p>' }));
    const { data } = await created.json();
    expect(data.contentType).toBeNull();
    expect((await (await GET(request('GET'), { params: Promise.resolve({ id: data.id }) })).json()).data.contentType).toBeNull();
    expect((await (await list(request('GET'))).json()).data[0].contentType).toBeNull();
  });
});
