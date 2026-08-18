import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';

// Buộc render động mỗi request thay vì cố static-generate lúc `next build` — route
// này cần MONGODB_URI để đọc danh sách bài viết, mà môi trường build (CI) không có
// (và không nên có) kết nối DB. Runtime thật (VPS) luôn có DB, nên bài mới publish
// hiện ngay trong sitemap mà không cần đợi revalidate hay redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectToDatabase();

  const settings = await SettingModel.findOne();
  const baseUrl = (settings?.canonicalUrl || 'https://aidealsuk.com').replace(/\/$/, '');

  const articles = await ArticleModel.find({ status: 'published' })
    .select('slug updated_at created_at')
    .sort({ created_at: -1 });

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/article/${article.slug}`,
    lastModified: article.updated_at || article.created_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...articleEntries,
  ];
}
