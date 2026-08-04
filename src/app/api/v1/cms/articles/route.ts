import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles, users, categories, subCategories } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { slugify } from '@/lib/utils';

// GET /api/v1/cms/articles - Fetch articles with Role-based Data Isolation
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Please log in' }, { status: 401 });
  }

  try {
    let baseQuery = db
      .select({
        id: articles.id,
        authorId: articles.authorId,
        categoryId: articles.categoryId,
        subCategoryId: articles.subCategoryId,
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
        categoryName: categories.name,
        subCategoryName: subCategories.name,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id));

    let articleList;
    if (user.role === 'admin') {
      articleList = await baseQuery.orderBy(desc(articles.createdAt));
    } else {
      articleList = await baseQuery.where(eq(articles.authorId, user.userId)).orderBy(desc(articles.createdAt));
    }

    return NextResponse.json({
      status: 'success',
      data: articleList,
    });
  } catch (error) {
    console.error('CMS GET Articles error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch CMS articles' }, { status: 500 });
  }
}

// POST /api/v1/cms/articles - Create article
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
    } = body;

    if (!title || !content) {
      return NextResponse.json({ status: 'error', message: 'Title and Content are required' }, { status: 400 });
    }

    let finalSlug = slug ? slugify(slug) : slugify(title);
    const existing = await db.select().from(articles).where(eq(articles.slug, finalSlug)).get();
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const [newArticle] = await db
      .insert(articles)
      .values({
        authorId: user.userId,
        categoryId: categoryId ? Number(categoryId) : null,
        subCategoryId: subCategoryId ? Number(subCategoryId) : null,
        title,
        slug: finalSlug,
        excerpt: excerpt || '',
        content,
        status: status || 'draft',
        isFeatured: Boolean(isFeatured),
        revenue: revenue ? Number(revenue) : 0,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || '',
        thumbnailUrl: thumbnailUrl || '',
      })
      .returning();

    return NextResponse.json(
      {
        status: 'success',
        data: newArticle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('CMS POST Article error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create article' }, { status: 500 });
  }
}
