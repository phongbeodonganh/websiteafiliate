import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';

// Refresh periodically instead of only at build time, so newly published
// articles show up without requiring a full redeploy.
export const revalidate = 3600;

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
