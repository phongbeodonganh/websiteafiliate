const WINDOW_MS = 60 * 1000; // count failures within a rolling 1-minute window
const MAX_ATTEMPTS = 5; // failures allowed within the window before locking out
const LOCKOUT_MS = 15 * 60 * 1000; // lockout duration once the threshold is hit

interface Entry {
  failCount: number;
  firstFailAt: number;
  lockedUntil: number;
}

// In-memory, per-process store. Sufficient for a single-instance deployment at this
// traffic scale; would need a shared store (e.g. Redis) behind multiple instances.
const attempts = new Map<string, Entry>();

export interface RateLimitStatus {
  limited: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitStatus {
  const entry = attempts.get(key);
  if (!entry) return { limited: false };

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { limited: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { limited: false };
}

export function recordFailedAttempt(key: string): RateLimitStatus {
  const now = Date.now();
  let entry = attempts.get(key);

  if (!entry || now - entry.firstFailAt > WINDOW_MS) {
    entry = { failCount: 0, firstFailAt: now, lockedUntil: 0 };
  }

  entry.failCount += 1;

  if (entry.failCount > MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }

  attempts.set(key, entry);

  if (entry.lockedUntil > now) {
    return { limited: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { limited: false };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
