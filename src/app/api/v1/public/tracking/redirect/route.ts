import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';
import { consumeDedupe, consumeRequest } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// SEC-04 abuse controls (D-12, D-13). Redirect route policy: over-cap or
// duplicate clicks NEVER return 429 to real users. Critical asymmetry vs the
// click route: the ClickLog row is ALWAYS created here because it is the
// /blocked ref anchor (plan 01's contract); only the click_count $inc is
// skipped on dedupe/over-cap (SEC-04/dedupe-vs-ref assumption).
const REDIRECT_FLOOD_LIMIT = 60; // per IP per window
const FLOOD_WINDOW_MS = 60 * 1000;
const DEDUPE_WINDOW_MS = 60 * 1000;

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

    // SEC-04: flood cap + dedupe BEFORE the write pair, but with the redirect-
    // route ref-anchor contract: the ClickLog is ALWAYS created (it is the
    // /blocked ref anchor from plan 01); only the $inc is skipped on dedupe
    // or over-cap (the redirect route has no behavior change visible to the
    // caller — it always 302s).
    const ip = getClientIp(req);
    const floodCap = consumeRequest(`redirect:${ip}`, REDIRECT_FLOOD_LIMIT, FLOOD_WINDOW_MS);
    const isDuplicate = consumeDedupe(`${ip}:${affiliateLink._id.toString()}`, DEDUPE_WINDOW_MS);
    const skipIncrement = !floodCap.allowed || isDuplicate;

    // The ClickLog create result is bound (not discarded): its _id becomes the
    // `ref` the /blocked page uses to re-resolve blacklist state from the DB (D-10).
    const [clickLog] = await Promise.all([
      ClickLogModel.create({
        ...(article ? { article_id: article._id } : {}),
        affiliate_link_id: affiliateLink._id,
        ip_address: ip,
      }),
      ...(skipIncrement
        ? []
        : [
            AffiliateLinkModel.findByIdAndUpdate(
              affiliateLink._id,
              { $inc: { click_count: 1 } },
              { new: true, strict: false }
            ),
          ]),
    ]);

    const blacklistCheck = await checkUrlAgainstBlacklist(affiliateLink.base_url);
    if (affiliateLink.status === 'blacklisted' || blacklistCheck.isBlacklisted) {
      // 302 through the intermediate warning page (D-11). The only URL-borne
      // value is the server-generated 24-hex ClickLog id — never attacker-
      // controlled text. NextResponse.redirect requires an absolute URL and
      // defaults to 307, so both are explicit.
      // The ref anchor is ALWAYS created even when dedupe/flood-cap is active —
      // see must_haves truth #5 (must_haves.dedupe-vs-ref assumption).
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
