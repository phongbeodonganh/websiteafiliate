import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel, TrafficDomainModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { getTraffic, TrafficApiError } from '@/lib/traffic/tabapi';

export const runtime = 'nodejs';

// force:true skips the getTraffic cache read (but still stores the fresh
// result), so refresh always hits TabAPI again. On upstream failure the row's
// previous report stays intact — only lastError is recorded.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage Traffic domains.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ status: 'error', message: 'ID không hợp lệ.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const row = await TrafficDomainModel.findById(id);
    if (!row) {
      return NextResponse.json({ status: 'error', message: 'Không tìm thấy tên miền.' }, { status: 404 });
    }

    const settings = await SettingModel.findOne();
    const resolved = resolveTrafficCredentials(settings?.toObject());
    if (!resolved.tabapi.value) {
      const message = 'Chưa cấu hình TABAPI_KEY trên máy chủ.';
      return NextResponse.json(
        { status: 'error', error: { code: 'missing_api_key', message }, message },
        { status: 500 }
      );
    }

    try {
      const report = await getTraffic(row.domain, resolved.tabapi.value, resolved.months, { force: true });
      row.report = report;
      row.lastFetchedAt = new Date();
      row.lastError = null;
      await row.save();

      return NextResponse.json({
        status: 'success',
        data: {
          id: row._id.toString(),
          domain: row.domain,
          report: row.report,
          lastFetchedAt: row.lastFetchedAt,
        },
      });
    } catch (error) {
      const code = error instanceof TrafficApiError ? error.code : 'unexpected_error';
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Không thể lấy dữ liệu website lúc này.';
      row.lastError = { code, message };
      await row.save();

      const status = error instanceof TrafficApiError ? error.status : 502;
      return NextResponse.json(
        { status: 'error', error: { code, message }, message },
        { status }
      );
    }
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to refresh the Traffic domain.' }, { status: 500 });
  }
}
