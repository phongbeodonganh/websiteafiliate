import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { status: 'error', message: 'Your session is invalid or has expired. Please sign in again.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: 'success',
    data: user,
  });
}
