import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import ArticleDetailPage, {
  generateMetadata as generateArticleMetadata,
} from '@/app/[categorySlug]/[subCategorySlug]/[slug]/page';
export { serializeJsonLd } from '@/lib/seo';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Public structured-data contract. The renderer delegated to below emits this
// schema with mainEntityOfPage set to the canonical /article/[slug] URL.
export const ARTICLE_SCHEMA_TYPE = 'NewsArticle';
export const ARTICLE_MAIN_ENTITY_PROPERTY = 'mainEntityOfPage';

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

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateArticleMetadata({
    params: Promise.resolve({ categorySlug: 'article', slug }),
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return ArticleDetailPage({
    params: Promise.resolve({ categorySlug: 'article', slug }),
  });
}
