import { afterEach, describe, expect, it } from 'vitest';
import { POST as subscribeHandler } from '@/app/api/v1/public/insider/route';
import { POST as confirmHandler } from '@/app/api/v1/public/insider/confirm/route';
import { POST as cronDigestHandler } from '@/app/api/v1/cron/insider-digest/route';
import { isInsiderEnabled } from '@/lib/insider/feature';

const originalFlag = process.env.NEXT_PUBLIC_INSIDER_ENABLED;
const originalCronSecret = process.env.INSIDER_CRON_SECRET;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_INSIDER_ENABLED;
  else process.env.NEXT_PUBLIC_INSIDER_ENABLED = originalFlag;

  if (originalCronSecret === undefined) delete process.env.INSIDER_CRON_SECRET;
  else process.env.INSIDER_CRON_SECRET = originalCronSecret;
});

describe('Insider feature flag', () => {
  it('fails closed when the variable is omitted', () => {
    delete process.env.NEXT_PUBLIC_INSIDER_ENABLED;
    expect(isInsiderEnabled()).toBe(false);
  });

  it.each(['true', '1', 'on', 'yes', ' TRUE '])('treats %j as enabled', (value) => {
    process.env.NEXT_PUBLIC_INSIDER_ENABLED = value;
    expect(isInsiderEnabled()).toBe(true);
  });

  it('blocks signup, confirmation and an authorized digest before doing work', async () => {
    process.env.NEXT_PUBLIC_INSIDER_ENABLED = 'false';
    process.env.INSIDER_CRON_SECRET = 'feature-flag-test-secret';

    const signup = await subscribeHandler(new Request('http://localhost/api/v1/public/insider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'disabled@example.com' }),
    }));
    const confirmation = await confirmHandler(new Request('http://localhost/api/v1/public/insider/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'unused-while-disabled' }),
    }));
    const digest = await cronDigestHandler(new Request('http://localhost/api/v1/cron/insider-digest', {
      method: 'POST',
      headers: { Authorization: 'Bearer feature-flag-test-secret' },
    }));

    for (const response of [signup, confirmation, digest]) {
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({
        status: 'error',
        message: 'Insider is currently disabled.',
      });
    }
  });
});
