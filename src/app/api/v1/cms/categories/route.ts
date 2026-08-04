import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    await connectToDatabase();
    const allCategories = await CategoryModel.find().sort({ created_at: -1 });
    const allSubCategories = await SubCategoryModel.find();

    const data = allCategories.map((cat) => {
      const catObj = cat.toObject();
      const subs = allSubCategories
        .filter((sub) => sub.category_id.toString() === cat._id.toString())
        .map((sub) => ({
          id: sub._id.toString(),
          categoryId: sub.category_id.toString(),
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          metaTitle: sub.meta_title,
          metaDescription: sub.meta_description,
          createdAt: sub.created_at,
        }));

      return {
        id: catObj._id.toString(),
        name: catObj.name,
        slug: catObj.slug,
        description: catObj.description,
        metaTitle: catObj.meta_title,
        metaDescription: catObj.meta_description,
        createdAt: catObj.created_at,
        subCategories: subs,
      };
    });

    return NextResponse.json({
      status: 'success',
      data,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, slug, description, metaTitle, metaDescription } = body;

    if (!name || !slug) {
      return NextResponse.json({ status: 'error', message: 'Name and slug are required' }, { status: 400 });
    }

    await connectToDatabase();
    const formattedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');

    const inserted = await CategoryModel.create({
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
        name: inserted.name,
        slug: inserted.slug,
        description: inserted.description,
        metaTitle: inserted.meta_title,
        metaDescription: inserted.meta_description,
        createdAt: inserted.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error?.code === 11000) {
      return NextResponse.json({ status: 'error', message: 'Slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', message: 'Failed to create category' }, { status: 500 });
  }
}
