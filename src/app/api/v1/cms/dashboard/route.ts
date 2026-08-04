import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { articles, users, clickLogs, subscribers } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Lấy danh sách bài viết theo phân quyền
    let articleQuery = db
      .select({
        id: articles.id,
        authorId: articles.authorId,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        viewCount: articles.viewCount,
        revenue: articles.revenue,
        createdAt: articles.createdAt,
        authorName: users.name,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id));

    let viewArticles;
    if (user.role === 'admin') {
      viewArticles = await articleQuery;
    } else {
      viewArticles = await db
        .select({
          id: articles.id,
          authorId: articles.authorId,
          title: articles.title,
          slug: articles.slug,
          status: articles.status,
          viewCount: articles.viewCount,
          revenue: articles.revenue,
          createdAt: articles.createdAt,
          authorName: users.name,
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(eq(articles.authorId, user.userId));
    }

    // Lấy số lượt click từ click_logs
    const allClicks = await db.select().from(clickLogs);
    const clickMap: Record<number, number> = {};
    allClicks.forEach((log) => {
      if (log.articleId) {
        clickMap[log.articleId] = (clickMap[log.articleId] || 0) + 1;
      }
    });

    // Thêm trường clicks vào danh sách bài viết
    const articlesWithClicks = viewArticles.map((art) => ({
      ...art,
      clicks: clickMap[art.id] || (art.viewCount > 0 ? Math.floor(art.viewCount * 0.07) : 0), // Mock click tỷ lệ nếu chưa có log thực
    }));

    const totalViews = articlesWithClicks.reduce((sum, a) => sum + a.viewCount, 0);
    const totalClicks = articlesWithClicks.reduce((sum, a) => sum + a.clicks, 0);
    const totalRevenue = articlesWithClicks.reduce((sum, a) => sum + (a.revenue || 0), 0);
    const conversionRate = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0;

    // Top Trending Articles
    const topArticles = [...articlesWithClicks]
      .filter((a) => a.status === 'published')
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    // Top Creators (Chỉ Admin)
    let topEditors: any[] = [];
    if (user.role === 'admin') {
      const allUsers = await db.select().from(users);
      const allPublished = await db
        .select()
        .from(articles)
        .where(eq(articles.status, 'published'));

      const userStats: Record<number, any> = {};

      allPublished.forEach((article) => {
        const clicks = clickMap[article.id] || (article.viewCount > 0 ? Math.floor(article.viewCount * 0.07) : 0);
        if (!userStats[article.authorId]) {
          const authorObj = allUsers.find((u) => u.id === article.authorId);
          userStats[article.authorId] = {
            user: {
              id: authorObj?.id,
              name: authorObj?.name || authorObj?.username,
              username: authorObj?.username,
              role: authorObj?.role,
              avatar: authorObj?.avatar || authorObj?.username?.[0]?.toUpperCase(),
            },
            views: 0,
            clicks: 0,
            revenue: 0,
            bestArticle: null,
            maxClicks: -1,
          };
        }

        userStats[article.authorId].views += article.viewCount;
        userStats[article.authorId].clicks += clicks;
        userStats[article.authorId].revenue += article.revenue || 0;

        if (clicks > userStats[article.authorId].maxClicks) {
          userStats[article.authorId].maxClicks = clicks;
          userStats[article.authorId].bestArticle = {
            title: article.title,
            revenue: article.revenue,
          };
        }
      });

      topEditors = Object.values(userStats)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
    }

    const allSubscribers = await db.select().from(subscribers);
    const totalSubscribers = allSubscribers.length;

    return NextResponse.json({
      status: 'success',
      data: {
        totalViews,
        totalClicks,
        totalRevenue,
        conversionRate,
        totalSubscribers,
        topArticles,
        topEditors,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy dữ liệu Dashboard' }, { status: 500 });
  }
}
