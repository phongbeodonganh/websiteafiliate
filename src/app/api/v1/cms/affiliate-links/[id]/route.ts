import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateLinks } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT /api/v1/cms/affiliate-links/:id (Admin Only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, base_url, commission, cookie } = body;

    const [updated] = await db
      .update(affiliateLinks)
      .set({
        ...(name && { name }),
        ...(base_url && { baseUrl: base_url }),
        ...(commission !== undefined && { commission }),
        ...(cookie !== undefined && { cookie }),
      })
      .where(eq(affiliateLinks.id, Number(id)))
      .returning();

    return NextResponse.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật affiliate link' }, { status: 500 });
  }
}

// DELETE /api/v1/cms/affiliate-links/:id (Admin Only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: '403 Forbidden - Chỉ Admin mới có quyền quản lý Link Affiliate' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await db.delete(affiliateLinks).where(eq(affiliateLinks.id, Number(id)));

    return NextResponse.json({
      status: 'success',
      message: 'Xóa affiliate link thành công',
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa affiliate link' }, { status: 500 });
  }
}
