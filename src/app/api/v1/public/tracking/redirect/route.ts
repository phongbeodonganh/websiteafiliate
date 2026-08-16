import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');
  const affiliateLinkId = searchParams.get('affiliate_link_id');

  if (!affiliateLinkId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  try {
    await connectToDatabase();
    const ipAddress = getClientIp(req);

    await ClickLogModel.create({
      ...(articleId ? { article_id: articleId } : {}),
      affiliate_link_id: affiliateLinkId,
      ip_address: ipAddress,
    });

    const article = articleId ? await ArticleModel.findById(articleId) : null;
    const affLink = await AffiliateLinkModel.findById(affiliateLinkId);

    if (!affLink) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    const subId = article ? article.slug : articleId ? `art_${articleId}` : 'homepage';
    const destinationUrl = appendSubId(affLink.base_url, subId);

    return NextResponse.redirect(destinationUrl, 302);
  } catch (error) {
    console.error('Redirect tracking error:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
