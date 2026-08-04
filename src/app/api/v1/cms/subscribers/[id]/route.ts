import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectToDatabase();
    await SubscriberModel.findByIdAndDelete(id);
    return NextResponse.json({ status: 'success', message: 'Đã xóa email thành công' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa email subscriber' }, { status: 500 });
  }
}
