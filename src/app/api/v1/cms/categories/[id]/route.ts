import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT /api/v1/cms/categories/:id - Sửa danh mục chính
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, slug, description, metaTitle, metaDescription } = body;

    const [updated] = await db
      .update(categories)
      .set({
        name,
        slug: slug ? slug.toLowerCase().trim().replace(/\s+/g, '-') : undefined,
        description,
        metaTitle,
        metaDescription,
      })
      .where(eq(categories.id, categoryId))
      .returning();

    return NextResponse.json({
      status: 'success',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật danh mục' }, { status: 500 });
  }
}

// DELETE /api/v1/cms/categories/:id - Xóa danh mục chính
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
  }

  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
    return NextResponse.json({ status: 'success', message: 'Đã xóa danh mục' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa danh mục' }, { status: 500 });
  }
}
