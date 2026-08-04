import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clickLogs, affiliateLinks, articles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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

    const ipAddress = getClientIp(req);

    // 1. Ghi log click vào DB
    await db.insert(clickLogs).values({
      articleId: Number(article_id),
      affiliateLinkId: Number(affiliate_link_id),
      ipAddress,
    });

    // 2. Lấy thông tin bài viết và link affiliate gốc
    const article = await db.select().from(articles).where(eq(articles.id, Number(article_id))).get();
    const affLink = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, Number(affiliate_link_id))).get();

    if (!affLink) {
      return NextResponse.json(
        { status: 'error', message: 'Không tìm thấy affiliate link' },
        { status: 404 }
      );
    }

    // 3. Tạo destination URL có gắn sub_id = article.slug
    const subId = article ? article.slug : `art_${article_id}`;
    const destinationUrl = appendSubId(affLink.baseUrl, subId);

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
