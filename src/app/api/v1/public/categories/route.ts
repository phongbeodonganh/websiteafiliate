import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel, ArticleModel } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    const allCategories = await CategoryModel.find().sort({ show_on_homepage: -1, nav_order: 1, created_at: 1 });
    const allSubCategories = await SubCategoryModel.find();
    const allArticles = await ArticleModel.find({ status: 'published' }, 'category_id sub_category_id');

    const data = allCategories.map((cat) => {
      const catDoc = cat.toObject();
      const catIdStr = catDoc._id.toString();

      const subs = allSubCategories
        .filter((sub) => sub.category_id.toString() === catIdStr)
        .map((sub) => {
          const subDoc = sub.toObject();
          const subIdStr = subDoc._id.toString();
          return {
            id: subIdStr,
            categoryId: catIdStr,
            name: subDoc.name,
            slug: subDoc.slug,
            description: subDoc.description,
            metaTitle: subDoc.meta_title,
            metaDescription: subDoc.meta_description,
            createdAt: subDoc.created_at,
            articleCount: allArticles.filter((a) => a.sub_category_id?.toString() === subIdStr).length,
          };
        });

      return {
        id: catIdStr,
        name: catDoc.name,
        slug: catDoc.slug,
        description: catDoc.description,
        metaTitle: catDoc.meta_title,
        metaDescription: catDoc.meta_description,
        homepageImageUrl: catDoc.homepage_image_url,
        showOnHomepage: catDoc.show_on_homepage,
        navOrder: catDoc.nav_order,
        createdAt: catDoc.created_at,
        articleCount: allArticles.filter((a) => a.category_id?.toString() === catIdStr).length,
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
