import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { clearAllTrafficCaches } from '@/lib/traffic/caches';
import { maskKey, missingEnvNames, resolveTrafficCredentials } from '@/lib/traffic/credentials';

export const runtime = 'nodejs';

type MaskedShape = {
  tabApiKey: string | null;
  serpApiKey: string | null;
  whoisApiKey: string | null;
  seRankingApiKey: string | null;
  trustpilotScraperUrl: string | null;
};

type SourceShape = {
  tabApiKey: 'db' | 'env' | null;
  serpApiKey: 'db' | 'env' | null;
  whoisApiKey: 'db' | 'env' | null;
  seRankingApiKey: 'db' | 'env' | null;
  trustpilotScraperUrl: 'db' | 'env' | null;
};

function maskedPayload(masked: MaskedShape, source: SourceShape, months: number, missing: string[]) {
  return { masked, source, months, missing };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can view Traffic settings.' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const settings = await SettingModel.findOne();
    const resolved = resolveTrafficCredentials(settings?.toObject());

    const masked: MaskedShape = {
      tabApiKey: maskKey(resolved.tabapi.value),
      serpApiKey: maskKey(resolved.serpapi.value),
      whoisApiKey: maskKey(resolved.whois.value),
      seRankingApiKey: maskKey(resolved.seranking.value),
      trustpilotScraperUrl: maskKey(resolved.trustpilotScraperUrl.value),
    };
    const source: SourceShape = {
      tabApiKey: resolved.tabapi.source,
      serpApiKey: resolved.serpapi.source,
      whoisApiKey: resolved.whois.source,
      seRankingApiKey: resolved.seranking.source,
      trustpilotScraperUrl: resolved.trustpilotScraperUrl.source,
    };

    return NextResponse.json({
      status: 'success',
      data: maskedPayload(masked, source, resolved.months, missingEnvNames(resolved)),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to load Traffic settings.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can update Traffic settings.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { tabApiKey, serpApiKey, whoisApiKey, seRankingApiKey, trustpilotScraperUrl, months } = body;

    let parsedMonths: number | undefined;
    if (months !== undefined) {
      const value = Number(months);
      if (!Number.isInteger(value) || value < 3 || value > 12) {
        return NextResponse.json(
          { status: 'error', message: 'Số tháng dữ liệu phải là số nguyên từ 3 đến 12.' },
          { status: 400 }
        );
      }
      parsedMonths = value;
    }

    await connectToDatabase();
    let settings = await SettingModel.findOne();
    if (!settings) {
      settings = new SettingModel();
    }

    const storeKey = (input: unknown): string | undefined => {
      if (input === undefined) return undefined;
      return String(input).trim();
    };

    const tabApiKeyTrimmed = storeKey(tabApiKey);
    if (tabApiKeyTrimmed !== undefined) settings.traffic_tabapi_key = tabApiKeyTrimmed;
    const serpApiKeyTrimmed = storeKey(serpApiKey);
    if (serpApiKeyTrimmed !== undefined) settings.traffic_serpapi_key = serpApiKeyTrimmed;
    const whoisApiKeyTrimmed = storeKey(whoisApiKey);
    if (whoisApiKeyTrimmed !== undefined) settings.traffic_whois_api_key = whoisApiKeyTrimmed;
    const seRankingApiKeyTrimmed = storeKey(seRankingApiKey);
    if (seRankingApiKeyTrimmed !== undefined) settings.traffic_seranking_api_key = seRankingApiKeyTrimmed;
    const trustpilotScraperUrlTrimmed = storeKey(trustpilotScraperUrl);
    if (trustpilotScraperUrlTrimmed !== undefined) settings.traffic_trustpilot_scraper_url = trustpilotScraperUrlTrimmed;
    if (parsedMonths !== undefined) settings.traffic_months = parsedMonths;
    settings.updated_at = new Date();

    await settings.save();
    clearAllTrafficCaches();

    const resolved = resolveTrafficCredentials(settings.toObject());
    const masked: MaskedShape = {
      tabApiKey: maskKey(resolved.tabapi.value),
      serpApiKey: maskKey(resolved.serpapi.value),
      whoisApiKey: maskKey(resolved.whois.value),
      seRankingApiKey: maskKey(resolved.seranking.value),
      trustpilotScraperUrl: maskKey(resolved.trustpilotScraperUrl.value),
    };
    const source: SourceShape = {
      tabApiKey: resolved.tabapi.source,
      serpApiKey: resolved.serpapi.source,
      whoisApiKey: resolved.whois.source,
      seRankingApiKey: resolved.seranking.source,
      trustpilotScraperUrl: resolved.trustpilotScraperUrl.source,
    };

    return NextResponse.json({
      status: 'success',
      data: maskedPayload(masked, source, resolved.months, missingEnvNames(resolved)),
    });
  } catch (error) {
    console.error('Traffic config save error:', error);
    return NextResponse.json({ status: 'error', message: 'Unable to save Traffic settings.' }, { status: 500 });
  }
}
