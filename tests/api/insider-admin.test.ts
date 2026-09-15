import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

const emailMocks = vi.hoisted(() => ({
  sendEmailBatch: vi.fn(),
}));

vi.mock('@/lib/email/mailer', () => ({
  isEmailConfigured: () => true,
  sendEmail: vi.fn(),
  sendEmailBatch: emailMocks.sendEmailBatch,
}));

import { signToken } from '@/lib/auth';
import { ArticleModel, SubscriberModel } from '@/lib/db/models';
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
      const adminToken = signToken({ userId: 'admin-id', username: 'admin', role: 'admin' });
      const response = await sendNowHandler(requestWithToken(adminToken));
      expect(response.status).toBe(503);
    } finally {
      if (previousSecret) process.env.INSIDER_CRON_SECRET = previousSecret;
    }
  });

  it('sends hottest articles without latest articles and does not suppress the scheduled cron', async () => {
    const previousSecret = process.env.INSIDER_CRON_SECRET;
    const previousTokenSecret = process.env.INSIDER_TOKEN_SECRET;
    process.env.INSIDER_CRON_SECRET = 'vitest-insider-cron-secret';
    process.env.INSIDER_TOKEN_SECRET = 'vitest-insider-token-secret';

    try {
      await connectToDatabase();
      const subscriber = await SubscriberModel.create({
        email: 'manual-then-cron@example.com',
        status: 'active',
        confirmed_at: new Date(),
      });
      await ArticleModel.create({
        author_id: new Types.ObjectId(),
        title: 'Older but hottest article',
        slug: 'older-but-hottest-article',
        content: 'Still the most-read published story.',
        status: 'published',
        view_count: 999,
        created_at: new Date('2020-01-01T00:00:00.000Z'),
      });

      const adminToken = signToken({ userId: 'admin-id', username: 'admin', role: 'admin' });
      const manualResponse = await sendNowHandler(requestWithToken(adminToken));
      const manualPayload = await manualResponse.json();

      expect(manualResponse.status).toBe(200);
      expect(manualPayload.data.latest).toBe(0);
      expect(manualPayload.data.hottest).toBe(1);
      expect(manualPayload.data.sent).toBe(1);

      const afterManual = await SubscriberModel.findById(subscriber._id).lean();
      expect(afterManual?.last_digest_key).toBeUndefined();

      const cronResponse = await cronDigestHandler(new Request(
        'http://localhost/api/v1/cron/insider-digest',
        { method: 'POST', headers: { Authorization: 'Bearer vitest-insider-cron-secret' } },
      ));
      const cronPayload = await cronResponse.json();

      expect(cronResponse.status).toBe(200);
      expect(cronPayload.data.latest).toBe(0);
      expect(cronPayload.data.hottest).toBe(1);
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
