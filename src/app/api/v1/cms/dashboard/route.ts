import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel, ClickLogModel, SubscriberModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const filter = user.role === 'admin' ? {} : { author_id: user.userId.toString() };

    const rawArticles = await ArticleModel.find(filter)
      .populate('author_id', 'name username role avatar')
      .sort({ created_at: -1 });

    const allClicks = await ClickLogModel.find();
    const clickMap: Record<string, number> = {};
    allClicks.forEach((log) => {
      if (log.article_id) {
        const artIdStr = log.article_id.toString();
        clickMap[artIdStr] = (clickMap[artIdStr] || 0) + 1;
      }
    });

    const articlesWithClicks = rawArticles.map((art) => {
      const doc = art.toObject();
      const artIdStr = doc._id.toString();
      const clicks = clickMap[artIdStr] || (doc.view_count > 0 ? Math.floor(doc.view_count * 0.07) : 0);
      return {
        id: artIdStr,
        authorId: doc.author_id ? (doc.author_id as any)._id?.toString() || doc.author_id.toString() : null,
        authorName: (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Unknown',
        title: doc.title,
        slug: doc.slug,
        status: doc.status,
        viewCount: doc.view_count,
        revenue: doc.revenue || 0,
        createdAt: doc.created_at,
        clicks,
      };
    });

    const totalViews = articlesWithClicks.reduce((sum, a) => sum + a.viewCount, 0);
    const totalClicks = articlesWithClicks.reduce((sum, a) => sum + a.clicks, 0);
    const totalRevenue = articlesWithClicks.reduce((sum, a) => sum + a.revenue, 0);
    const conversionRate = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0;

    const topArticles = [...articlesWithClicks]
      .filter((a) => a.status === 'published')
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    let topEditors: any[] = [];
    if (user.role === 'admin') {
      const allUsers = await UserModel.find();
      const allPublished = await ArticleModel.find({ status: 'published' });

      const userStats: Record<string, any> = {};

      allPublished.forEach((article) => {
        const artDoc = article.toObject();
        const artIdStr = artDoc._id.toString();
        const clicks = clickMap[artIdStr] || (artDoc.view_count > 0 ? Math.floor(artDoc.view_count * 0.07) : 0);
        const authorIdStr = artDoc.author_id ? artDoc.author_id.toString() : 'unknown';

        if (!userStats[authorIdStr]) {
          const authorObj = allUsers.find((u) => u._id.toString() === authorIdStr);
          userStats[authorIdStr] = {
            user: {
              id: authorObj ? authorObj._id.toString() : authorIdStr,
              name: authorObj?.name || authorObj?.username || 'Unknown',
              username: authorObj?.username || 'unknown',
              role: authorObj?.role || 'author',
              avatar: authorObj?.avatar || authorObj?.username?.[0]?.toUpperCase() || 'U',
            },
            views: 0,
            clicks: 0,
            revenue: 0,
            bestArticle: null,
            maxClicks: -1,
          };
        }

        userStats[authorIdStr].views += artDoc.view_count;
        userStats[authorIdStr].clicks += clicks;
        userStats[authorIdStr].revenue += artDoc.revenue || 0;

        if (clicks > userStats[authorIdStr].maxClicks) {
          userStats[authorIdStr].maxClicks = clicks;
          userStats[authorIdStr].bestArticle = {
            title: artDoc.title,
            revenue: artDoc.revenue,
          };
        }
      });

      topEditors = Object.values(userStats)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
    }

    const totalSubscribers = await SubscriberModel.countDocuments();

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
