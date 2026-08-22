import type { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { normalizeSiteUrl } from '@/lib/seo';

// Buộc render động mỗi request thay vì cố static-generate lúc `next build` — route
// này cần MONGODB_URI để đọc canonicalUrl, mà môi trường build (CI) không có (và
// không nên có) kết nối DB. Runtime thật (VPS) luôn có DB nên vẫn trả đúng dữ liệu.
export const dynamic = 'force-dynamic';

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
