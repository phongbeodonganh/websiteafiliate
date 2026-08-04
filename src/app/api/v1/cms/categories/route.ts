import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, subCategories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allCategories = await db.select().from(categories);
    const allSubCategories = await db.select().from(subCategories);

    const data = allCategories.map((cat) => ({
      ...cat,
      subCategories: allSubCategories.filter((sub) => sub.categoryId === cat.id),
    }));

    return NextResponse.json({
      status: 'success',
      data,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/v1/cms/categories - Tạo Danh mục mới (Level 1)
export async function POST(req: Request) {
  const { getAuthUser } = await import('@/lib/auth');
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

    const [inserted] = await db
      .insert(categories)
      .values({
        name,
        slug: slug.toLowerCase().trim().replace(/\s+/g, '-'),
        description,
        metaTitle,
        metaDescription,
      })
      .returning();

    return NextResponse.json({
      status: 'success',
      data: inserted,
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ status: 'error', message: 'Slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', message: 'Failed to create category' }, { status: 500 });
  }
}

