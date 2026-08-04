import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

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
    await connectToDatabase();
    const rawLogs = await ClickLogModel.find()
      .populate('article_id', 'title slug')
      .populate('affiliate_link_id', 'name')
      .sort({ clicked_at: -1 })
      .limit(100);

    const logs = rawLogs.map((log) => {
      const doc = log.toObject();
      return {
        id: doc._id.toString(),
        articleTitle: (doc.article_id as any)?.title || 'Unlinked',
        articleSlug: (doc.article_id as any)?.slug || '',
        affiliateName: (doc.affiliate_link_id as any)?.name || 'Direct Link',
        ipAddress: doc.ip_address || '127.0.0.1',
        clickedAt: doc.clicked_at,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: logs,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy log tracking' }, { status: 500 });
  }
}
