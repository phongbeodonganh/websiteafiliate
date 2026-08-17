import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');
  const affiliateLinkId = searchParams.get('affiliate_link_id');
  const fallbackUrl = new URL('/', req.url);

  if (!affiliateLinkId || !mongoose.isValidObjectId(affiliateLinkId)) {
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    await connectToDatabase();

    const [affiliateLink, article] = await Promise.all([
      AffiliateLinkModel.findById(affiliateLinkId),
      articleId && mongoose.isValidObjectId(articleId)
        ? ArticleModel.findById(articleId)
        : null,
    ]);

    // Invalid or deleted links must never create analytics records.
    if (!affiliateLink) {
      return NextResponse.redirect(fallbackUrl);
    }

    await ClickLogModel.create({
      ...(article ? { article_id: article._id } : {}),
      affiliate_link_id: affiliateLink._id,
      ip_address: getClientIp(req),
    });

    const destinationUrl = appendSubId(
      affiliateLink.base_url,
      article?.slug || 'homepage',
    );
    const response = NextResponse.redirect(destinationUrl, 302);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Redirect tracking error:', error);
    return NextResponse.redirect(fallbackUrl);
  }
}
