import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { blacklistToken } from '@/lib/tokenBlacklist';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  blacklistToken(token);

  return NextResponse.json({ status: 'success' });
}
