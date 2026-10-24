import { NextResponse } from 'next/server';
import { parseCommissionRate, parseCookieDays } from '@/lib/utils';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { isHttpUrl } from '@/lib/seo';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Authentication required. Please sign in.' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const rawLinks = await AffiliateLinkModel.find().sort({ created_at: -1 });

    const links = rawLinks.map((link) => {
      const doc = link.toObject();
      return {
        id: doc._id.toString(),
        name: doc.name,
        baseUrl: doc.base_url,
        base_url: doc.base_url,
        productUrl: doc.product_url || doc.base_url,
        product_url: doc.product_url || doc.base_url,
        commission: doc.commission,
        cookie: doc.cookie,
        isTopPick: doc.is_top_pick,
        is_top_pick: doc.is_top_pick,
        status: doc.status || 'active',
        clickCount: doc.click_count || 0,
        click_count: doc.click_count || 0,
        createdAt: doc.created_at,
      };
    });

    return NextResponse.json({
      status: 'success',
      data: links,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to load affiliate links.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage affiliate links.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, base_url, baseUrl, product_url, productUrl, commission, cookie, is_top_pick, isTopPick } = body;
    const finalBaseUrl = base_url || baseUrl;
    const finalProductUrl = product_url || productUrl || finalBaseUrl;

    if (!name || !finalBaseUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Enter a campaign name and tracking URL.' },
        { status: 400 }
      );
    }

    // AFF-01 scheme gate: only http(s) URLs may enter the link store (they become the
    // 302 redirect destination and the Jina scrape target). Reject BEFORE any DB write.
    // finalProductUrl always falls back to finalBaseUrl, so it is present whenever
    // finalBaseUrl passed the required-field check.
    if (!isHttpUrl(finalBaseUrl) || !isHttpUrl(finalProductUrl)) {
      return NextResponse.json(
        { status: 'error', message: 'The tracking URL must use HTTP or HTTPS.' },
        { status: 400 }
      );
    }

    const finalCommission = commission || 'N/A';
    const finalCookie = cookie || '30 Days';

    await connectToDatabase();
    const newLink = await AffiliateLinkModel.create({
      name,
      base_url: finalBaseUrl,
      product_url: finalProductUrl,
      commission: finalCommission,
      commission_rate: parseCommissionRate(finalCommission),
      cookie: finalCookie,
      cookie_days: parseCookieDays(finalCookie),
      is_top_pick: is_top_pick !== undefined ? is_top_pick : (isTopPick !== undefined ? isTopPick : false),
    });

    return NextResponse.json(
      {
        status: 'success',
        data: {
          id: newLink._id.toString(),
          name: newLink.name,
          baseUrl: newLink.base_url,
          base_url: newLink.base_url,
          productUrl: newLink.product_url,
          product_url: newLink.product_url,
          commission: newLink.commission,
          cookie: newLink.cookie,
          isTopPick: newLink.is_top_pick,
          is_top_pick: newLink.is_top_pick,
          clickCount: newLink.click_count || 0,
          click_count: newLink.click_count || 0,
          createdAt: newLink.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Unable to create the affiliate link.' }, { status: 500 });
  }
}
