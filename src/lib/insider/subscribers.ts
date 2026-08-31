import type { QueryFilter } from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel, type ISubscriber } from '@/lib/db/models';
import { verifyInsiderToken } from './tokens';

export const ACTIVE_SUBSCRIBER_FILTER: QueryFilter<ISubscriber> = {
  $or: [
    { status: 'active' },
    { status: { $exists: false } },
  ],
};

export function getInsiderSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://aidealsuk.com').replace(/\/$/, '');
}

export async function confirmInsider(token: string) {
  const payload = verifyInsiderToken(token, 'confirm');
  await connectToDatabase();

  const subscriber = await SubscriberModel.findById(payload.subscriberId).lean();
  if (!subscriber) throw new Error('Subscriber not found');
  if (subscriber.status === 'active' || !subscriber.status) return { alreadyActive: true };
  if (subscriber.status !== 'pending' || !subscriber.confirmation_expires_at) {
    throw new Error('Subscription cannot be confirmed');
  }
  if (subscriber.confirmation_expires_at.getTime() !== payload.expiresAt) {
    throw new Error('Confirmation link has been replaced');
  }

  const confirmedAt = new Date();
  await SubscriberModel.findByIdAndUpdate(subscriber._id, {
    $set: {
      status: 'active',
      confirmed_at: confirmedAt,
      subscribed_at: confirmedAt,
    },
    $unset: {
      confirmation_expires_at: 1,
      unsubscribed_at: 1,
    },
  });

  return { alreadyActive: false };
}

export async function unsubscribeInsider(token: string) {
  const payload = verifyInsiderToken(token, 'unsubscribe');
  await connectToDatabase();

  const subscriber = await SubscriberModel.findById(payload.subscriberId);
  if (!subscriber) throw new Error('Subscriber not found');
  if (subscriber.status === 'unsubscribed') return { alreadyUnsubscribed: true };

  await SubscriberModel.findByIdAndUpdate(subscriber._id, {
    $set: {
      status: 'unsubscribed',
      unsubscribed_at: new Date(),
    },
    $unset: {
      confirmation_expires_at: 1,
      last_digest_key: 1,
    },
  });

  return { alreadyUnsubscribed: false };
}
