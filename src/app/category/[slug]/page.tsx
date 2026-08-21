import type { Metadata } from 'next';
import CollectionClient from '../../collection-client';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

function labelFromSlug(slug: string) {
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = labelFromSlug(slug);
  return { title: `${label} Articles`, description: `Browse all published articles in ${label}.` };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  return <CollectionClient kind="category" categorySlug={slug} />;
}
