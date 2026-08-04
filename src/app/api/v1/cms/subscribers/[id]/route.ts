import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// DELETE /api/v1/cms/subscribers/:id - Xóa Email Subscriber
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const subId = parseInt(id, 10);
  if (isNaN(subId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
  }

  try {
    await db.delete(subscribers).where(eq(subscribers.id, subId));
    return NextResponse.json({ status: 'success', message: 'Đã xóa email thành công' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa email subscriber' }, { status: 500 });
  }
}
