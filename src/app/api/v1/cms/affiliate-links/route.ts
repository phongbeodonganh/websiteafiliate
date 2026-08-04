import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateLinks } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { desc } from 'drizzle-orm';

// GET /api/v1/cms/affiliate-links
export async function GET(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }

  try {
    const links = await db
      .select()
      .from(affiliateLinks)
      .orderBy(desc(affiliateLinks.createdAt));

    return NextResponse.json({
      status: 'success',
      data: links,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách affiliate links' }, { status: 500 });
  }
}

// POST /api/v1/cms/affiliate-links (Admin Only)
export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, base_url, commission, cookie } = body;

    if (!name || !base_url) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng nhập Tên chiến dịch và Link gốc' },
        { status: 400 }
      );
    }

    const [newLink] = await db
      .insert(affiliateLinks)
      .values({
        name,
        baseUrl: base_url,
        commission: commission || 'N/A',
        cookie: cookie || '30 ngày',
      })
      .returning();

    return NextResponse.json({
      status: 'success',
      data: newLink,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi thêm mới affiliate link' }, { status: 500 });
  }
}
