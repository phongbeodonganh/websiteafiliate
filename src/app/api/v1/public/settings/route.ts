import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';
import { getPublicSettings, setPublicSettingsFromDocument } from '@/lib/public-data-cache';

export async function GET() {
  try {
    let settings = await getPublicSettings();

    if (!settings) {
      await connectToDatabase();
      const created = await SettingModel.create({
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
      settings = setPublicSettingsFromDocument(created.toObject());
    }

    return NextResponse.json({ status: 'success', data: settings });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public settings' }, { status: 500 });
  }
}
