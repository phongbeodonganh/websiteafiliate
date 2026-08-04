import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubCategoryModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    await connectToDatabase();
    const list = await SubCategoryModel.find().sort({ created_at: -1 });
    const data = list.map((sub) => ({
      id: sub._id.toString(),
      categoryId: sub.category_id.toString(),
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      metaTitle: sub.meta_title,
      metaDescription: sub.meta_description,
      createdAt: sub.created_at,
    }));
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách danh mục con' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { categoryId, name, slug, description, metaTitle, metaDescription } = body;

    if (!categoryId || !name || !slug) {
      return NextResponse.json({ status: 'error', message: 'CategoryId, name, and slug are required' }, { status: 400 });
    }

    await connectToDatabase();
    const formattedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');

    const inserted = await SubCategoryModel.create({
      category_id: categoryId,
      name,
      slug: formattedSlug,
      description,
      meta_title: metaTitle,
      meta_description: metaDescription,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        id: inserted._id.toString(),
        categoryId: inserted.category_id.toString(),
        name: inserted.name,
        slug: inserted.slug,
        description: inserted.description,
        metaTitle: inserted.meta_title,
        metaDescription: inserted.meta_description,
        createdAt: inserted.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating sub-category:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ status: 'error', message: 'Slug sub-category đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', message: 'Lỗi tạo danh mục con' }, { status: 500 });
  }
}
