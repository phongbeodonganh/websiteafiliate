import { NextRequest, NextResponse } from 'next/server';
import { checkUrlAgainstBlacklist, extractDomainFromUrl } from '@/lib/blacklist';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        status: 'success',
        data: { isBlacklisted: false },
      });
    }

    const domainInfo = extractDomainFromUrl(url);
    const result = await checkUrlAgainstBlacklist(url);

    return NextResponse.json({
      status: 'success',
      data: {
        ...result,
        domainInfo,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Error checking blacklist' },
      { status: 500 }
    );
  }
}
