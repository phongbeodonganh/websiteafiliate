import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    let currentSettings = await db.select().from(settings).where(eq(settings.id, 1)).get();

    if (!currentSettings) {
      currentSettings = {
        id: 1,
        siteTitle: 'NEXUS FINANCE GLOBAL',
        metaDescription: 'Nền tảng phân tích tài chính & crypto chuyên sâu. Cung cấp tín hiệu đầu tư và đánh giá sàn giao dịch khách quan nhất.',
        focusKeywords: 'crypto, tài chính, đầu tư, đánh giá sàn',
        canonicalUrl: 'https://nexusfinance.global',
        hreflang: 'en-US',
        geoTarget: 'GLOBAL',
        businessName: 'Nexus Finance Global LLC',
        businessAddress: 'Wall Street, Manhattan, New York, NY 10005',
        businessPhone: '+1 (800) 555-0199',
        ogImageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop',
        schemaJsonld: '',
        headScripts: '',
        primaryColor: '#0f172a',
        accentColor: '#f59e0b',
        themeMode: 'dark',
        fontFamily: 'Inter',
        logoUrl: '',
        faviconUrl: '',
        bannerText: '🔥 HOT: Free Institutional Crypto Trading Signals & Exclusive 30% Fee Discounts!',
        footerText: '© 2026 NEXUS FINANCE GLOBAL. All rights reserved. Professional Financial Intelligence.',
        customCss: '',
        geoLatitude: 40.7128,
        geoLongitude: -74.0060,
        geoRegionName: 'US-NY',
        geoPlacename: 'New York',
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      status: 'success',
      data: currentSettings,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public settings' }, { status: 500 });
  }
}
