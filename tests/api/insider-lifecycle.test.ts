import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/mailer', () => ({
  isEmailConfigured: () => true,
  sendEmail: emailMocks.sendEmail,
  sendEmailBatch: vi.fn(),
}));
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';
import { createInsiderToken } from '@/lib/insider/tokens';
import { POST as createHandler } from '@/app/api/v1/public/insider/route';
import { GET as confirmLinkHandler, POST as confirmHandler } from '@/app/api/v1/public/insider/confirm/route';
import { GET as unsubscribeLinkHandler, POST as unsubscribeHandler } from '@/app/api/v1/public/insider/unsubscribe/route';

function jsonRequest(url: string, token: string) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

describe('Insider confirmation and unsubscribe APIs', () => {
  beforeAll(() => {
    process.env.INSIDER_TOKEN_SECRET = 'vitest-insider-token-secret';
    process.env.RESEND_API = 'vitest-resend-api-key';
  });

  beforeEach(() => {
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ id: 'test-confirmation-email-id' });
  });

  it('keeps a legacy subscriber without a status active during rollout', async () => {
    await connectToDatabase();
    await SubscriberModel.collection.insertOne({
      email: 'legacy@example.com',
      subscribed_at: new Date(),
    });
    const request = new Request('http://localhost/api/v1/public/insider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'legacy@example.com' }),
    });

    const response = await createHandler(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.message).toContain('confirmation check was sent');
    expect(emailMocks.sendEmail).toHaveBeenCalledOnce();

    const rawSubscriber = await SubscriberModel.collection.findOne({ email: 'legacy@example.com' });
    expect(rawSubscriber?.status).toBeUndefined();
  });

  it('sends an active Insider a confirmation check and reports already active on confirm', async () => {
    await connectToDatabase();
    const subscriber = await SubscriberModel.create({
      email: 'already-active@example.com',
      status: 'active',
      confirmed_at: new Date(),
    });
    const subscribeRequest = new Request('http://localhost/api/v1/public/insider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: subscriber.email }),
    });

    const subscribeResponse = await createHandler(subscribeRequest);
    expect(subscribeResponse.status).toBe(200);
    expect(emailMocks.sendEmail).toHaveBeenCalledOnce();

    const refreshed = await SubscriberModel.findById(subscriber._id).lean();
    expect(refreshed?.status).toBe('active');
    expect(refreshed?.confirmation_expires_at).toBeInstanceOf(Date);
    const token = createInsiderToken(
      'confirm',
      subscriber._id.toString(),
      refreshed!.confirmation_expires_at,
    );
    const confirmResponse = await confirmHandler(
      jsonRequest('http://localhost/api/v1/public/insider/confirm', token),
    );
    const confirmPayload = await confirmResponse.json();

    expect(confirmResponse.status).toBe(200);
    expect(confirmPayload.alreadyActive).toBe(true);
    expect(confirmPayload.message).toContain('already an AIDEALSUK Insider');
  });

  it('confirms a pending subscriber', async () => {
    await connectToDatabase();
    const expiresAt = new Date(Date.now() + 60_000);
    const subscriber = await SubscriberModel.create({
      email: 'pending@example.com',
      status: 'pending',
      confirmation_expires_at: expiresAt,
    });
    const token = createInsiderToken('confirm', subscriber._id.toString(), expiresAt);

    const response = await confirmHandler(jsonRequest('http://localhost/api/v1/public/insider/confirm', token));
    expect(response.status).toBe(200);

    const updated = await SubscriberModel.findById(subscriber._id);
    expect(updated?.status).toBe('active');
    expect(updated?.confirmed_at).toBeInstanceOf(Date);
    expect(updated?.confirmation_expires_at).toBeUndefined();
  });

  it('redirects a confirmed link to the success page', async () => {
    await connectToDatabase();
    const expiresAt = new Date(Date.now() + 60_000);
    const subscriber = await SubscriberModel.create({
      email: 'confirm-link@example.com',
      status: 'pending',
      confirmation_expires_at: expiresAt,
    });
    const token = createInsiderToken('confirm', subscriber._id.toString(), expiresAt);

    const response = await confirmLinkHandler(
      new Request(`http://localhost/api/v1/public/insider/confirm?token=${encodeURIComponent(token)}`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://aidealsuk.com/insider/success?status=confirmed');
  });

  it('redirects an invalid confirmation link to the failed page', async () => {
    const response = await confirmLinkHandler(
      new Request('http://localhost/api/v1/public/insider/confirm?token=invalid'),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://aidealsuk.com/insider/failed');
  });

  it('unsubscribes an active subscriber idempotently', async () => {
    await connectToDatabase();
    const subscriber = await SubscriberModel.create({
      email: 'active@example.com',
      status: 'active',
      confirmed_at: new Date(),
    });
    const token = createInsiderToken('unsubscribe', subscriber._id.toString());
    const requestUrl = 'http://localhost/api/v1/public/insider/unsubscribe';

    const firstResponse = await unsubscribeHandler(jsonRequest(requestUrl, token));
    const secondResponse = await unsubscribeHandler(jsonRequest(requestUrl, token));
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const updated = await SubscriberModel.findById(subscriber._id);
    expect(updated?.status).toBe('unsubscribed');
    expect(updated?.unsubscribed_at).toBeInstanceOf(Date);
  });

  it('redirects an unsubscribe link to the success page', async () => {
    await connectToDatabase();
    const subscriber = await SubscriberModel.create({
      email: 'unsubscribe-link@example.com',
      status: 'active',
      confirmed_at: new Date(),
    });
    const token = createInsiderToken('unsubscribe', subscriber._id.toString());

    const response = await unsubscribeLinkHandler(
      new Request(`http://localhost/api/v1/public/insider/unsubscribe?token=${encodeURIComponent(token)}`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://aidealsuk.com/insider/success?status=unsubscribed');
  });
});
