import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { slugify } from '@/lib/utils';

// GET /api/v1/cms/articles/:id (Fetch single article for edit form)
export async function GET(
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

    const existingArticle = await ArticleModel.findById(id)
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug');

    if (!existingArticle) {
      return NextResponse.json({ status: 'error', message: 'Article not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && existingArticle.author_id.toString() !== user.userId.toString()) {
      return NextResponse.json(
        { status: 'error', message: '403 Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const doc = existingArticle.toObject();
    return NextResponse.json({
      status: 'success',
      data: {
        id: doc._id.toString(),
        authorId: doc.author_id ? doc.author_id.toString() : null,
        categoryId: doc.category_id ? (doc.category_id as any)._id?.toString() || doc.category_id.toString() : null,
        subCategoryId: doc.sub_category_id ? (doc.sub_category_id as any)._id?.toString() || doc.sub_category_id.toString() : null,
        title: doc.title,
        slug: doc.slug,
        excerpt: doc.excerpt,
        content: doc.content,
        status: doc.status,
        isFeatured: doc.is_featured,
        viewCount: doc.view_count,
        revenue: doc.revenue,
        metaTitle: doc.meta_title,
        metaDescription: doc.meta_description,
        thumbnailUrl: doc.thumbnail_url,
        focusKeyword: doc.focus_keyword || '',
        keyTakeaways: doc.key_takeaways || [],
        entities: doc.entities || [],
        faqSchema: doc.faq_schema || [],
        affiliatePlacements: doc.affiliate_placements || [],
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
    });
  } catch (error) {
    console.error('CMS GET Article error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch article' }, { status: 500 });
  }
}

// PUT /api/v1/cms/articles/:id (With 403 Ownership Check & GEO Fields)
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
      focusKeyword,
      keyTakeaways,
      entities,
      faqSchema,
      affiliatePlacements,
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
    if (focusKeyword !== undefined) existingArticle.focus_keyword = focusKeyword;
    if (keyTakeaways !== undefined) existingArticle.key_takeaways = Array.isArray(keyTakeaways) ? keyTakeaways : [];
    if (entities !== undefined) existingArticle.entities = Array.isArray(entities) ? entities : [];
    if (faqSchema !== undefined) existingArticle.faq_schema = Array.isArray(faqSchema) ? faqSchema : [];
    if (affiliatePlacements !== undefined) existingArticle.affiliate_placements = Array.isArray(affiliatePlacements) ? affiliatePlacements : [];
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
