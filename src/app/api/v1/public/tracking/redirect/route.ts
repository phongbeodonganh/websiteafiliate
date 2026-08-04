import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clickLogs, affiliateLinks, articles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClientIp, appendSubId } from '@/lib/utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');
  const affiliateLinkId = searchParams.get('affiliate_link_id');

  if (!articleId || !affiliateLinkId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    const ipAddress = getClientIp(req);

    // Ghi log click
    await db.insert(clickLogs).values({
      articleId: Number(articleId),
      affiliateLinkId: Number(affiliateLinkId),
      ipAddress,
    });

    const article = await db.select().from(articles).where(eq(articles.id, Number(articleId))).get();
    const affLink = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, Number(affiliateLinkId))).get();

    if (!affLink) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const subId = article ? article.slug : `art_${articleId}`;
    const destinationUrl = appendSubId(affLink.baseUrl, subId);

    return NextResponse.redirect(destinationUrl, 302);
  } catch (error) {
    console.error('Redirect tracking error:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
