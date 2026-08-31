import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    await connectToDatabase();
    let currentSettings = await SettingModel.findOne();

    if (!currentSettings) {
      currentSettings = await SettingModel.create({
        site_title: 'AIDEALSUK',
        metaDescription: 'Nền tảng phân tích tài chính & crypto chuyên sâu. Cung cấp tín hiệu đầu tư và đánh giá sàn giao dịch khách quan nhất.',
        focusKeywords: 'crypto, tài chính, đầu tư, đánh giá sàn',
        canonicalUrl: 'https://aidealsuk.com',
        hreflang: 'en-US',
        geoTarget: 'GLOBAL',
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
        googleAnalyticsId: doc.googleAnalyticsId,
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
    return NextResponse.json({ status: 'error', message: 'Lỗi lấy cấu hình hệ thống' }, { status: 500 });
  }
}

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
      googleAnalyticsId,
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

    await connectToDatabase();
    let currentSettings = await SettingModel.findOne();

    if (!currentSettings) {
      currentSettings = new SettingModel();
    }

    if (siteTitle !== undefined) currentSettings.site_title = siteTitle;
    if (metaDescription !== undefined) currentSettings.metaDescription = metaDescription;
    if (focusKeywords !== undefined) currentSettings.focusKeywords = focusKeywords;
    if (canonicalUrl !== undefined) currentSettings.canonicalUrl = canonicalUrl;
    if (hreflang !== undefined) currentSettings.hreflang = hreflang;
    if (geoTarget !== undefined) currentSettings.geoTarget = geoTarget;
    if (businessName !== undefined) currentSettings.businessName = businessName;
    if (businessAddress !== undefined) currentSettings.businessAddress = businessAddress;
    if (businessPhone !== undefined) currentSettings.businessPhone = businessPhone;
    if (ogImageUrl !== undefined) currentSettings.ogImageUrl = ogImageUrl;
    if (schemaJsonld !== undefined) currentSettings.schemaJsonld = schemaJsonld;
    if (headScripts !== undefined) currentSettings.headScripts = headScripts;
    if (googleAnalyticsId !== undefined) {
      const trimmed = String(googleAnalyticsId).trim();
      if (trimmed && !/^G-[A-Z0-9]{6,}$/.test(trimmed)) {
        return NextResponse.json(
          { status: 'error', message: 'Google Analytics Measurement ID không hợp lệ (định dạng G-XXXXXXXXXX)' },
          { status: 400 }
        );
      }
      currentSettings.googleAnalyticsId = trimmed;
    }
    if (primaryColor !== undefined) currentSettings.primary_color = primaryColor;
    if (accentColor !== undefined) currentSettings.accent_color = accentColor;
    if (themeMode !== undefined) currentSettings.theme_mode = themeMode;
    if (fontFamily !== undefined) currentSettings.font_family = fontFamily;
    if (logoUrl !== undefined) currentSettings.logo_url = logoUrl;
    if (faviconUrl !== undefined) currentSettings.favicon_url = faviconUrl;
    if (bannerText !== undefined) currentSettings.banner_text = bannerText;
    if (footerText !== undefined) currentSettings.footer_text = footerText;
    if (customCss !== undefined) currentSettings.custom_css = customCss;
    if (geoLatitude !== undefined) currentSettings.geo_latitude = Number(geoLatitude);
    if (geoLongitude !== undefined) currentSettings.geo_longitude = Number(geoLongitude);
    if (geoRegionName !== undefined) currentSettings.geo_region_name = geoRegionName;
    if (geoPlacename !== undefined) currentSettings.geo_placename = geoPlacename;
    currentSettings.updated_at = new Date();

    await currentSettings.save();
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
        googleAnalyticsId: doc.googleAnalyticsId,
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
    console.error('Settings save error:', error);
    return NextResponse.json({ status: 'error', message: 'Lỗi lưu cấu hình hệ thống' }, { status: 500 });
  }
}
