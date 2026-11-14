import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { DomainValidationError, normalizeDomain } from '@/lib/traffic/domain';
import { resolveTrafficCredentials } from '@/lib/traffic/credentials';
import { SeRankingApiError, getSeRankingCompetitors } from '@/lib/traffic/seranking';
import type { SeRankingCompetitor, SeRankingCompetitorsResponse, SeRankingSlice } from '@/types/traffic';

export const runtime = 'nodejs';

const SOURCE_PATTERN = /^[a-z]{2}$/;
const DEFAULT_SOURCE = 'us';
const LIST_LIMIT = 10;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function toErrorSlice(reason: unknown): SeRankingSlice<SeRankingCompetitor[]> {
  if (reason instanceof SeRankingApiError) {
    return { data: null, error: { code: reason.code, message: reason.message } };
  }
  return {
    data: null,
    error: { code: 'unexpected_error', message: 'Không thể lấy dữ liệu SE Ranking lúc này.' },
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

  const source = new URL(req.url).searchParams.get('source') ?? DEFAULT_SOURCE;
  if (!SOURCE_PATTERN.test(source)) {
    return errorResponse(400, 'invalid_source', 'Mã cơ sở dữ liệu khu vực không hợp lệ.');
  }

  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const resolved = resolveTrafficCredentials(settings?.toObject());
  if (!resolved.seranking.value) {
    return errorResponse(500, 'missing_api_key', 'Chưa cấu hình SE_RANKING_API_KEY trên máy chủ.');
  }

  let competitors: SeRankingSlice<SeRankingCompetitor[]>;
  try {
    competitors = {
      data: await getSeRankingCompetitors(domain, source, LIST_LIMIT, resolved.seranking.value),
      error: null,
    };
  } catch (error) {
    competitors = toErrorSlice(error);
  }

  return NextResponse.json<SeRankingCompetitorsResponse>(
    { domain, source, competitors },
    { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
  );
}
