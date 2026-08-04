import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ status: 'error', message: 'Please enter a valid email address' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.select().from(subscribers).where(eq(subscribers.email, cleanEmail)).get();
    if (existing) {
      return NextResponse.json({
        status: 'success',
        message: 'You are already subscribed to our exclusive research briefings!',
      });
    }

    await db.insert(subscribers).values({ email: cleanEmail });

    return NextResponse.json({
      status: 'success',
      message: 'Thank you for subscribing! Your insider briefing is on its way.',
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json({ status: 'error', message: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
