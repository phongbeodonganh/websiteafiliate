import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';

interface ResendOpenedEvent {
  type: 'email.opened';
  created_at: string;
  data: {
    email_id: string;
    to: string[];
  };
}

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
    }) as ResendOpenedEvent | { type: string };

    if (event.type !== 'email.opened') {
      return NextResponse.json({ received: true });
    }

    const openedEvent = event as ResendOpenedEvent;
    const recipient = openedEvent.data.to[0]?.trim().toLowerCase();
    if (!recipient) {
      return NextResponse.json({ received: true });
    }

    await connectToDatabase();
    const subscriber = await SubscriberModel.findOneAndUpdate(
      { email: recipient },
      {
        email_status: 'opened',
        opened_at: new Date(openedEvent.created_at),
        last_email_id: openedEvent.data.email_id,
      },
      { new: true },
    );

    console.log('Resend email opened:', {
      emailId: openedEvent.data.email_id,
      recipient,
      subscriberUpdated: Boolean(subscriber),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Resend webhook verification error:', error);
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}
