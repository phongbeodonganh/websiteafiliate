import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');
  const affiliateLinkId = searchParams.get('affiliate_link_id');
  const fallbackUrl = new URL('/', req.url);

  if (!affiliateLinkId || !mongoose.isValidObjectId(affiliateLinkId)) {
    return NextResponse.redirect(fallbackUrl, 302);
  }

  try {
    await connectToDatabase();

    const [affiliateLink, article] = await Promise.all([
      AffiliateLinkModel.findById(affiliateLinkId),
      articleId && mongoose.isValidObjectId(articleId)
        ? ArticleModel.findById(articleId)
        : null,
    ]);

    if (!affiliateLink) {
      return NextResponse.redirect(fallbackUrl, 302);
    }

    // The ClickLog create result is bound (not discarded): its _id becomes the
    // `ref` the /blocked page uses to re-resolve blacklist state from the DB (D-10).
    const [clickLog] = await Promise.all([
      ClickLogModel.create({
        ...(article ? { article_id: article._id } : {}),
        affiliate_link_id: affiliateLink._id,
        ip_address: getClientIp(req),
      }),
      AffiliateLinkModel.findByIdAndUpdate(
        affiliateLink._id,
        { $inc: { click_count: 1 } },
        { new: true, strict: false }
      ),
    ]);

    const blacklistCheck = await checkUrlAgainstBlacklist(affiliateLink.base_url);
    if (affiliateLink.status === 'blacklisted' || blacklistCheck.isBlacklisted) {
      // 302 through the intermediate warning page (D-11). The only URL-borne
      // value is the server-generated 24-hex ClickLog id — never attacker-
      // controlled text. NextResponse.redirect requires an absolute URL and
      // defaults to 307, so both are explicit.
      const blockedUrl = new URL(`/blocked?ref=${clickLog._id.toString()}`, req.url);
      const response = NextResponse.redirect(blockedUrl, 302);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const destinationUrl = appendSubId(
      affiliateLink.base_url,
      article?.slug || 'homepage',
    );
    const response = NextResponse.redirect(destinationUrl, 302);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Redirect tracking error:', error);
    return NextResponse.redirect(fallbackUrl, 302);
  }
}
