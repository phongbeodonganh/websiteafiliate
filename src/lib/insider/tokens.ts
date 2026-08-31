import { createHmac, timingSafeEqual } from 'node:crypto';

type InsiderTokenPurpose = 'confirm' | 'unsubscribe';

interface InsiderTokenPayload {
  v: 1;
  purpose: InsiderTokenPurpose;
  subscriberId: string;
  expiresAt?: number;
}

export class InsiderTokenError extends Error {
  constructor(message = 'Invalid or expired Insider token') {
    super(message);
    this.name = 'InsiderTokenError';
  }
}

function getTokenSecret() {
  const secret = process.env.INSIDER_TOKEN_SECRET?.trim() || process.env.RESEND_API?.trim();
  if (!secret) throw new InsiderTokenError('Insider token service is not configured');
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac('sha256', getTokenSecret()).update(encodedPayload).digest('base64url');
}

export function createInsiderToken(
  purpose: InsiderTokenPurpose,
  subscriberId: string,
  expiresAt?: Date,
) {
  if (purpose === 'confirm' && !expiresAt) {
    throw new InsiderTokenError('Confirmation token expiry is required');
  }

  const payload: InsiderTokenPayload = {
    v: 1,
    purpose,
    subscriberId,
    ...(expiresAt ? { expiresAt: expiresAt.getTime() } : {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyInsiderToken(token: string, expectedPurpose: InsiderTokenPurpose) {
  const [encodedPayload, providedSignature, extraPart] = token.split('.');
  if (!encodedPayload || !providedSignature || extraPart) throw new InsiderTokenError();

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
  if (
    providedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new InsiderTokenError();
  }

  let payload: InsiderTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as InsiderTokenPayload;
  } catch {
    throw new InsiderTokenError();
  }

  if (
    payload.v !== 1
    || payload.purpose !== expectedPurpose
    || !/^[a-f\d]{24}$/i.test(payload.subscriberId)
  ) {
    throw new InsiderTokenError();
  }

  if (expectedPurpose === 'confirm') {
    if (!payload.expiresAt || payload.expiresAt <= Date.now()) throw new InsiderTokenError();
  }

  return payload;
}
