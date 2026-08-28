import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    const rawPicks = await AffiliateLinkModel.find({ is_top_pick: true }).sort({ created_at: -1 });

    const topPicks = rawPicks.map((link) => {
      const doc = link.toObject();
      return {
        id: doc._id.toString(),
        name: doc.name,
        baseUrl: doc.base_url,
        base_url: doc.base_url,
        commission: doc.commission,
        cookie: doc.cookie,
        isTopPick: doc.is_top_pick,
        is_top_pick: doc.is_top_pick,
        clickCount: doc.click_count || 0,
        click_count: doc.click_count || 0,
        createdAt: doc.created_at,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: topPicks,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch top picks' }, { status: 500 });
  }
}
