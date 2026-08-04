import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subCategories } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// PUT /api/v1/cms/sub-categories/:id - Sửa danh mục con
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const subCatId = parseInt(id, 10);
  if (isNaN(subCatId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { categoryId, name, slug, description, metaTitle, metaDescription } = body;

    const [updated] = await db
      .update(subCategories)
      .set({
        categoryId: categoryId ? Number(categoryId) : undefined,
        name,
        slug: slug ? slug.toLowerCase().trim().replace(/\s+/g, '-') : undefined,
        description,
        metaTitle,
        metaDescription,
      })
      .where(eq(subCategories.id, subCatId))
      .returning();

    return NextResponse.json({
      status: 'success',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật danh mục con' }, { status: 500 });
  }
}

// DELETE /api/v1/cms/sub-categories/:id - Xóa danh mục con
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const subCatId = parseInt(id, 10);
  if (isNaN(subCatId)) {
    return NextResponse.json({ status: 'error', message: 'Invalid ID' }, { status: 400 });
  }

  try {
    await db.delete(subCategories).where(eq(subCategories.id, subCatId));
    return NextResponse.json({ status: 'success', message: 'Đã xóa danh mục con' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa danh mục con' }, { status: 500 });
  }
}
