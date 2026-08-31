import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { isEmailConfigured } from '@/lib/email/mailer';
import { sendInsiderConfirmationEmail } from '@/lib/email/welcome-email';
import { getInsiderSiteUrl, unsubscribeInsider } from '@/lib/insider/subscribers';
import { createInsiderToken } from '@/lib/insider/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_RESEND_COOLDOWN_MS = 60 * 1000;

function getConfirmationTtlMs() {
  const configuredHours = Number.parseInt(process.env.INSIDER_CONFIRM_TOKEN_TTL_HOURS || '24', 10);
  const hours = Number.isFinite(configuredHours) ? Math.min(Math.max(configuredHours, 1), 168) : 24;
  return hours * 60 * 60 * 1000;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { email?: unknown } | null;
    const cleanEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json(
        { status: 'error', message: 'Please enter a valid email address' },
        { status: 400 },
      );
    }

    if (!isEmailConfigured()) {
      console.error('Insider API error: email service is not configured');
      return NextResponse.json(
        { status: 'error', message: 'Email service is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    await connectToDatabase();
    const existing = await SubscriberModel.findOne({ email: cleanEmail }).lean();
    const alreadyActive = Boolean(existing && (existing.status === 'active' || !existing.status));

    if (
      existing?.status === 'pending'
      && existing.confirmation_sent_at
      && Date.now() - existing.confirmation_sent_at.getTime() < CONFIRMATION_RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json({
        status: 'success',
        message: 'A confirmation email was already sent. Please check your inbox.',
      });
    }

    const confirmationExpiresAt = new Date(Date.now() + getConfirmationTtlMs());
    const subscriberId = existing
      ? existing._id
      : (await SubscriberModel.create({
          email: cleanEmail,
          status: 'pending',
          confirmation_expires_at: confirmationExpiresAt,
        }))._id;

    if (existing && !alreadyActive) {
      await SubscriberModel.findByIdAndUpdate(existing._id, {
        $set: {
          status: 'pending',
          confirmation_expires_at: confirmationExpiresAt,
        },
        $unset: { unsubscribed_at: 1 },
      });
    }

    const confirmationToken = createInsiderToken(
      'confirm',
      subscriberId.toString(),
      confirmationExpiresAt,
    );
    const confirmationUrl = new URL('/api/v1/public/insider/confirm', getInsiderSiteUrl());
    confirmationUrl.searchParams.set('token', confirmationToken);

    const emailResult = await sendInsiderConfirmationEmail(
      cleanEmail,
      confirmationUrl.toString(),
      `insider-confirm-${subscriberId.toString()}-${confirmationExpiresAt.getTime()}`,
    );
    await SubscriberModel.findByIdAndUpdate(subscriberId, {
      $set: {
        ...(!alreadyActive ? { status: 'pending' as const } : {}),
        confirmation_sent_at: new Date(),
        confirmation_expires_at: confirmationExpiresAt,
        email_status: 'sent',
        last_email_id: emailResult.id,
      },
      $unset: { opened_at: 1 },
    });

    return NextResponse.json({
      status: 'success',
      message: alreadyActive
        ? 'A confirmation check was sent. The link will show that you are already an Insider.'
        : 'Please check your inbox and confirm your Insider subscription.',
    });
  } catch (error) {
    console.error('Create Insider API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'We could not create the subscription. Please try again.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { token?: unknown } | null;
    if (typeof body?.token !== 'string' || !body.token) {
      return NextResponse.json({ status: 'error', message: 'Unsubscribe token is required' }, { status: 400 });
    }

    await unsubscribeInsider(body.token);
    return NextResponse.json({ status: 'success', message: 'You have been unsubscribed.' });
  } catch (error) {
    console.error('Cancel Insider API error:', error);
    return NextResponse.json({ status: 'error', message: 'Invalid unsubscribe link.' }, { status: 400 });
  }
}
