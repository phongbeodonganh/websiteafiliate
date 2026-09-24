import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';

// D-08: ISR with 3600s revalidation — one Atlas query per hour max.
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const baseUrl = normalizeSiteUrl(settings?.canonicalUrl);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
