import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { QueryFilter } from 'mongoose';
import { NextResponse } from 'next/server';
import { ArticleModel, SubscriberModel, type IArticle, type ISubscriber } from '@/lib/db/models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { isEmailConfigured, sendEmailBatch } from '@/lib/email/mailer';
import { RESEND_BATCH_SIZE } from '@/lib/email/resend';
import {
  buildInsiderDigestEmail,
  getCurrentGmtPlus12Period,
  getPreviousGmtPlus12Period,
  type InsiderDigestArticle,
} from '@/lib/insider/digest';
import { ACTIVE_SUBSCRIBER_FILTER, getInsiderSiteUrl } from '@/lib/insider/subscribers';
import { createInsiderToken } from '@/lib/insider/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: Request) {
  const expectedSecret = process.env.INSIDER_CRON_SECRET?.trim();
  const authorization = req.headers.get('authorization');
  const providedSecret = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!expectedSecret || !providedSecret) return false;

  const expectedBuffer = Buffer.from(expectedSecret);
  const providedBuffer = Buffer.from(providedSecret);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function parseLimit(name: string, fallback: number, maximum: number) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), maximum) : fallback;
}

function summarizeArticle(article: {
  excerpt?: string;
  meta_description?: string;
  content?: string;
}) {
  const source = article.excerpt || article.meta_description || article.content || 'Read the full story on AIDEALSUK.';
  const plainText = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > 220 ? `${plainText.slice(0, 217).trimEnd()}...` : plainText;
}

function toDigestArticle(article: {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  content: string;
  view_count: number;
}): InsiderDigestArticle {
  return {
    title: article.title,
    slug: article.slug,
    summary: summarizeArticle(article),
    viewCount: article.view_count || 0,
  };
}

export async function POST(req: Request) {
  if (!process.env.INSIDER_CRON_SECRET?.trim()) {
    console.error('Insider digest cron error: INSIDER_CRON_SECRET is not configured');
    return NextResponse.json({ status: 'error', message: 'Cron is not configured' }, { status: 503 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ status: 'error', message: 'Email service is not configured' }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const manualCurrentPeriod = new URL(req.url).searchParams.get('period') === 'current';
    const period = manualCurrentPeriod
      ? getCurrentGmtPlus12Period()
      : getPreviousGmtPlus12Period();
    const latestLimit = parseLimit('INSIDER_DIGEST_LATEST_LIMIT', 5, 10);
    const hottestLimit = parseLimit('INSIDER_DIGEST_HOTTEST_LIMIT', 3, 10);
    const articleFilter: QueryFilter<IArticle> = {
      status: 'published',
      created_at: { $gte: period.start, $lt: period.end },
    };
    const hottestArticleFilter: QueryFilter<IArticle> = { status: 'published' };

    const [latestDocuments, hottestDocuments] = await Promise.all([
      ArticleModel.find(articleFilter)
        .sort({ created_at: -1 })
        .limit(latestLimit)
        .select('title slug excerpt meta_description content view_count'),
      ArticleModel.find(hottestArticleFilter)
        .sort({ view_count: -1, created_at: -1 })
        .limit(hottestLimit)
        .select('title slug excerpt meta_description content view_count'),
    ]);
    const latest = latestDocuments.map((article) => toDigestArticle(article.toObject()));
    const hottest = hottestDocuments.map((article) => toDigestArticle(article.toObject()));

    if (latest.length === 0 && hottest.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: { dayKey: period.dayKey, sent: 0, skipped: 'no_articles' },
      });
    }

    const siteName = process.env.EMAIL_SITE_NAME?.trim() || 'AIDEALSUK';
    const siteUrl = getInsiderSiteUrl();
    const dispatchKey = manualCurrentPeriod
      ? `manual-${randomUUID()}`
      : `scheduled-${period.dayKey}`;
    let sent = 0;
    let batches = 0;
    let manualOffset = 0;

    while (true) {
      const subscriberFilter: QueryFilter<ISubscriber> = manualCurrentPeriod
        ? ACTIVE_SUBSCRIBER_FILTER
        : {
            $and: [
              ACTIVE_SUBSCRIBER_FILTER,
              { last_digest_key: { $ne: period.dayKey } },
            ],
          };
      const subscribers = await SubscriberModel.find(subscriberFilter)
        .sort({ _id: 1 })
        .skip(manualCurrentPeriod ? manualOffset : 0)
        .limit(RESEND_BATCH_SIZE)
        .select('email');

      if (subscribers.length === 0) break;

      const messages = subscribers.map((subscriber) => {
        const unsubscribeToken = createInsiderToken('unsubscribe', subscriber._id.toString());
        const unsubscribeUrl = new URL('/api/v1/public/insider/unsubscribe', siteUrl);
        unsubscribeUrl.searchParams.set('token', unsubscribeToken);
        const rendered = buildInsiderDigestEmail({
          siteName,
          siteUrl,
          dayKey: period.dayKey,
          latest,
          hottest,
          unsubscribeUrl: unsubscribeUrl.toString(),
          periodDescription: manualCurrentPeriod
            ? 'the current GMT+12 day so far'
            : 'the previous GMT+12 day',
        });

        return {
          to: subscriber.email,
          ...rendered,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl.toString()}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        };
      });
      const recipientHash = createHash('sha256')
        .update(subscribers.map((subscriber) => subscriber._id.toString()).join(','))
        .digest('hex')
        .slice(0, 32);
      const batchResult = await sendEmailBatch(
        messages,
        `insider-digest-${dispatchKey}-${recipientHash}`,
      );
      if (batchResult.ids.length !== subscribers.length) {
        throw new Error('Resend returned an incomplete batch result');
      }

      const sentAt = new Date();
      await SubscriberModel.bulkWrite(subscribers.map((subscriber, index) => ({
        updateOne: {
          filter: { _id: subscriber._id },
          update: {
            $set: {
              ...(!manualCurrentPeriod && { last_digest_key: period.dayKey }),
              last_digest_at: sentAt,
              email_status: 'sent',
              last_email_id: batchResult.ids[index],
            },
            $unset: { opened_at: 1 },
          },
        },
      })));

      sent += subscribers.length;
      batches += 1;
      if (manualCurrentPeriod) manualOffset += subscribers.length;
    }

    return NextResponse.json({
      status: 'success',
      data: {
        dayKey: period.dayKey,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        latest: latest.length,
        hottest: hottest.length,
        sent,
        batches,
        mode: manualCurrentPeriod ? 'manual_current_day' : 'scheduled_previous_day',
      },
    });
  } catch (error) {
    console.error('Insider digest cron error:', error);
    return NextResponse.json({ status: 'error', message: 'Daily digest failed' }, { status: 500 });
  }
}
