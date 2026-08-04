import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ status: 'error', message: 'Please enter a valid email address' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    await connectToDatabase();
    const existing = await SubscriberModel.findOne({ email: cleanEmail });

    if (existing) {
      return NextResponse.json({
        status: 'success',
        message: 'You are already subscribed to our exclusive research briefings!',
      });
    }

    await SubscriberModel.create({ email: cleanEmail });

    return NextResponse.json({
      status: 'success',
      message: 'Thank you for subscribing! Your insider briefing is on its way.',
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json({ status: 'error', message: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
