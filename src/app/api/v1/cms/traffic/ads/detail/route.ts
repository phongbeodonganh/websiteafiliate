import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { AdsApiError, getAdDetail } from '@/lib/traffic/ads-transparency';

export const runtime = 'nodejs';

const ADVERTISER_ID = /^AR\d{1,40}$/;
const CREATIVE_ID = /^CR\d{1,40}$/;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can use Traffic panels.' },
      { status: 403 }
    );
  }

  const searchParams = new URL(req.url).searchParams;
  const advertiserId = searchParams.get('advertiser_id') ?? '';
  const creativeId = searchParams.get('creative_id') ?? '';

  if (!ADVERTISER_ID.test(advertiserId) || !CREATIVE_ID.test(creativeId)) {
    return errorResponse(400, 'invalid_id', 'Mã nhà quảng cáo hoặc creative không hợp lệ.');
  }

  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const resolved = resolveTrafficCredentials(settings?.toObject());
  if (!resolved.serpapi.value) {
    return errorResponse(500, 'missing_api_key', 'Chưa cấu hình SERPAPI_KEY trên máy chủ.');
  }

  try {
    const data = await getAdDetail(advertiserId, creativeId, resolved.serpapi.value);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  } catch (error) {
    if (error instanceof AdsApiError) {
      return errorResponse(error.status, error.code, error.message);
    }
    return errorResponse(502, 'unexpected_error', 'Không thể lấy chi tiết creative lúc này.');
  }
}
