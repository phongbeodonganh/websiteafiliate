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
// Hard prerequisite: ecosystem.config.js `instances: 1, exec_mode: 'fork'` —
// a second PM2 instance would hold its own Map and bypass the limits.
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

// ---------------------------------------------------------------------------
// Count-based sliding-window limiter (additive — failure-lockout API above stays
// untouched). Public write endpoints (subscribe/click/redirect) need a "count
// requests, cap N per window" policy distinct from the failure-lockout limiter
// the login route uses.
//
// Same in-memory, per-process contract as `attempts` above: correct only for a
// single-instance deployment (ecosystem.config.js `instances: 1, fork`).
// ---------------------------------------------------------------------------

interface WindowEntry {
  count: number;
  windowStart: number;
}

// In-memory, per-process store. See `attempts` above for the single-instance caveat.
const requestWindows = new Map<string, WindowEntry>();

export interface ConsumeResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// Count-based sliding-window limiter. Increments the key's count for the current
// window; returns `allowed: false` with a ceil'd `retryAfterSeconds` once the
// configured limit is exceeded. Stale entries older than `windowMs` are pruned
// on touch (same lazy-prune-on-read idea as src/lib/tokenBlacklist.ts).
export function consumeRequest(key: string, limit: number, windowMs: number): ConsumeResult {
  const now = Date.now();
  let entry = requestWindows.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window (first touch OR stale entry older than the window).
    requestWindows.set(key, { count: 1, windowStart: now });
    pruneStaleWindows(now, windowMs);
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > limit) {
    // Over the cap. Retry-After is the whole seconds until this window's
    // start + windowMs (integer math per SEC-04/precision).
    const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }
  return { allowed: true };
}

// Dedupe window for click/redirect analytics: returns true when the key was
// already recorded within windowMs (no per-request counter — first touch wins,
// subsequent touches refresh lastSeenAt but do NOT extend the dedupe decision).
// Prunes stale entries on read.
interface DedupeEntry {
  lastSeenAt: number;
}

const dedupeWindows = new Map<string, DedupeEntry>();

export function consumeDedupe(key: string, windowMs: number): boolean {
  const now = Date.now();
  const entry = dedupeWindows.get(key);
  // Prune stale entries on touch so the map can't grow unboundedly.
  pruneStaleDedupe(now, windowMs);
  if (entry && now - entry.lastSeenAt < windowMs) {
    entry.lastSeenAt = now;
    return true; // duplicate within the window
  }
  dedupeWindows.set(key, { lastSeenAt: now });
  return false;
}

// Test-only reset affordance (RESEARCH Pitfall 3): the limiter Map state is
// module-level and shared across tests in a single file (fileParallelism: false).
// Clears ONLY the new count-based / dedupe maps — the failure-lockout `attempts`
// map has its own resetRateLimit(key) per-key API and is untouched.
export function _resetForTests(): void {
  requestWindows.clear();
  dedupeWindows.clear();
}

function pruneStaleWindows(now: number, windowMs: number): void {
  for (const [k, v] of requestWindows) {
    if (now - v.windowStart >= windowMs) requestWindows.delete(k);
  }
}

function pruneStaleDedupe(now: number, windowMs: number): void {
  for (const [k, v] of dedupeWindows) {
    if (now - v.lastSeenAt >= windowMs) dedupeWindows.delete(k);
  }
}
