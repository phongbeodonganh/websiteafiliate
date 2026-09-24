import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SettingModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';

// D-08: ISR with 3600s revalidation — one Atlas query per hour max; crawlers
// get cached sitemap between revalidations. CMS writes bust the cache via
// revalidateSitemap() (wired in 03-03).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectToDatabase();

  const settings = await SettingModel.findOne();
  const baseUrl = normalizeSiteUrl(settings?.canonicalUrl);

  const [articles, categories] = await Promise.all([
    ArticleModel.find({ status: 'published' })
      .select('slug updated_at created_at')
      .sort({ created_at: -1 })
      .lean(),
    CategoryModel.aggregate([
      {
        $lookup: {
          from: ArticleModel.collection.name,
          let: { categoryId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$category_id', '$$categoryId'] }, { $eq: ['$status', 'published'] }] } } },
            { $limit: 1 },
          ],
          as: 'publishedArticles',
        },
      },
      { $match: { 'publishedArticles.0': { $exists: true } } },
      { $project: { slug: 1, created_at: 1 } },
    ]),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/article/${article.slug}`,
    lastModified: article.updated_at || article.created_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/category/${category.slug}`,
    lastModified: category.created_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const newestContentDate = articles[0]?.updated_at || articles[0]?.created_at;
  const trustPagesUpdated = new Date('2026-09-04T00:00:00.000Z');
  const staticEntrySeeds: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/latest', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/hottest', changeFrequency: 'daily' as const, priority: 0.7 },
    { path: '/editorial-picks', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/affiliates', changeFrequency: 'weekly' as const, priority: 0.6 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.5, lastModified: trustPagesUpdated },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.5, lastModified: trustPagesUpdated },
    { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3, lastModified: trustPagesUpdated },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3, lastModified: trustPagesUpdated },
    { path: '/affiliate-disclosure', changeFrequency: 'yearly' as const, priority: 0.4, lastModified: trustPagesUpdated },
  ];
  const staticEntries: MetadataRoute.Sitemap = staticEntrySeeds.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    ...(entry.lastModified || newestContentDate
      ? { lastModified: entry.lastModified || newestContentDate }
      : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
  ];
}
