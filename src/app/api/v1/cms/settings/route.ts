import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';

// GET /api/v1/cms/settings - Lấy cấu hình hệ thống & SEO
export async function GET(req: Request) {
  try {
    let currentSettings = await db.select().from(settings).where(eq(settings.id, 1)).get();

    if (!currentSettings) {
      const [inserted] = await db
        .insert(settings)
        .values({
          id: 1,
          siteTitle: 'NEXUS FINANCE',
          metaDescription: 'Nền tảng phân tích tài chính & crypto chuyên sâu. Cung cấp tín hiệu đầu tư và đánh giá sàn giao dịch khách quan nhất.',
          focusKeywords: 'crypto, tài chính, đầu tư, đánh giá sàn',
          canonicalUrl: 'https://nexusfinance.vn',
          hreflang: 'vi-VN',
          geoTarget: 'VN',
        })
        .returning();
      currentSettings = inserted;
    }

    return NextResponse.json({
      status: 'success',
      data: currentSettings,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy cấu hình hệ thống' }, { status: 500 });
  }
}

// PUT /api/v1/cms/settings - Lưu cấu hình hệ thống & SEO (Admin Only)
export async function PUT(req: Request) {
  const currentUser = getAuthUser(req);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: '403 Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      siteTitle,
      metaDescription,
      focusKeywords,
      canonicalUrl,
      hreflang,
      geoTarget,
      businessName,
      businessAddress,
      businessPhone,
      ogImageUrl,
      schemaJsonld,
      headScripts,
      primaryColor,
      accentColor,
      themeMode,
      fontFamily,
      logoUrl,
      faviconUrl,
      bannerText,
      footerText,
      customCss,
      geoLatitude,
      geoLongitude,
      geoRegionName,
      geoPlacename,
    } = body;

    const payload = {
      id: 1,
      siteTitle,
      metaDescription,
      focusKeywords,
      canonicalUrl,
      hreflang,
      geoTarget,
      businessName,
      businessAddress,
      businessPhone,
      ogImageUrl,
      schemaJsonld,
      headScripts,
      primaryColor,
      accentColor,
      themeMode,
      fontFamily,
      logoUrl,
      faviconUrl,
      bannerText,
      footerText,
      customCss,
      geoLatitude,
      geoLongitude,
      geoRegionName,
      geoPlacename,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };

    const [updated] = await db
      .insert(settings)
      .values(payload)
      .onConflictDoUpdate({
        target: settings.id,
        set: payload,
      })
      .returning();

    return NextResponse.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json({ status: 'error', message: 'Lỗi lưu cấu hình hệ thống' }, { status: 500 });
  }
}
