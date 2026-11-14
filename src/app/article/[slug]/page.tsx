import { notFound, permanentRedirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import { articlePath } from '@/lib/routes';

interface LegacyArticlePageProps {
  params: Promise<{ slug: string }>;
}

async function loadArticlePageData(slug: string) {
  await connectToDatabase();
  const [article, settings] = await Promise.all([
    ArticleModel.findOne({ slug, status: 'published' })
      .populate('author_id', 'name username avatar')
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug')
      .populate('affiliate_placements.affiliate_link_id', 'name description commission cookie'),
    SettingModel.findOne().lean(),
  ]);
  if (!article) return null;
  return {
    doc: article.toObject() as unknown as Record<string, unknown>,
    settings: settings ? settings as unknown as Record<string, unknown> : null,
  };
}

// Keep the server-side data-loader contract while this legacy URL redirects
// to the category-aware canonical route.
export const fetchArticlePageData = cache(async (slug: string) => {
  try {
    return await unstable_cache(
      () => loadArticlePageData(slug),
      [`article-${slug}`],
      { tags: [`article-${slug}`], revalidate: 60 },
    )();
  } catch {
    return loadArticlePageData(slug);
  }
});

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
