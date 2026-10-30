import { beforeEach, describe, expect, it, vi } from 'vitest';

const emailMocks = vi.hoisted(() => ({
  sendEmailBatch: vi.fn(),
}));

vi.mock('@/lib/email/mailer', () => ({
  isEmailConfigured: () => true,
  sendEmail: vi.fn(),
  sendEmailBatch: emailMocks.sendEmailBatch,
}));

import { signToken } from '@/lib/auth';
import { SubscriberModel, UserModel } from '@/lib/db/models';
import { ProductModel } from '@/lib/db/product-models';
import { connectToDatabase } from '@/lib/db/mongodb';
import { POST as sendNowHandler } from '@/app/api/v1/cms/insider/send-now/route';
import { POST as cronDigestHandler } from '@/app/api/v1/cron/insider-digest/route';

function requestWithToken(token?: string) {
  return new Request('http://localhost/api/v1/cms/insider/send-now', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

describe('POST /api/v1/cms/insider/send-now', () => {
  beforeEach(() => {
    emailMocks.sendEmailBatch.mockReset();
    emailMocks.sendEmailBatch.mockImplementation(async (messages: unknown[]) => ({
      ids: messages.map((_, index) => `test-digest-${index}`),
    }));
  });

  it('rejects unauthenticated and non-admin requests', async () => {
    const unauthenticated = await sendNowHandler(requestWithToken());
    expect(unauthenticated.status).toBe(403);

    const editorToken = signToken({ userId: 'editor-id', username: 'editor', role: 'editor' });
    const editor = await sendNowHandler(requestWithToken(editorToken));
    expect(editor.status).toBe(403);
  });

  it('requires server-side cron configuration for an admin request', async () => {
    const previousSecret = process.env.INSIDER_CRON_SECRET;
    delete process.env.INSIDER_CRON_SECRET;
    try {
      // D-15: the guard resolves the principal in the DB, so the admin token must
      // be signed with a real active user's ObjectId (fail-closed rejects literals).
      await connectToDatabase();
      const admin = await UserModel.create({
        username: 'insider-admin-cron-unset',
        password_hash: 'irrelevant-not-used-in-this-test',
        role: 'admin',
        status: 'active',
      });
      const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
      const response = await sendNowHandler(requestWithToken(adminToken));
      expect(response.status).toBe(503);
    } finally {
      if (previousSecret) process.env.INSIDER_CRON_SECRET = previousSecret;
    }
  });

  it('sends product deals, newest products and coupons without suppressing the scheduled cron', async () => {
    const previousSecret = process.env.INSIDER_CRON_SECRET;
    const previousTokenSecret = process.env.INSIDER_TOKEN_SECRET;
    process.env.INSIDER_CRON_SECRET = 'vitest-insider-cron-secret';
    process.env.INSIDER_TOKEN_SECRET = 'vitest-insider-token-secret';

    try {
      await connectToDatabase();
      // D-15: seed a real active admin (distinct username from test 2 — `username`
      // is unique) and sign the admin token with its ObjectId so the guard passes.
      const admin = await UserModel.create({
        username: 'insider-admin-cron-set',
        password_hash: 'irrelevant-not-used-in-this-test',
        role: 'admin',
        status: 'active',
      });
      const subscriber = await SubscriberModel.create({
        email: 'manual-then-cron@example.com',
        status: 'active',
        confirmed_at: new Date(),
      });
      await ProductModel.create({
        name: 'Half-price test product',
        slug: 'half-price-test-product',
        sku: 'INSIDER-DEAL-1',
        short_description: 'A product selected for the daily deals email.',
        status: 'published',
        is_deal: true,
        price: 50,
        original_price: 100,
      });
      for (let discount = 1; discount <= 11; discount += 1) {
        await ProductModel.create({
          name: `Ranked deal ${discount}`,
          slug: `ranked-deal-${discount}`,
          sku: `INSIDER-RANK-${discount}`,
          short_description: `Product with a ${discount}% saving.`,
          status: 'published',
          is_deal: true,
          price: 100 - discount,
          original_price: 100,
        });
      }

      const adminToken = signToken({ userId: admin._id.toString(), username: admin.username, role: 'admin' });
      const manualResponse = await sendNowHandler(requestWithToken(adminToken));
      const manualPayload = await manualResponse.json();

      expect(manualResponse.status).toBe(200);
      expect(manualPayload.data.deals).toBe(10);
      expect(manualPayload.data.newest).toBe(10);
      expect(manualPayload.data.coupons).toBeGreaterThan(0);
      expect(manualPayload.data.sent).toBe(1);
      const firstMessage = (emailMocks.sendEmailBatch.mock.calls[0][0] as {
        html: string;
        subject: string;
        headers: Record<string, string>;
      }[])[0];
      expect(firstMessage.html).toContain('/products/half-price-test-product');
      expect(firstMessage.html).toContain('50% lower');
      expect(firstMessage.html).toContain('Top 10 coupon deals');
      expect(firstMessage.subject).toContain('Daily Edit');
      expect(firstMessage.headers['List-Unsubscribe']).toMatch(/^<https?:\/\//);
      expect(firstMessage.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      expect(firstMessage.headers['List-ID']).toContain('TheHavenDeals Insider');

      const afterManual = await SubscriberModel.findById(subscriber._id).lean();
      expect(afterManual?.last_digest_key).toBeUndefined();

      const cronResponse = await cronDigestHandler(new Request(
        'http://localhost/api/v1/cron/insider-digest',
        { method: 'POST', headers: { Authorization: 'Bearer vitest-insider-cron-secret' } },
      ));
      const cronPayload = await cronResponse.json();

      expect(cronResponse.status).toBe(200);
      expect(cronPayload.data.deals).toBe(10);
      expect(cronPayload.data.newest).toBe(10);
      expect(cronPayload.data.coupons).toBeGreaterThan(0);
      expect(cronPayload.data.sent).toBe(1);
      expect(emailMocks.sendEmailBatch).toHaveBeenCalledTimes(2);

      const manualIdempotencyKey = emailMocks.sendEmailBatch.mock.calls[0][1];
      const scheduledIdempotencyKey = emailMocks.sendEmailBatch.mock.calls[1][1];
      expect(manualIdempotencyKey).toMatch(/^insider-digest-manual-/);
      expect(scheduledIdempotencyKey).toContain(`insider-digest-scheduled-${cronPayload.data.dayKey}-`);
      expect(manualIdempotencyKey).not.toBe(scheduledIdempotencyKey);

      const afterCron = await SubscriberModel.findById(subscriber._id).lean();
      expect(afterCron?.last_digest_key).toBe(cronPayload.data.dayKey);
    } finally {
      if (previousSecret) process.env.INSIDER_CRON_SECRET = previousSecret;
      else delete process.env.INSIDER_CRON_SECRET;
      if (previousTokenSecret) process.env.INSIDER_TOKEN_SECRET = previousTokenSecret;
      else delete process.env.INSIDER_TOKEN_SECRET;
    }
  });
});
