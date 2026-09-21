import { NextRequest, NextResponse } from 'next/server';
import { sweepBlacklistAndRestore } from '@/lib/blacklist';
import { getAuthUser } from '@/lib/auth';

// POST /api/v1/cms/blacklist/re-sweep
//
// D-08: re-run the retroactive sweep over every active blacklist entry and restore
// any campaign currently `blacklisted` that no longer matches any active entry back
// to `active` — never touching a manually-set `inactive` campaign.
//
// Admin-only, using the exact combined guard the sibling blacklist writes use
// (src/app/api/v1/cms/blacklist/route.ts DELETE): a missing token AND a non-admin
// principal both return 401 (the documented sibling-blacklist-write contract).
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { swept, restored } = await sweepBlacklistAndRestore();

    return NextResponse.json({
      status: 'success',
      data: { swept, restored },
    });
  } catch (error: any) {
    console.error('Blacklist re-sweep error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Blacklist re-sweep failed. Please try again.' },
      { status: 500 }
    );
  }
}
