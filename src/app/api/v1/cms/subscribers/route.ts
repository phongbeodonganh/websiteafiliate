import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const rawList = await SubscriberModel.find().sort({ subscribed_at: -1 });

    const list = rawList.map((s) => ({
      id: s._id.toString(),
      email: s.email,
      subscribedAt: s.subscribed_at,
    }));

    const totalCount = list.length;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const countToday = list.filter((s) => s.subscribedAt && new Date(s.subscribedAt).toISOString().startsWith(todayStr)).length;
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
