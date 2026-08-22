import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SettingModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';

// Buộc render động mỗi request thay vì cố static-generate lúc `next build` — route
// này cần MONGODB_URI để đọc danh sách bài viết, mà môi trường build (CI) không có
// (và không nên có) kết nối DB. Runtime thật (VPS) luôn có DB, nên bài mới publish
// hiện ngay trong sitemap mà không cần đợi revalidate hay redeploy.
export const dynamic = 'force-dynamic';

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
  const staticEntries: MetadataRoute.Sitemap = [
    { path: '', changeFrequency: 'daily' as const, priority: 1 },
    { path: '/latest', changeFrequency: 'daily' as const, priority: 0.8 },
    { path: '/hottest', changeFrequency: 'daily' as const, priority: 0.7 },
    { path: '/editorial-picks', changeFrequency: 'weekly' as const, priority: 0.7 },
    { path: '/affiliates', changeFrequency: 'weekly' as const, priority: 0.6 },
  ].map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    ...(newestContentDate ? { lastModified: newestContentDate } : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
  ];
}
