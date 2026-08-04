import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { article_id, affiliate_link_id } = body;

    if (!article_id || !affiliate_link_id) {
      return NextResponse.json(
        { status: 'error', message: 'Thiếu article_id hoặc affiliate_link_id' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const ipAddress = getClientIp(req);

    await ClickLogModel.create({
      article_id,
      affiliate_link_id,
      ip_address: ipAddress,
    });

    const article = await ArticleModel.findById(article_id);
    const affLink = await AffiliateLinkModel.findById(affiliate_link_id);

    if (!affLink) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy affiliate link' },
        { status: 404 }
      );
    }

    const subId = article ? article.slug : `art_${article_id}`;
    const destinationUrl = appendSubId(affLink.base_url, subId);

    return NextResponse.json({
      status: 'success',
      redirect_url: destinationUrl,
    });
  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Lỗi ghi nhận lượt click' },
      { status: 500 }
    );
  }
}
