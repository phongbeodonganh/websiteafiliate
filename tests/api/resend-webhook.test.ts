import { beforeEach, describe, expect, it, vi } from 'vitest';

const svixMocks = vi.hoisted(() => ({
  event: {} as Record<string, unknown>,
  verify: vi.fn(),
}));

vi.mock('svix', () => ({
  Webhook: class {
    verify() {
      return svixMocks.verify();
    }
  },
}));

import { POST } from '@/app/api/v1/webhooks/resend/route';
import { connectToDatabase } from '@/lib/db/mongodb';
import { SubscriberModel } from '@/lib/db/models';

function webhookRequest() {
  return new Request('http://localhost/api/v1/webhooks/resend', {
    method: 'POST',
    body: JSON.stringify(svixMocks.event),
    headers: {
      'content-type': 'application/json',
      'svix-id': 'msg_test',
      'svix-timestamp': '1234567890',
      'svix-signature': 'v1,test',
    },
  });
}

function setEvent(type: string, extraData: Record<string, unknown> = {}) {
  svixMocks.event = {
    type,
    created_at: '2026-10-30T08:00:00.000Z',
    data: {
      email_id: `email-${type}`,
      to: ['subscriber@example.com'],
      ...extraData,
    },
  };
  svixMocks.verify.mockReturnValue(svixMocks.event);
}

describe('POST /api/v1/webhooks/resend', () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_vitest';
    svixMocks.verify.mockReset();
  });

  it('unsubscribes recipients who report the message as spam', async () => {
    await connectToDatabase();
    await SubscriberModel.create({
      email: 'subscriber@example.com',
      status: 'active',
      confirmed_at: new Date(),
    });
    setEvent('email.complained');

    const response = await POST(webhookRequest());
    const subscriber = await SubscriberModel.findOne({ email: 'subscriber@example.com' }).lean();

    expect(response.status).toBe(200);
    expect(subscriber?.status).toBe('unsubscribed');
    expect(subscriber?.email_status).toBe('complained');
    expect(subscriber?.unsubscribed_at?.toISOString()).toBe('2026-10-30T08:00:00.000Z');
  });

  it('unsubscribes a permanent bounce but keeps a transient bounce eligible', async () => {
    await connectToDatabase();
    await SubscriberModel.create({
      email: 'subscriber@example.com',
      status: 'active',
      confirmed_at: new Date(),
    });
    setEvent('email.bounced', { bounce: { type: 'Transient' } });

    await POST(webhookRequest());
    let subscriber = await SubscriberModel.findOne({ email: 'subscriber@example.com' }).lean();
    expect(subscriber?.status).toBe('active');
    expect(subscriber?.email_status).toBe('bounced');

    setEvent('email.bounced', { bounce: { type: 'Permanent' } });
    await POST(webhookRequest());
    subscriber = await SubscriberModel.findOne({ email: 'subscriber@example.com' }).lean();
    expect(subscriber?.status).toBe('unsubscribed');
    expect(subscriber?.email_status).toBe('bounced');
  });

  it('does not overwrite a complaint when a late open event arrives', async () => {
    await connectToDatabase();
    await SubscriberModel.create({
      email: 'subscriber@example.com',
      status: 'unsubscribed',
      email_status: 'complained',
      unsubscribed_at: new Date('2026-10-30T08:00:00.000Z'),
    });
    setEvent('email.opened');

    await POST(webhookRequest());
    const subscriber = await SubscriberModel.findOne({ email: 'subscriber@example.com' }).lean();

    expect(subscriber?.status).toBe('unsubscribed');
    expect(subscriber?.email_status).toBe('complained');
    expect(subscriber?.opened_at).toBeUndefined();
  });
});
