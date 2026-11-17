import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { InsightsCacheModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { getGoogleInsightsStatus } from '@/lib/google/config';
import { buildInsightsPayload } from '@/lib/google/insights';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — tránh vượt quota GSC/GA4 khi admin mở lại tab nhiều lần trong ngày.
const ALLOWED_DAYS = [7, 28, 90];

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin xem được Insights' },
      { status: 403 }
    );
  }

  // Credentials resolve from the Setting document (Settings > "Tích hợp
  // Google") first, with env vars as fallback — so admin can fix this from
  // the UI without a redeploy.
  const insightsStatus = await getGoogleInsightsStatus();
  if (!insightsStatus.configured) {
    return NextResponse.json({
      status: 'success',
      configured: false,
      missingEnv: insightsStatus.missing,
      data: null,
    });
  }

  const searchParams = new URL(req.url).searchParams;
  const force = searchParams.get('force') === 'true';
  const requestedDays = Number(searchParams.get('days'));
  const days = ALLOWED_DAYS.includes(requestedDays) ? requestedDays : 28;
  const cacheKey = `insights:v1:${days}`;

  try {
    await connectToDatabase();

    if (!force) {
      const cached = await InsightsCacheModel.findOne({ key: cacheKey });
      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
        return NextResponse.json({
          status: 'success',
          configured: true,
          cachedAt: cached.fetchedAt,
          data: cached.data,
        });
      }
    }

    const data = await buildInsightsPayload(days);
    const fetchedAt = new Date();
    await InsightsCacheModel.findOneAndUpdate(
      { key: cacheKey },
      { key: cacheKey, data, fetchedAt },
      { upsert: true }
    );

    return NextResponse.json({ status: 'success', configured: true, cachedAt: fetchedAt, data });
  } catch (error) {
    console.error('Insights fetch error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Lỗi lấy dữ liệu Insights từ Google APIs' },
      { status: 500 }
    );
  }
}
