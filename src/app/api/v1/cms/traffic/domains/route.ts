import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel, TrafficDomainModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { DomainValidationError, normalizeDomain } from '@/lib/traffic/domain';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { getTraffic, TrafficApiError } from '@/lib/traffic/tabapi';

export const runtime = 'nodejs';

export async function POST(req: Request) {
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

  let body: { domain?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let domain: string;
  try {
    domain = normalizeDomain(typeof body.domain === 'string' ? body.domain : null);
  } catch (error) {
    const message = error instanceof DomainValidationError ? error.message : 'Tên miền không hợp lệ.';
    return NextResponse.json(
      { status: 'error', error: { code: 'invalid_domain', message }, message },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();
    const settings = await SettingModel.findOne();
    const resolved = resolveTrafficCredentials(settings?.toObject());
    if (!resolved.tabapi.value) {
      const message = 'Chưa cấu hình TABAPI_KEY trên máy chủ.';
      return NextResponse.json(
        { status: 'error', error: { code: 'missing_api_key', message }, message },
        { status: 500 }
      );
    }

    const report = await getTraffic(domain, resolved.tabapi.value, resolved.months);
    const now = new Date();
    const row = await TrafficDomainModel.findOneAndUpdate(
      { domain },
      { domain, report, lastFetchedAt: now, lastError: null },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      status: 'success',
      data: {
        id: row._id.toString(),
        domain: row.domain,
        report: row.report,
        lastFetchedAt: row.lastFetchedAt,
        workStatus: row.workStatus,
        workNote: row.workNote,
      },
    });
  } catch (error) {
    if (error instanceof TrafficApiError) {
      return NextResponse.json(
        { status: 'error', error: { code: error.code, message: error.message }, message: error.message },
        { status: error.status }
      );
    }
    const message = 'Không thể lấy dữ liệu website lúc này.';
    return NextResponse.json(
      { status: 'error', error: { code: 'unexpected_error', message }, message },
      { status: 502 }
    );
  }
}

// Admin scale is tens of tracked domains — the full list (stored reports included)
// is returned without pagination in this phase.
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can view Traffic domains.' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const rows = await TrafficDomainModel.find().sort({ lastFetchedAt: -1 });

    return NextResponse.json({
      status: 'success',
      data: rows.map((row) => ({
        id: row._id.toString(),
        domain: row.domain,
        report: row.report,
        lastFetchedAt: row.lastFetchedAt,
        lastError: row.lastError,
        updatedAt: row.updatedAt,
        workStatus: row.workStatus,
        workNote: row.workNote,
      })),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to load Traffic domains.' }, { status: 500 });
  }
}
