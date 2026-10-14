import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, ProductModel, SettingModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';
import { COUPON_GUIDES, DEAL_CATEGORIES } from '@/lib/marketplace';
import { getPublishedStores } from '@/lib/stores/public';

// D-08: ISR with 3600s revalidation — one Atlas query per hour max; crawlers
// get cached sitemap between revalidations. CMS writes bust the cache via
// revalidateSitemap() (wired in 03-03).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = normalizeSiteUrl();
  let articleEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];
  let productEntries: MetadataRoute.Sitemap = [];
  let newestContentDate: Date | undefined;

  try {
    await connectToDatabase();

    const settings = await SettingModel.findOne();
    baseUrl = normalizeSiteUrl(settings?.canonicalUrl);

    const [articles, categories, products] = await Promise.all([
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
      ProductModel.find({ status: 'published' })
        .select('slug updated_at created_at')
        .sort({ updated_at: -1 })
        .lean(),
    ]);

    articleEntries = articles.map((article) => ({
      url: `${baseUrl}/article/${article.slug}`,
      lastModified: article.updated_at || article.created_at,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const marketplaceCategorySlugs = new Set(DEAL_CATEGORIES.map((category) => category.slug));
    categoryEntries = categories.filter((category) => !marketplaceCategorySlugs.has(category.slug)).map((category) => ({
      url: `${baseUrl}/category/${category.slug}`,
      lastModified: category.created_at,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    productEntries = products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updated_at || product.created_at,
      changeFrequency: 'daily',
      priority: 0.9,
    }));

    newestContentDate = products[0]?.updated_at || products[0]?.created_at || articles[0]?.updated_at || articles[0]?.created_at;
  } catch {
    // Build-time prerender (e.g. CI) has no MongoDB — emit static entries only;
    // ISR revalidation (or revalidateSitemap() on CMS writes) refreshes at runtime.
  }

  const trustPagesUpdated = new Date('2026-10-11T00:00:00.000Z');
  const staticEntrySeeds: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/stores', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/how-we-verify-coupons', changeFrequency: 'monthly' as const, priority: 0.7, lastModified: trustPagesUpdated },
    { path: '/latest', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/hottest', changeFrequency: 'daily' as const, priority: 0.7 },
    { path: '/editorial-picks', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/affiliates', changeFrequency: 'weekly' as const, priority: 0.6 },
    { path: '/about-us', changeFrequency: 'monthly' as const, priority: 0.5, lastModified: trustPagesUpdated },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.5, lastModified: trustPagesUpdated },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3, lastModified: trustPagesUpdated },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3, lastModified: trustPagesUpdated },
    { path: '/disclosure', changeFrequency: 'yearly' as const, priority: 0.4, lastModified: trustPagesUpdated },
  ];
  const staticEntries: MetadataRoute.Sitemap = staticEntrySeeds.map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    ...(entry.lastModified || newestContentDate
      ? { lastModified: entry.lastModified || newestContentDate }
      : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
  const marketplaceEntries: MetadataRoute.Sitemap = [
    ...(await getPublishedStores()).map((store) => ({ url: `${baseUrl}/store/${store.slug}`, lastModified: store.updatedAt ? new Date(store.updatedAt) : trustPagesUpdated, changeFrequency: 'daily' as const, priority: 0.85 })),
    ...DEAL_CATEGORIES.map((category) => ({ url: `${baseUrl}/category/${category.slug}`, lastModified: trustPagesUpdated, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...COUPON_GUIDES.map((guide) => ({ url: `${baseUrl}/guide/${guide.slug}`, lastModified: trustPagesUpdated, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];

  return [
    ...staticEntries,
    ...marketplaceEntries,
    ...categoryEntries,
    ...productEntries,
    ...articleEntries,
  ];
}
