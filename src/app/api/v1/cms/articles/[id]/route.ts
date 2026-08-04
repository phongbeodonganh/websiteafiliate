import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { slugify } from '@/lib/utils';

// PUT /api/v1/cms/articles/:id (With 403 Ownership Check)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const articleId = Number(id);

    const existingArticle = await db.select().from(articles).where(eq(articles.id, articleId)).get();
    if (!existingArticle) {
      return NextResponse.json({ status: 'error', message: 'Article not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && existingArticle.authorId !== user.userId) {
      return NextResponse.json(
        { status: 'error', message: '403 Forbidden - You are not authorized to edit this article' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      slug,
      excerpt,
      content,
      status,
      isFeatured,
      categoryId,
      subCategoryId,
      revenue,
      metaTitle,
      metaDescription,
      thumbnailUrl,
    } = body;

    const updateData: Record<string, any> = {
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slugify(slug);
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (categoryId !== undefined) updateData.categoryId = categoryId ? Number(categoryId) : null;
    if (subCategoryId !== undefined) updateData.subCategoryId = subCategoryId ? Number(subCategoryId) : null;
    if (revenue !== undefined) updateData.revenue = Number(revenue);
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;

    const [updatedArticle] = await db
      .update(articles)
      .set(updateData)
      .where(eq(articles.id, articleId))
      .returning();

    return NextResponse.json({
      status: 'success',
      data: updatedArticle,
    });
  } catch (error) {
    console.error('CMS PUT Article error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to update article' }, { status: 500 });
  }
}

// DELETE /api/v1/cms/articles/:id (With 403 Ownership Check)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const articleId = Number(id);

    const existingArticle = await db.select().from(articles).where(eq(articles.id, articleId)).get();
    if (!existingArticle) {
      return NextResponse.json({ status: 'error', message: 'Article not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && existingArticle.authorId !== user.userId) {
      return NextResponse.json(
        { status: 'error', message: '403 Forbidden - You are not authorized to delete this article' },
        { status: 403 }
      );
    }

    await db.delete(articles).where(eq(articles.id, articleId));

    return NextResponse.json({
      status: 'success',
      message: 'Article deleted successfully',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to delete article' }, { status: 500 });
  }
}
