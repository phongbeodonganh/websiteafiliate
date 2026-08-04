import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
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
    await connectToDatabase();

    const existingArticle = await ArticleModel.findById(id);
    if (!existingArticle) {
      return NextResponse.json({ status: 'error', message: 'Article not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && existingArticle.author_id.toString() !== user.userId.toString()) {
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

    if (title !== undefined) existingArticle.title = title;
    if (slug !== undefined) existingArticle.slug = slugify(slug);
    if (excerpt !== undefined) existingArticle.excerpt = excerpt;
    if (content !== undefined) existingArticle.content = content;
    if (status !== undefined) existingArticle.status = status;
    if (isFeatured !== undefined) existingArticle.is_featured = Boolean(isFeatured);
    if (categoryId !== undefined) existingArticle.category_id = categoryId || undefined;
    if (subCategoryId !== undefined) existingArticle.sub_category_id = subCategoryId || undefined;
    if (revenue !== undefined) existingArticle.revenue = Number(revenue);
    if (metaTitle !== undefined) existingArticle.meta_title = metaTitle;
    if (metaDescription !== undefined) existingArticle.meta_description = metaDescription;
    if (thumbnailUrl !== undefined) existingArticle.thumbnail_url = thumbnailUrl;
    existingArticle.updated_at = new Date();

    await existingArticle.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: existingArticle._id.toString(),
        ...existingArticle.toObject(),
      },
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
    await connectToDatabase();

    const existingArticle = await ArticleModel.findById(id);
    if (!existingArticle) {
      return NextResponse.json({ status: 'error', message: 'Article not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && existingArticle.author_id.toString() !== user.userId.toString()) {
      return NextResponse.json(
        { status: 'error', message: '403 Forbidden - You are not authorized to delete this article' },
        { status: 403 }
      );
    }

    await ArticleModel.findByIdAndDelete(id);

    return NextResponse.json({
      status: 'success',
      message: 'Article deleted successfully',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to delete article' }, { status: 500 });
  }
}
