import { notFound, permanentRedirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel } from '@/lib/db/models';
import { categoryPath } from '@/lib/routes';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyCategoryRedirect({ params }: CategoryPageProps) {
  const { slug } = await params;
  await connectToDatabase();
  const category = await CategoryModel.findOne({ slug }).select('slug').lean();
  if (!category) notFound();
  permanentRedirect(categoryPath(category.slug));
}
