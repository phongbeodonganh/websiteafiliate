import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { isValidCssColor } from '@/lib/sanitize';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }

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

    // D-07 / plan 06: never return the raw gemini_api_key. Return a masked
    // hint (last 4 chars prefixed with a masking bullet run) when a key is
    // set; omit the field entirely when it is empty. This GET is admin-gated
    // (plan 04 guard), but masking still applies — defense in depth so a key
    // typo or log-capture bug can never leak the raw value.
    const geminiApiKeyHint: string | undefined =
      typeof doc.gemini_api_key === 'string' && doc.gemini_api_key.length > 0
        ? `••••••••${doc.gemini_api_key.slice(-4)}`
        : undefined;

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
        googleSiteVerification: doc.googleSiteVerification,
        primaryColor: doc.primary_color,
        accentColor: doc.accent_color,
        themeMode: doc.theme_mode,
        fontFamily: doc.font_family,
        logoUrl: doc.logo_url,
        faviconUrl: doc.favicon_url,
        bannerText: doc.banner_text,
        footerText: doc.footer_text,
        customCss: doc.custom_css,
        ...(geminiApiKeyHint !== undefined ? { geminiApiKeyMasked: geminiApiKeyHint } : {}),
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
  const currentUser = await getAuthUser(req);
  if (!currentUser) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
  }
  if (currentUser.role !== 'admin') {
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
      googleSiteVerification,
      primaryColor,
      accentColor,
      themeMode,
      fontFamily,
      logoUrl,
      faviconUrl,
      bannerText,
      footerText,
      customCss,
      geminiApiKey,
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
    if (googleSiteVerification !== undefined) currentSettings.googleSiteVerification = String(googleSiteVerification).trim();
    // SEC-03 / CONCERNS #11 (plan 06 Task 4): validate primary_color /
    // accent_color against the same strict hex color-format regex used at
    // the render boundary (src/app/layout.tsx via sanitizeCssColor). Drop
    // the request with a 400 naming the offending field BEFORE any in-place
    // mutation of currentSettings or .save() — the DB document MUST be
    // untouched on rejection (verified by tests/api/settings-color-
    // validation.test.ts). custom_css keeps its current handling below: it
    // remains admin-only trusted content behind this admin-only PUT
    // (CONCERNS #11 trusted-admin condition, satisfied by plan 04's guard)
    // — no new rendering mechanism is added for it.
    if (primaryColor !== undefined && !isValidCssColor(primaryColor)) {
      return NextResponse.json(
        { status: 'error', message: 'primaryColor không hợp lệ — phải là mã hex (#RRGGBB, #RGB, #RRGGBBAA hoặc #RGBA)' },
        { status: 400 }
      );
    }
    if (accentColor !== undefined && !isValidCssColor(accentColor)) {
      return NextResponse.json(
        { status: 'error', message: 'accentColor không hợp lệ — phải là mã hex (#RRGGBB, #RGB, #RRGGBBAA hoặc #RGBA)' },
        { status: 400 }
      );
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
    // D-07 / plan 06: accept an optional gemini_api_key and persist it. An
    // empty string explicitly CLEARS the stored key (admin reset); a
    // non-empty string replaces it. The raw value is never logged or echoed
    // — the GET response returns only a masked hint, and the PUT response
    // shape below shares that masking helper.
    if (geminiApiKey !== undefined) {
      const trimmedKey = String(geminiApiKey).trim();
      currentSettings.gemini_api_key = trimmedKey.length > 0 ? trimmedKey : '';
    }
    if (geoLatitude !== undefined) currentSettings.geo_latitude = Number(geoLatitude);
    if (geoLongitude !== undefined) currentSettings.geo_longitude = Number(geoLongitude);
    if (geoRegionName !== undefined) currentSettings.geo_region_name = geoRegionName;
    if (geoPlacename !== undefined) currentSettings.geo_placename = geoPlacename;
    currentSettings.updated_at = new Date();

    await currentSettings.save();
    const doc = currentSettings.toObject();

    // Same masked-hint contract as GET (never echo the raw stored key).
    const geminiApiKeyHint: string | undefined =
      typeof doc.gemini_api_key === 'string' && doc.gemini_api_key.length > 0
        ? `••••••••${doc.gemini_api_key.slice(-4)}`
        : undefined;

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
        googleSiteVerification: doc.googleSiteVerification,
        primaryColor: doc.primary_color,
        accentColor: doc.accent_color,
        themeMode: doc.theme_mode,
        fontFamily: doc.font_family,
        logoUrl: doc.logo_url,
        faviconUrl: doc.favicon_url,
        bannerText: doc.banner_text,
        footerText: doc.footer_text,
        customCss: doc.custom_css,
        ...(geminiApiKeyHint !== undefined ? { geminiApiKeyMasked: geminiApiKeyHint } : {}),
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
