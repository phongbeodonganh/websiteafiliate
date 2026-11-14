import { notFound, permanentRedirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';
import { articlePath } from '@/lib/routes';

interface LegacyArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LegacyArticleRedirect({ params }: LegacyArticlePageProps) {
  const { slug } = await params;
  await connectToDatabase();
  const article = await ArticleModel.findOne({ slug, status: 'published' })
    .select('slug category_id sub_category_id')
    .populate('category_id', 'slug')
    .populate('sub_category_id', 'slug')
    .lean();

  if (!article) notFound();
  permanentRedirect(articlePath({
    slug: article.slug,
    categorySlug: (article.category_id as unknown as { slug?: string } | undefined)?.slug,
    subCategorySlug: (article.sub_category_id as unknown as { slug?: string } | undefined)?.slug,
  }));
}
