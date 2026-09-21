import { NextRequest, NextResponse } from 'next/server';
import { checkUrlAgainstBlacklist, extractDomainFromUrl } from '@/lib/blacklist';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }

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
