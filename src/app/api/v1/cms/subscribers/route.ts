import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { desc, count } from 'drizzle-orm';

// GET /api/v1/cms/subscribers - Danh sách email đăng ký & Thống kê Lead (Admin Only)
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const list = await db.select().from(subscribers).orderBy(desc(subscribers.subscribedAt));

    const totalCount = list.length;
    
    // Thống kê hôm nay & tuần này
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const countToday = list.filter((s) => s.subscribedAt && s.subscribedAt.startsWith(todayStr)).length;
    const countThisWeek = list.filter((s) => s.subscribedAt && new Date(s.subscribedAt) >= sevenDaysAgo).length;

    return NextResponse.json({
      status: 'success',
      data: {
        list,
        stats: {
          totalSubscribers: totalCount,
          countToday,
          countThisWeek,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách subscriber' }, { status: 500 });
  }
}
