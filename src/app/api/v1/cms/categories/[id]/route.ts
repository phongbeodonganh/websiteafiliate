import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, slug, description, metaTitle, metaDescription } = body;

    await connectToDatabase();

    const cat = await CategoryModel.findById(id);
    if (!cat) {
      return NextResponse.json({ status: 'error', message: 'Category not found' }, { status: 404 });
    }

    if (name !== undefined) cat.name = name;
    if (slug !== undefined) cat.slug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    if (description !== undefined) cat.description = description;
    if (metaTitle !== undefined) cat.meta_title = metaTitle;
    if (metaDescription !== undefined) cat.meta_description = metaDescription;

    await cat.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        metaTitle: cat.meta_title,
        metaDescription: cat.meta_description,
        createdAt: cat.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: 'Lỗi cập nhật danh mục' }, { status: 500 });
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
    await CategoryModel.findByIdAndDelete(id);
    await SubCategoryModel.deleteMany({ category_id: id });

    return NextResponse.json({ status: 'success', message: 'Đã xóa danh mục' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi xóa danh mục' }, { status: 500 });
  }
}
