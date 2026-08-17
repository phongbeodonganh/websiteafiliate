import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    let currentSettings = await SettingModel.findOne();

    if (!currentSettings) {
      currentSettings = await SettingModel.create({
        site_title: 'AIDEALSUK',
        metaDescription: 'Discover top AI tool categories, real-world AI use-case case studies, high-paying affiliate programs, and revenue automation strategies.',
        focusKeywords: 'ai use-cases, ai case studies, ai affiliate programs, ai content copywriting, ai coding tools',
        canonicalUrl: 'https://aidealsuk.com',
        hreflang: 'en-US',
        geoTarget: 'GLOBAL',
        primary_color: '#0f172a',
        accent_color: '#3b82f6',
        theme_mode: 'dark',
        font_family: 'Inter',
        banner_text: '🔥 HOT: Explore Top High-Paying AI Affiliate Programs & Up To 30% Recurring Commissions!',
        footer_text: `© ${new Date().getFullYear()} AIDEALSUK. All rights reserved. Your Trusted Source for AI Tool Reviews & Exclusive Affiliate Deals.`,
      });
    }

    const doc = currentSettings.toObject();

    return NextResponse.json({
      status: 'success',
      data: {
        id: doc._id.toString(),
        siteTitle: doc.site_title,
        metaDescription: doc.metaDescription,
        focusKeywords: doc.focusKeywords,
        canonicalUrl: doc.canonicalUrl,
        hreflang: doc.hreflang,
        geoTarget: doc.geoTarget,
        businessName: doc.businessName,
        businessAddress: doc.businessAddress,
        businessPhone: doc.businessPhone,
        ogImageUrl: doc.ogImageUrl,
        schemaJsonld: doc.schemaJsonld,
        headScripts: doc.headScripts,
        primaryColor: doc.primary_color,
        accentColor: doc.accent_color,
        themeMode: doc.theme_mode,
        fontFamily: doc.font_family,
        logoUrl: doc.logo_url,
        faviconUrl: doc.favicon_url,
        bannerText: doc.banner_text,
        footerText: doc.footer_text,
        customCss: doc.custom_css,
        geoLatitude: doc.geo_latitude,
        geoLongitude: doc.geo_longitude,
        geoRegionName: doc.geo_region_name,
        geoPlacename: doc.geo_placename,
        updatedAt: doc.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public settings' }, { status: 500 });
  }
}
