import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';

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

    await ClickLogModel.create({
      article_id: article._id,
      affiliate_link_id: affiliateLink._id,
      ip_address: getClientIp(req),
    });

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
