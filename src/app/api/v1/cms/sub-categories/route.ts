import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subCategories } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';

// GET /api/v1/cms/sub-categories
export async function GET() {
  try {
    const list = await db.select().from(subCategories);
    return NextResponse.json({ status: 'success', data: list });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy danh sách danh mục con' }, { status: 500 });
  }
}

// POST /api/v1/cms/sub-categories - Tạo Sub-category mới (Level 2)
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

    const [inserted] = await db
      .insert(subCategories)
      .values({
        categoryId: Number(categoryId),
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
    console.error('Error creating sub-category:', error);
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ status: 'error', message: 'Slug sub-category đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', message: 'Lỗi tạo danh mục con' }, { status: 500 });
  }
}
