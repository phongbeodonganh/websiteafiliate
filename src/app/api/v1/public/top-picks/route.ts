import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { affiliateLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const topPicks = await db.select().from(affiliateLinks).where(eq(affiliateLinks.isTopPick, true));
    return NextResponse.json({
      status: 'success',
      data: topPicks,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch top picks' }, { status: 500 });
  }
}
