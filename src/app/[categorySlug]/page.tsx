import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionClient from '../collection-client';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel } from '@/lib/db/models';
import { categoryPath } from '@/lib/routes';
import { createPageMetadata } from '@/lib/seo';

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  await connectToDatabase();
  const category = await CategoryModel.findOne({ slug: categorySlug })
    .select('name description meta_title meta_description')
    .lean();
  if (!category) return { title: 'Category Not Found', robots: { index: false, follow: false } };
  return createPageMetadata({
    title: category.meta_title || `${category.name} Articles`,
    description: category.meta_description || category.description || `Browse all published articles in ${category.name}.`,
    path: categoryPath(categorySlug),
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  await connectToDatabase();
  const category = await CategoryModel.findOne({ slug: categorySlug }).select('name').lean();
  if (!category) notFound();
  return <CollectionClient kind="category" categorySlug={categorySlug} categoryName={category.name} />;
}
