import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { DomainValidationError, normalizeDomain } from '@/lib/traffic/domain';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { AdsApiError, getAds } from '@/lib/traffic/ads-transparency';

export const runtime = 'nodejs';

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

  let domain: string;

  try {
    domain = normalizeDomain(new URL(req.url).searchParams.get('domain'));
  } catch (error) {
    const message = error instanceof DomainValidationError ? error.message : 'Tên miền không hợp lệ.';
    return errorResponse(400, 'invalid_domain', message);
  }

  // no_cache=true chỉ từ nút "Làm mới" (có xác nhận) — gọi lại SerpApi, tốn 1 lượt.
  const noCache = new URL(req.url).searchParams.get('no_cache') === 'true';

  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const resolved = resolveTrafficCredentials(settings?.toObject());
  if (!resolved.serpapi.value) {
    return errorResponse(500, 'missing_api_key', 'Chưa cấu hình SERPAPI_KEY trên máy chủ.');
  }

  try {
    const data = await getAds(domain, resolved.serpapi.value, { noCache });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
    });
  } catch (error) {
    if (error instanceof AdsApiError) {
      return errorResponse(error.status, error.code, error.message);
    }
    return errorResponse(502, 'unexpected_error', 'Không thể lấy dữ liệu quảng cáo lúc này.');
  }
}
