import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles, users, categories, subCategories } from '@/lib/db/schema';
import { eq, and, desc, like, or, count } from 'drizzle-orm';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab'); // 'hot' | 'popular' | 'latest'
  const categorySlug = searchParams.get('category_slug') || searchParams.get('category');
  const subCategorySlug = searchParams.get('sub_category_slug') || searchParams.get('sub_category');
  const searchKeyword = searchParams.get('search') || searchParams.get('q');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '6', 10));
  const offset = (page - 1) * limit;

  try {
    const conditions = [eq(articles.status, 'published')];

    if (tab === 'hot') {
      conditions.push(eq(articles.isFeatured, true));
    }

    if (categorySlug) {
      const catObj = await db.select().from(categories).where(eq(categories.slug, categorySlug)).get();
      if (catObj) conditions.push(eq(articles.categoryId, catObj.id));
    }

    if (subCategorySlug) {
      const subCatObj = await db.select().from(subCategories).where(eq(subCategories.slug, subCategorySlug)).get();
      if (subCatObj) conditions.push(eq(articles.subCategoryId, subCatObj.id));
    }

    if (searchKeyword && searchKeyword.trim()) {
      const kw = `%${searchKeyword.trim()}%`;
      conditions.push(or(like(articles.title, kw), like(articles.excerpt, kw), like(articles.content, kw))!);
    }

    const orderColumn = tab === 'popular' ? desc(articles.viewCount) : desc(articles.createdAt);

    // Total count for pagination
    const countResult = await db
      .select({ total: count() })
      .from(articles)
      .where(and(...conditions));

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const result = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        content: articles.content,
        status: articles.status,
        isFeatured: articles.isFeatured,
        viewCount: articles.viewCount,
        revenue: articles.revenue,
        metaTitle: articles.metaTitle,
        metaDescription: articles.metaDescription,
        thumbnailUrl: articles.thumbnailUrl,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        authorName: users.name,
        authorAvatar: users.avatar,
        categoryName: categories.name,
        categorySlug: categories.slug,
        subCategoryName: subCategories.name,
        subCategorySlug: subCategories.slug,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
      .where(and(...conditions))
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      status: 'success',
      data: result,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Public articles API error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public articles' }, { status: 500 });
  }
}
