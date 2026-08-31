import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel } from '@/lib/db/models';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '3', 10);
  const limit = Math.min(6, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 3));

  try {
    await connectToDatabase();
    const categories = await CategoryModel.find().sort({ created_at: 1 });

    const data = await Promise.all(
      categories.map(async (category) => {
        const filter = { status: 'published' as const, category_id: category._id };
        const [articles, total] = await Promise.all([
          ArticleModel.find(filter)
            .select('title slug excerpt content thumbnail_url view_count is_featured created_at')
            .sort({ created_at: -1 })
            .limit(limit),
          ArticleModel.countDocuments(filter),
        ]);

        return {
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          articles: articles.map((article) => ({
            id: article._id.toString(),
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || '',
            content: article.content,
            thumbnailUrl: article.thumbnail_url || '',
            viewCount: article.view_count,
            isFeatured: article.is_featured,
            createdAt: article.created_at,
            categoryName: category.name,
            categorySlug: category.slug,
          })),
          pagination: {
            total,
            page: 1,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: total > limit,
          },
        };
      }),
    );

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Articles by category API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch articles by category' },
      { status: 500 },
    );
  }
}
