import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, subCategories, articles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const allCategories = await db.select().from(categories);
    const allSubCategories = await db.select().from(subCategories);
    const allArticles = await db.select({
      id: articles.id,
      categoryId: articles.categoryId,
      subCategoryId: articles.subCategoryId,
    }).from(articles).where(eq(articles.status, 'published'));

    const data = allCategories.map((cat) => {
      const subs = allSubCategories
        .filter((sub) => sub.categoryId === cat.id)
        .map((sub) => ({
          ...sub,
          articleCount: allArticles.filter((a) => a.subCategoryId === sub.id).length,
        }));

      return {
        ...cat,
        articleCount: allArticles.filter((a) => a.categoryId === cat.id).length,
        subCategories: subs,
      };
    });

    return NextResponse.json({
      status: 'success',
      data,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public categories' }, { status: 500 });
  }
}
