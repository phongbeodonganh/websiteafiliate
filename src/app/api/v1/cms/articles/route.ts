import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { slugify } from '@/lib/utils';

// GET /api/v1/cms/articles - Fetch articles with Role-based Data Isolation
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Please log in' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const filter = user.role === 'admin' ? {} : { author_id: user.userId.toString() };

    const rawArticles = await ArticleModel.find(filter)
      .populate('author_id', 'name username')
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug')
      .sort({ created_at: -1 });

    const articleList = rawArticles.map((art) => {
      const doc = art.toObject();
      return {
        id: doc._id.toString(),
        authorId: doc.author_id ? (doc.author_id as any)._id?.toString() || doc.author_id.toString() : null,
        authorName: (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Unknown',
        categoryId: doc.category_id ? (doc.category_id as any)._id?.toString() || doc.category_id.toString() : null,
        categoryName: (doc.category_id as any)?.name || null,
        subCategoryId: doc.sub_category_id ? (doc.sub_category_id as any)._id?.toString() || doc.sub_category_id.toString() : null,
        subCategoryName: (doc.sub_category_id as any)?.name || null,
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
        focusKeyword: doc.focus_keyword,
        keyTakeaways: doc.key_takeaways || [],
        entities: doc.entities || [],
        faqSchema: doc.faq_schema || [],
        affiliatePlacements: doc.affiliate_placements || [],
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: articleList,
    });
  } catch (error) {
    console.error('CMS GET Articles error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch CMS articles' }, { status: 500 });
  }
}

// POST /api/v1/cms/articles - Create article with GEO and Affiliate placements
export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    if (!title || !content) {
      return NextResponse.json({ status: 'error', message: 'Title and Content are required' }, { status: 400 });
    }

    await connectToDatabase();
    let finalSlug = slug ? slugify(slug) : slugify(title);
    const existing = await ArticleModel.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const newArticle = await ArticleModel.create({
      author_id: user.userId.toString(),
      category_id: categoryId || undefined,
      sub_category_id: subCategoryId || undefined,
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      content,
      status: status || 'draft',
      is_featured: Boolean(isFeatured),
      revenue: revenue ? Number(revenue) : 0,
      meta_title: metaTitle || title,
      meta_description: metaDescription || '',
      thumbnail_url: thumbnailUrl || '',
      focus_keyword: focusKeyword || '',
      key_takeaways: Array.isArray(keyTakeaways) ? keyTakeaways : [],
      entities: Array.isArray(entities) ? entities : [],
      faq_schema: Array.isArray(faqSchema) ? faqSchema : [],
      affiliate_placements: Array.isArray(affiliatePlacements) ? affiliatePlacements : [],
    });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: newArticle._id.toString(),
          ...newArticle.toObject(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('CMS POST Article error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create article' }, { status: 500 });
  }
}
