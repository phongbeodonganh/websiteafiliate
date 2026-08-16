import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(24, Math.max(1, Number.parseInt(searchParams.get('limit') || '9', 10)));
  const query = searchParams.get('q')?.trim() || '';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = query ? { name: { $regex: escapedQuery, $options: 'i' } } : {};

  try {
    await connectToDatabase();
    const [links, total] = await Promise.all([
      AffiliateLinkModel.find(filter).sort({ is_top_pick: -1, created_at: -1 }).skip((page - 1) * limit).limit(limit),
      AffiliateLinkModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      status: 'success',
      data: links.map((link) => ({
        id: link._id.toString(),
        name: link.name,
        commission: link.commission || 'Exclusive Offer',
        cookie: link.cookie || '30 Days',
        isTopPick: link.is_top_pick,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Public affiliates API error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch affiliates' }, { status: 500 });
  }
}
