import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubCategoryModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { categoryId, name, slug, description, metaTitle, metaDescription } = body;

    await connectToDatabase();
    const subCat = await SubCategoryModel.findById(id);

    if (!subCat) {
      return NextResponse.json({ status: 'error', message: 'Sub-category not found' }, { status: 404 });
    }

    if (categoryId !== undefined) subCat.category_id = categoryId;
    if (name !== undefined) subCat.name = name;
    if (slug !== undefined) subCat.slug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    if (description !== undefined) subCat.description = description;
    if (metaTitle !== undefined) subCat.meta_title = metaTitle;
    if (metaDescription !== undefined) subCat.meta_description = metaDescription;

    await subCat.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: subCat._id.toString(),
        categoryId: subCat.category_id.toString(),
        name: subCat.name,
        slug: subCat.slug,
        description: subCat.description,
        metaTitle: subCat.meta_title,
        metaDescription: subCat.meta_description,
        createdAt: subCat.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật danh mục con' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectToDatabase();
    await SubCategoryModel.findByIdAndDelete(id);
    return NextResponse.json({ status: 'success', message: 'Đã xóa danh mục con' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa danh mục con' }, { status: 500 });
  }
}
