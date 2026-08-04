import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clickLogs, articles, affiliateLinks } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin xem được log tracking' },
      { status: 403 }
    );
  }

  try {
    const logs = await db
      .select({
        id: clickLogs.id,
        articleTitle: articles.title,
        articleSlug: articles.slug,
        affiliateName: affiliateLinks.name,
        ipAddress: clickLogs.ipAddress,
        clickedAt: clickLogs.clickedAt,
      })
      .from(clickLogs)
      .leftJoin(articles, eq(clickLogs.articleId, articles.id))
      .leftJoin(affiliateLinks, eq(clickLogs.affiliateLinkId, affiliateLinks.id))
      .orderBy(desc(clickLogs.clickedAt))
      .limit(100);

    return NextResponse.json({
      status: 'success',
      data: logs,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy log tracking' }, { status: 500 });
  }
}
