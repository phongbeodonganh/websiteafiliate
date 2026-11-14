import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionClient from '../../collection-client';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { subCategoryPath } from '@/lib/routes';
import { createPageMetadata } from '@/lib/seo';
import ArticleDetailPage, {
  generateMetadata as generateArticleMetadata,
} from './[slug]/page';

interface SubCategoryPageProps {
  params: Promise<{ categorySlug: string; subCategorySlug: string }>;
}

async function getRouteData(categorySlug: string, subCategorySlug: string) {
  const category = await CategoryModel.findOne({ slug: categorySlug }).select('_id name slug').lean();
  if (!category) return null;
  const [subCategory, article] = await Promise.all([
    SubCategoryModel.findOne({
      slug: subCategorySlug,
      category_id: category._id,
    }).select('name description meta_title meta_description slug').lean(),
    ArticleModel.exists({
      slug: subCategorySlug,
      category_id: category._id,
      status: 'published',
      $or: [{ sub_category_id: { $exists: false } }, { sub_category_id: null }],
    }),
  ]);
  if (subCategory) return { kind: 'subcategory' as const, category, subCategory };
  if (article) return { kind: 'article' as const, category };
  return null;
}

export async function generateMetadata({ params }: SubCategoryPageProps): Promise<Metadata> {
  const { categorySlug, subCategorySlug } = await params;
  await connectToDatabase();
  const data = await getRouteData(categorySlug, subCategorySlug);
  if (!data) return { title: 'Subcategory Not Found', robots: { index: false, follow: false } };
  if (data.kind === 'article') {
    return generateArticleMetadata({
      params: Promise.resolve({ categorySlug, slug: subCategorySlug }),
    });
  }
  return createPageMetadata({
    title: data.subCategory.meta_title || `${data.subCategory.name} Articles`,
    description: data.subCategory.meta_description || data.subCategory.description || `Browse all published articles in ${data.subCategory.name}.`,
    path: subCategoryPath(categorySlug, subCategorySlug),
  });
}

export default async function SubCategoryPage({ params }: SubCategoryPageProps) {
  const { categorySlug, subCategorySlug } = await params;
  await connectToDatabase();
  const data = await getRouteData(categorySlug, subCategorySlug);
  if (!data) notFound();
  if (data.kind === 'article') {
    return ArticleDetailPage({
      params: Promise.resolve({ categorySlug, slug: subCategorySlug }),
    });
  }
  return <CollectionClient
    kind="subcategory"
    categorySlug={categorySlug}
    categoryName={data.category.name}
    subCategorySlug={subCategorySlug}
    subCategoryName={data.subCategory.name}
  />;
}
