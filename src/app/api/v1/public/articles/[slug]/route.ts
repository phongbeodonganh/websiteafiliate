import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles, users } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Tìm bài viết theo slug và status = 'published'
    const article = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        status: articles.status,
        viewCount: articles.viewCount,
        metaTitle: articles.metaTitle,
        metaDescription: articles.metaDescription,
        thumbnailUrl: articles.thumbnailUrl,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        author: users.username,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .get();

    if (!article) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy bài viết' },
        { status: 404 }
      );
    }

    // Tự động tăng lượt xem view_count
    await db
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, article.id));

    return NextResponse.json({
      status: 'success',
      data: {
        ...article,
        viewCount: article.viewCount + 1,
      },
    });
  } catch (error) {
    console.error('Public article detail API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Lỗi máy chủ khi lấy bài viết' },
      { status: 500 }
    );
  }
}
