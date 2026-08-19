import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { isEmailConfigured } from '@/lib/email/mailer';
import { sendInsiderWelcomeEmail } from '@/lib/email/welcome-email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim()) || email.length > 254) {
      return NextResponse.json({ status: 'error', message: 'Please enter a valid email address' }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      console.error('Subscribe API error: email service is not configured');
      return NextResponse.json(
        { status: 'error', message: 'Email service is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    await connectToDatabase();
    const existing = await SubscriberModel.findOne({ email: cleanEmail });
    const subscriber = existing ?? await SubscriberModel.create({ email: cleanEmail });

    try {
      const emailResult = await sendInsiderWelcomeEmail(cleanEmail);
      await SubscriberModel.findByIdAndUpdate(subscriber._id, {
        email_status: 'sent',
        last_email_id: emailResult.id,
        $unset: { opened_at: 1 },
      });
    } catch (emailError) {
      if (!existing) {
        await SubscriberModel.findByIdAndDelete(subscriber._id).catch((rollbackError) => {
          console.error('Subscriber rollback error:', rollbackError);
        });
      }
      console.error('Welcome email error:', emailError);
      return NextResponse.json(
        { status: 'error', message: 'We could not send the confirmation email. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Thank you for subscribing! Your insider briefing is on its way.',
    });
  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json({ status: 'error', message: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
