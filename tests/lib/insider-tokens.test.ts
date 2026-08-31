import { beforeAll, describe, expect, it } from 'vitest';
import { createInsiderToken, verifyInsiderToken } from '@/lib/insider/tokens';

const subscriberId = '507f1f77bcf86cd799439011';

describe('Insider tokens', () => {
  beforeAll(() => {
    process.env.INSIDER_TOKEN_SECRET = 'vitest-insider-token-secret';
  });

  it('creates and verifies a confirmation token with an expiry', () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const token = createInsiderToken('confirm', subscriberId, expiresAt);

    expect(verifyInsiderToken(token, 'confirm')).toMatchObject({
      purpose: 'confirm',
      subscriberId,
      expiresAt: expiresAt.getTime(),
    });
  });

  it('rejects tampered and expired confirmation tokens', () => {
    const validToken = createInsiderToken('confirm', subscriberId, new Date(Date.now() + 60_000));
    expect(() => verifyInsiderToken(`${validToken}x`, 'confirm')).toThrow('Invalid or expired Insider token');

    const expiredToken = createInsiderToken('confirm', subscriberId, new Date(Date.now() - 1));
    expect(() => verifyInsiderToken(expiredToken, 'confirm')).toThrow('Invalid or expired Insider token');
  });

  it('creates a non-expiring unsubscribe token scoped to its purpose', () => {
    const token = createInsiderToken('unsubscribe', subscriberId);

    expect(verifyInsiderToken(token, 'unsubscribe')).toMatchObject({
      purpose: 'unsubscribe',
      subscriberId,
    });
    expect(() => verifyInsiderToken(token, 'confirm')).toThrow('Invalid or expired Insider token');
  });
});
