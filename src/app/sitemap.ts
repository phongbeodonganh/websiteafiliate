import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SettingModel, SubCategoryModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';
import { articlePath, categoryPath, subCategoryPath } from '@/lib/routes';

// Buộc render động mỗi request thay vì cố static-generate lúc `next build` — route
// này cần MONGODB_URI để đọc danh sách bài viết, mà môi trường build (CI) không có
// (và không nên có) kết nối DB. Runtime thật (VPS) luôn có DB, nên bài mới publish
// hiện ngay trong sitemap mà không cần đợi revalidate hay redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectToDatabase();

  const settings = await SettingModel.findOne();
  const baseUrl = normalizeSiteUrl(settings?.canonicalUrl);

  const [articles, categories, subCategories] = await Promise.all([
    ArticleModel.find({ status: 'published' })
      .select('slug category_id sub_category_id updated_at created_at')
      .populate('category_id', 'slug')
      .populate('sub_category_id', 'slug')
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
    SubCategoryModel.aggregate([
      {
        $lookup: {
          from: ArticleModel.collection.name,
          let: { subCategoryId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$sub_category_id', '$$subCategoryId'] }, { $eq: ['$status', 'published'] }] } } },
            { $limit: 1 },
          ],
          as: 'publishedArticles',
        },
      },
      { $match: { 'publishedArticles.0': { $exists: true } } },
      { $lookup: { from: CategoryModel.collection.name, localField: 'category_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { slug: 1, created_at: 1, categorySlug: '$category.slug' } },
    ]),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}${articlePath({
      slug: article.slug,
      categorySlug: (article.category_id as unknown as { slug?: string } | undefined)?.slug,
      subCategorySlug: (article.sub_category_id as unknown as { slug?: string } | undefined)?.slug,
    })}`,
    lastModified: article.updated_at || article.created_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}${categoryPath(category.slug)}`,
    lastModified: category.created_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const subCategoryEntries: MetadataRoute.Sitemap = subCategories.map((subCategory) => ({
    url: `${baseUrl}${subCategoryPath(subCategory.categorySlug, subCategory.slug)}`,
    lastModified: subCategory.created_at,
    changeFrequency: 'weekly',
    priority: 0.65,
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
    ...subCategoryEntries,
    ...articleEntries,
  ];
}
