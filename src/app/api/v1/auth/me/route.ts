import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized - Token không hợp lệ hoặc đã hết hạn' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: 'success',
    data: user,
  });
}
