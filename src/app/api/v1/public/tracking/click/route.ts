import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';
import { consumeDedupe, consumeRequest } from '@/lib/rateLimit';

// SEC-04 abuse controls (D-12, D-13). Click route policy: over-cap or duplicate
// clicks NEVER return 429 to real users — the analytics writes (ClickLog insert
// + click_count $inc) are silently skipped and the normal success envelope is
// still returned (no behavior change visible to the caller).
const CLICK_FLOOD_LIMIT = 60; // per IP per window
const FLOOD_WINDOW_MS = 60 * 1000;
const DEDUPE_WINDOW_MS = 60 * 1000;

export async function POST(req: Request) {
  try {
    const { article_id: articleId, affiliate_link_id: affiliateLinkId } = await req.json();

    if (!articleId || !affiliateLinkId) {
      return NextResponse.json(
        { status: 'error', message: 'Thiếu article_id hoặc affiliate_link_id' },
        { status: 400 },
      );
    }

    if (!mongoose.isValidObjectId(articleId) || !mongoose.isValidObjectId(affiliateLinkId)) {
      return NextResponse.json(
        { status: 'error', message: 'ID bài viết hoặc affiliate link không hợp lệ' },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const [article, affiliateLink] = await Promise.all([
      ArticleModel.findById(articleId),
      AffiliateLinkModel.findById(affiliateLinkId),
    ]);

    // Validate both references before inserting, so ClickLog never contains
    // records pointing at missing articles or affiliate links.
    if (!article || !affiliateLink) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy bài viết hoặc affiliate link' },
        { status: 404 },
      );
    }

    // SEC-04: flood cap + per-IP+link dedupe — silent skip, no 429 (D-13).
    // Click route has no ref consumer (unlike redirect's /blocked anchor), so
    // on skip BOTH the ClickLog insert AND the click_count $inc are dropped.
    // The success envelope is still returned at the bottom of the function.
    const ip = getClientIp(req);
    const floodCap = consumeRequest(`click:${ip}`, CLICK_FLOOD_LIMIT, FLOOD_WINDOW_MS);
    const isDuplicate = consumeDedupe(`${ip}:${affiliateLink._id.toString()}`, DEDUPE_WINDOW_MS);
    const skipWrites = !floodCap.allowed || isDuplicate;

    if (!skipWrites) {
      await Promise.all([
        ClickLogModel.create({
          article_id: article._id,
          affiliate_link_id: affiliateLink._id,
          ip_address: ip,
        }),
        AffiliateLinkModel.findByIdAndUpdate(
          affiliateLink._id,
          { $inc: { click_count: 1 } },
          { new: true, strict: false }
        ),
      ]);
    }

    return NextResponse.json({
      status: 'success',
      redirect_url: appendSubId(affiliateLink.base_url, article.slug),
    });
  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Lỗi ghi nhận lượt click' },
      { status: 500 },
    );
  }
}
