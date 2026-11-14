import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { DomainValidationError, normalizeDomain } from '@/lib/traffic/domain';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { getReferringSites, ReferringSitesApiError } from '@/lib/traffic/referring-sites';
import type { ReferringSitesResponse } from '@/types/traffic';

export const runtime = 'nodejs';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function toErrorSlice(reason: unknown): ReferringSitesResponse['referring_sites'] {
  if (reason instanceof ReferringSitesApiError) {
    return { data: null, error: { code: reason.code, message: reason.message } };
  }
  return {
    data: null,
    error: { code: 'unexpected_error', message: 'Không thể tải dữ liệu backlink lúc này.' },
  };
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

  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const resolved = resolveTrafficCredentials(settings?.toObject());
  if (!resolved.tabapi.value) {
    return errorResponse(500, 'missing_api_key', 'Chưa cấu hình TABAPI_KEY trên máy chủ.');
  }

  let referringSites: ReferringSitesResponse['referring_sites'];
  try {
    referringSites = { data: await getReferringSites(domain, resolved.tabapi.value), error: null };
  } catch (error) {
    referringSites = toErrorSlice(error);
  }

  return NextResponse.json<ReferringSitesResponse>(
    { domain, referring_sites: referringSites },
    { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
  );
}
