import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { escapeRegExp } from '@/lib/utils';

// SEC-04 / T-1-17 ReDoS defense-in-depth: search keywords longer than this are
// not fed to the RegExp engine. The `escapeRegExp` wrap below already neutralizes
// backtracking metacharacters (literal-only patterns cannot blow up), but the
// cap adds a second layer both for engine-warmth and for pathological-literal
// inputs (no need to compile a 10KB pattern). No 400 on over-cap — search just
// stops filtering, per the plan's "graceful defense-in-depth" contract.
const SEARCH_KEYWORD_MAX_LENGTH = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab');
  const categorySlug = searchParams.get('category_slug') || searchParams.get('category');
  const subCategorySlug = searchParams.get('sub_category_slug') || searchParams.get('sub_category');
  const searchKeyword = searchParams.get('search') || searchParams.get('q');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '6', 10));
  const offset = (page - 1) * limit;

  try {
    await connectToDatabase();
    const filter: Record<string, any> = { status: 'published' };

    if (tab === 'editorial' || tab === 'hot') {
      filter.is_featured = true;
    }

    if (categorySlug) {
      const catObj = await CategoryModel.findOne({ slug: categorySlug });
      if (catObj) filter.category_id = catObj._id;
    }

    if (subCategorySlug) {
      const subCatObj = await SubCategoryModel.findOne({ slug: subCategorySlug });
      if (subCatObj) filter.sub_category_id = subCatObj._id;
    }

    if (searchKeyword && searchKeyword.trim()) {
      const trimmedKeyword = searchKeyword.trim();
      // Escape the user-supplied keyword so the compiled RegExp matches it
      // literally — no metacharacter can produce a catastrophic-backtracking
      // pattern (T-1-17). Over-cap keywords skip the regex filter gracefully
      // (no 400, no hang) — the route just returns the unfiltered result set.
      if (trimmedKeyword.length <= SEARCH_KEYWORD_MAX_LENGTH) {
        const regex = new RegExp(escapeRegExp(trimmedKeyword), 'i');
        filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
      }
    }

    const sortOption: Record<string, 1 | -1> = tab === 'popular'
      ? { view_count: -1, published_at: -1, created_at: -1, _id: -1 }
      : { published_at: -1, created_at: -1, _id: -1 };

    const total = await ArticleModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const rawArticles = await ArticleModel.find(filter)
      .populate('author_id', 'name avatar username')
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug')
      .sort(sortOption)
      .skip(offset)
      .limit(limit);

    const result = rawArticles.map((art) => {
      const doc = art.toObject();
      return {
        id: doc._id.toString(),
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
        createdAt: doc.published_at || doc.created_at,
        updatedAt: doc.updated_at,
        authorName: (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Unknown Tác giả',
        authorAvatar: (doc.author_id as any)?.avatar || 'A',
        categoryName: (doc.category_id as any)?.name || null,
        categorySlug: (doc.category_id as any)?.slug || null,
        subCategoryName: (doc.sub_category_id as any)?.name || null,
        subCategorySlug: (doc.sub_category_id as any)?.slug || null,
      };
    });

    return NextResponse.json(
      {
        status: 'success',
        data: result,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Public articles API error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public articles' }, { status: 500 });
  }
}
