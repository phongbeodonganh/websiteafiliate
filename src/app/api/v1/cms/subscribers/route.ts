import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { getCurrentGmtPlus12Period } from '@/lib/insider/digest';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const rawList = await SubscriberModel.find().sort({ subscribed_at: -1 }).lean();

    const list = rawList.map((s) => ({
      id: s._id.toString(),
      email: s.email,
      subscribedAt: s.subscribed_at,
      status: s.status || 'active',
      emailStatus: s.email_status || 'sent',
      openedAt: s.opened_at,
      confirmedAt: s.confirmed_at,
      unsubscribedAt: s.unsubscribed_at,
      lastDigestAt: s.last_digest_at,
    }));

    const activeList = list.filter((s) => s.status === 'active');
    const totalCount = activeList.length;
    const lastDispatch = activeList
      .filter((s) => s.lastDigestAt)
      .sort((a, b) => new Date(b.lastDigestAt!).getTime() - new Date(a.lastDigestAt!).getTime())[0];
    const now = new Date();
    const currentGmtPlus12Day = getCurrentGmtPlus12Period(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const countToday = activeList.filter((s) => s.subscribedAt && new Date(s.subscribedAt) >= currentGmtPlus12Day.start).length;
    const countThisWeek = activeList.filter((s) => s.subscribedAt && new Date(s.subscribedAt) >= sevenDaysAgo).length;

    return NextResponse.json({
      status: 'success',
      data: {
        list,
        stats: {
          totalSubscribers: totalCount,
          countToday,
          countThisWeek,
          openedCount: activeList.filter((s) => s.emailStatus === 'opened').length,
          pendingCount: list.filter((s) => s.status === 'pending').length,
          unsubscribedCount: list.filter((s) => s.status === 'unsubscribed').length,
          lastDispatchAt: lastDispatch?.lastDigestAt || null,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách subscriber' }, { status: 500 });
  }
}
