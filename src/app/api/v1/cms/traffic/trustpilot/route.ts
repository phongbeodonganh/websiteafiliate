import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { DomainValidationError, normalizeDomain } from '@/lib/traffic/domain';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { TrustpilotApiError, getTrustpilotProfile } from '@/lib/traffic/trustpilot';
import type { TrustpilotResponse, TrustpilotResult, TrustpilotSlice } from '@/types/traffic';

export const runtime = 'nodejs';

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function toErrorSlice(reason: unknown): TrustpilotSlice<TrustpilotResult> {
  if (reason instanceof TrustpilotApiError) {
    return { data: null, error: { code: reason.code, message: reason.message } };
  }
  return {
    data: null,
    error: { code: 'unexpected_error', message: 'Không thể lấy đánh giá Trustpilot lúc này.' },
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
  const baseUrl = resolved.trustpilotScraperUrl.value;
  if (!baseUrl) {
    return errorResponse(
      500,
      'missing_scraper_url',
      'Chưa cấu hình TRUSTPILOT_SCRAPER_URL trên máy chủ.'
    );
  }

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
  } catch {
    return errorResponse(500, 'invalid_scraper_url', 'TRUSTPILOT_SCRAPER_URL không hợp lệ.');
  }

  let trustpilot: TrustpilotSlice<TrustpilotResult>;
  try {
    trustpilot = { data: await getTrustpilotProfile(domain, baseUrl), error: null };
  } catch (error) {
    trustpilot = toErrorSlice(error);
  }

  return NextResponse.json<TrustpilotResponse>(
    { domain, trustpilot },
    { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
  );
}
