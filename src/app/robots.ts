import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const baseUrl = (settings?.canonicalUrl || 'https://aiaffiliatehub.com').replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
