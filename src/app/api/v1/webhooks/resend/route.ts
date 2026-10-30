import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';

type ResendEmailEventType =
  | 'email.opened'
  | 'email.bounced'
  | 'email.complained'
  | 'email.failed'
  | 'email.suppressed';

interface ResendEmailEvent {
  type: ResendEmailEventType;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    bounce?: {
      type?: 'Permanent' | 'Transient' | 'Undetermined';
    };
  };
}

const TRACKED_EMAIL_EVENTS = new Set<ResendEmailEventType>([
  'email.opened',
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
]);

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('Resend webhook error: RESEND_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
  }

  try {
    const payload = await req.text();
    const event = new Webhook(secret).verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendEmailEvent | { type: string };

    if (!TRACKED_EMAIL_EVENTS.has(event.type as ResendEmailEventType)) {
      return NextResponse.json({ received: true });
    }

    const emailEvent = event as ResendEmailEvent;
    const recipient = emailEvent.data.to[0]?.trim().toLowerCase();
    if (!recipient) {
      return NextResponse.json({ received: true });
    }

    await connectToDatabase();
    const eventDate = new Date(emailEvent.created_at);
    const isPermanentBounce = emailEvent.type === 'email.bounced'
      && emailEvent.data.bounce?.type === 'Permanent';
    const shouldUnsubscribe = isPermanentBounce
      || emailEvent.type === 'email.complained'
      || emailEvent.type === 'email.suppressed';
    const emailStatus = emailEvent.type.replace('email.', '') as
      'opened' | 'failed' | 'bounced' | 'complained' | 'suppressed';
    const subscriber = await SubscriberModel.findOneAndUpdate(
      {
        email: recipient,
        ...(emailEvent.type === 'email.opened' ? { status: { $ne: 'unsubscribed' } } : {}),
      },
      {
        $set: {
          email_status: emailStatus,
          last_email_id: emailEvent.data.email_id,
          ...(emailEvent.type === 'email.opened' ? { opened_at: eventDate } : {}),
          ...(shouldUnsubscribe ? { status: 'unsubscribed', unsubscribed_at: eventDate } : {}),
        },
      },
      { returnDocument: 'after' },
    );

    console.log('Resend email event:', {
      type: emailEvent.type,
      emailId: emailEvent.data.email_id,
      recipient,
      unsubscribed: shouldUnsubscribe,
      subscriberUpdated: Boolean(subscriber),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Resend webhook verification error:', error);
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
