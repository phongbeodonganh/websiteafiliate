import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionClient from '../../collection-client';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel } from '@/lib/db/models';
import { createPageMetadata } from '@/lib/seo';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const category = await CategoryModel.findOne({ slug }).select('name description meta_title meta_description').lean();

  if (!category) {
    return {
      title: 'Category Not Found',
      robots: { index: false, follow: false },
    };
  }

  return createPageMetadata({
    title: category.meta_title || `${category.name} Articles`,
    description: category.meta_description || category.description || `Browse all published articles in ${category.name}.`,
    path: `/category/${slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  await connectToDatabase();
  const exists = await CategoryModel.exists({ slug });
  if (!exists) notFound();
  return <CollectionClient kind="category" categorySlug={slug} />;
}
