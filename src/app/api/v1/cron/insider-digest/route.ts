import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { QueryFilter } from 'mongoose';
import { NextResponse } from 'next/server';
import { SubscriberModel, type ISubscriber } from '@/lib/db/models';
import { ProductModel } from '@/lib/db/product-models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { isEmailConfigured, sendEmailBatch } from '@/lib/email/mailer';
import { RESEND_BATCH_SIZE } from '@/lib/email/resend';
import { collectHomepageDeals } from '@/lib/homepage/deals';
import {
  buildInsiderDigestEmail,
  getCurrentGmtPlus12Period,
  getPreviousGmtPlus12Period,
  type InsiderDigestCoupon,
  type InsiderDigestProduct,
} from '@/lib/insider/digest';
import { ACTIVE_SUBSCRIBER_FILTER, getInsiderSiteUrl } from '@/lib/insider/subscribers';
import { createInsiderToken } from '@/lib/insider/tokens';
import { getPublishedStores } from '@/lib/stores/public';

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

function summarizeProduct(product: {
  short_description?: string;
  meta_description?: string;
  description?: string;
}) {
  const source = product.short_description || product.meta_description || product.description || '';
  const plainText = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText.length > 220 ? `${plainText.slice(0, 217).trimEnd()}...` : plainText;
}

function toDigestProduct(product: {
  name: string;
  slug: string;
  short_description?: string;
  meta_description?: string;
  description?: string;
  price?: number;
  price_min?: number;
  original_price?: number;
  discount_percent?: number;
  images?: { url?: string; alt?: string }[];
  offers?: { status?: string; price?: number; original_price?: number }[];
}): InsiderDigestProduct {
  const price = Number(product.price_min || product.price || 0);
  const cheapestOffer = (product.offers || [])
    .filter((offer) => offer.status === 'active' && Number(offer.price) > 0)
    .sort((a, b) => Number(a.price) - Number(b.price))[0];
  return {
    name: product.name,
    slug: product.slug,
    shortDescription: summarizeProduct(product),
    imageUrl: product.images?.[0]?.url || undefined,
    imageAlt: product.images?.[0]?.alt || product.name,
    price,
    originalPrice: Number(cheapestOffer?.original_price || product.original_price || 0) || undefined,
    discountPercent: Number(product.discount_percent || 0),
  };
}

function savingPercent(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 0;
}

async function getDigestCoupons(limit: number): Promise<InsiderDigestCoupon[]> {
  const stores = await getPublishedStores();
  return collectHomepageDeals(stores)
    .sort((a, b) => (
      savingPercent(b.saving) - savingPercent(a.saving)
      || Number(Boolean(b.code)) - Number(Boolean(a.code))
      || (Date.parse(b.checkedAt || b.updatedAt) || 0) - (Date.parse(a.checkedAt || a.updatedAt) || 0)
      || a.id.localeCompare(b.id)
    ))
    .slice(0, limit)
    .map((deal) => ({
      storeName: deal.storeName,
      storeSlug: deal.storeSlug,
      title: deal.title,
      description: deal.description,
      saving: deal.saving,
      code: deal.code,
      imageUrl: deal.storeImageUrl || undefined,
      imageAlt: deal.storeImageAlt || deal.storeName,
    }));
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
    const dealsLimit = parseLimit('INSIDER_DIGEST_DEALS_LIMIT', 10, 20);
    const newestLimit = parseLimit('INSIDER_DIGEST_NEWEST_LIMIT', 10, 20);
    const couponsLimit = parseLimit('INSIDER_DIGEST_COUPONS_LIMIT', 10, 20);

    const [dealDocuments, newestDocuments, coupons] = await Promise.all([
      ProductModel.find({ status: 'published', is_deal: true, discount_percent: { $gt: 0 } })
        .sort({ discount_percent: -1, published_at: -1, created_at: -1, _id: -1 })
        .limit(dealsLimit)
        .select('name slug short_description description meta_description images price price_min original_price discount_percent offers'),
      ProductModel.find({ status: 'published' })
        .sort({ published_at: -1, created_at: -1, _id: -1 })
        .limit(newestLimit)
        .select('name slug short_description description meta_description images price price_min original_price discount_percent offers'),
      getDigestCoupons(couponsLimit),
    ]);
    const deals = dealDocuments.map((product) => toDigestProduct(product.toObject()));
    const newest = newestDocuments.map((product) => toDigestProduct(product.toObject()));

    if (deals.length === 0 && newest.length === 0 && coupons.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: { dayKey: period.dayKey, sent: 0, skipped: 'no_deals_or_products' },
      });
    }

    const siteName = process.env.EMAIL_SITE_NAME?.trim() || 'TheHavenDeals';
    const siteUrl = getInsiderSiteUrl();
    const listId = `${siteName} Insider <insider.${new URL(siteUrl).hostname}>`;
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
          deals,
          newest,
          coupons,
          unsubscribeUrl: unsubscribeUrl.toString(),
        });

        return {
          to: subscriber.email,
          ...rendered,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl.toString()}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'List-ID': listId,
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
        deals: deals.length,
        newest: newest.length,
        coupons: coupons.length,
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
