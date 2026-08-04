import { NextResponse } from 'next/server';
import { seedMongoDB } from '@/lib/db/seed-mongodb';

export async function POST() {
  try {
    await seedMongoDB();
    return NextResponse.json({
      status: 'success',
      message: 'Khởi tạo (Seed) dữ liệu thành công cho MongoDB Atlas!',
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Khởi tạo dữ liệu thất bại' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
