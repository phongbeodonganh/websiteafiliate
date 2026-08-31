import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, syncAffiliateNumericFields } from '@/lib/db/models';
import { parseCommissionRate, parseCookieDays } from '@/lib/utils';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

function parsePositiveInteger(value: string | null, fallback: number, maximum?: number) {
  const parsed = Number.parseInt(value || '', 10);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return maximum ? Math.min(normalized, maximum) : normalized;
}

function getSortOption(sort: string, order: string | null): Record<string, 1 | -1> {
  const ascending = order === 'asc';
  const direction: 1 | -1 = ascending ? 1 : -1;

  switch (sort) {
    case 'clicks':
      return { click_count: direction, created_at: -1, _id: -1 };
    case 'commission':
      return { commission_rate: direction, click_count: -1, created_at: -1, _id: -1 };
    case 'cookie':
      return { cookie_days: direction, click_count: -1, created_at: -1, _id: -1 };
    case 'oldest':
      return { created_at: 1, _id: 1 };
    case 'name':
      return { name: order === 'desc' ? -1 : 1, _id: 1 };
    case 'latest':
    default:
      return { created_at: direction, _id: direction };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parsePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
  const limit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const query = searchParams.get('q')?.trim() || '';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = query ? { name: { $regex: escapedQuery, $options: 'i' } } : {};
  const requestedSort = (searchParams.get('sort') || searchParams.get('sort_by') || 'latest').toLowerCase().trim();
  const sort = ['clicks', 'commission', 'cookie', 'oldest', 'name', 'latest'].includes(requestedSort)
    ? requestedSort
    : 'latest';
  const order = searchParams.get('order')?.toLowerCase().trim() || null;
  const sortOption = getSortOption(sort, order);

  try {
    await connectToDatabase();
    await syncAffiliateNumericFields();

    const [links, total] = await Promise.all([
      AffiliateLinkModel.find(filter).sort(sortOption).skip((page - 1) * limit).limit(limit),
      AffiliateLinkModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      status: 'success',
      data: links.map((link) => ({
        id: link._id.toString(),
        name: link.name,
        commission: link.commission || 'Exclusive Offer',
        commissionRate: link.commission_rate ?? parseCommissionRate(link.commission),
        cookie: link.cookie || '30 Days',
        cookieDays: link.cookie_days ?? parseCookieDays(link.cookie),
        isTopPick: link.is_top_pick,
        clickCount: link.click_count || 0,
        click_count: link.click_count || 0,
        createdAt: link.created_at,
        created_at: link.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      sort: {
        by: sort,
        order: order === 'asc' ? 'asc' : sort === 'name' && order !== 'desc' ? 'asc' : 'desc',
      },
    });
  } catch (error) {
    console.error('Public affiliates API error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch affiliates' }, { status: 500 });
  }
}
