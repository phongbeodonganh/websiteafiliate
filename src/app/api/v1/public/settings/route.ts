import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    let currentSettings = await SettingModel.findOne();

    if (!currentSettings) {
      currentSettings = await SettingModel.create({
        site_title: 'TheHavenDeals',
        metaDescription: 'Independent product reviews, clear price comparisons and practical buying guides for shoppers across Europe.',
        focusKeywords: 'product reviews Europe, price comparison, buying guides, home products, technology deals',
        canonicalUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://thehavendeals.com',
        hreflang: 'en-GB',
        geoTarget: 'EUROPE',
        primary_color: '#173f35',
        accent_color: '#ec6b43',
        theme_mode: 'light',
        font_family: 'Inter',
        banner_text: 'Independent picks · Clear comparisons · Prices shown in EUR',
        footer_text: `© ${new Date().getFullYear()} TheHavenDeals. Independent product picks, checked offers and practical buying guides.`,
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
  } catch {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public settings' }, { status: 500 });
  }
}
