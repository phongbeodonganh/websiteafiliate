import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { POST as runInsiderDigest } from '@/app/api/v1/cron/insider-digest/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const cronSecret = process.env.INSIDER_CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { status: 'error', message: 'INSIDER_CRON_SECRET is not configured' },
      { status: 503 },
    );
  }

  console.log('Manual Insider digest requested:', { username: user.username, userId: user.userId });
  const digestUrl = new URL(req.url);
  digestUrl.searchParams.set('period', 'current');
  const internalRequest = new Request(digestUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  return runInsiderDigest(internalRequest);
}
