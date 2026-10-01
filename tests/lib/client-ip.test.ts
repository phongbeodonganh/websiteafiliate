import { describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/utils';

// SEC-04 / T-1-16 / D-14: getClientIp must parse the LAST trusted hop of
// X-Forwarded-For (the entry our own Nginx appends per DEPLOY.md §8), never
// the first. The first entry is attacker-controlled on a spoofed request and
// was previously the value the limiter keyed on. These tests use
// SINGLE-ENTRY XFF values wherever a multi-hop XFF is not under test — that
// keeps the matrix order-invariant under any later XFF-parse change (same
// contract the rate-limit suite pins in tests/api/rate-limit.test.ts).

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request('http://localhost/', { headers });
}

describe('getClientIp (SEC-04 / T-1-16 last-hop XFF parsing)', () => {
  it('returns a single X-Forwarded-For entry as that entry', () => {
    const req = requestWithHeaders({ 'x-forwarded-for': '203.0.113.10' });
    expect(getClientIp(req)).toBe('203.0.113.10');
  });

  it('returns the LAST X-Forwarded-For entry even when the first entry is a spoofed value', () => {
    // The attacker prepends a forged client IP; our Nginx (DEPLOY.md §8)
    // appends the real $remote_addr as the last entry. getClientIp must trust
    // only that last trusted hop.
    const req = requestWithHeaders({
      'x-forwarded-for': '1.2.3.4, 203.0.113.10',
    });
    expect(getClientIp(req)).toBe('203.0.113.10');
  });

  it('returns the LAST of more than two hops (spoofed chain)', () => {
    // A longer client-supplied chain still resolves to the last entry.
    const req = requestWithHeaders({
      'x-forwarded-for': '1.2.3.4, 9.9.9.9, 198.51.100.42',
    });
    expect(getClientIp(req)).toBe('198.51.100.42');
  });

  it('trims whitespace around the last XFF entry', () => {
    const req = requestWithHeaders({
      'x-forwarded-for': 'spoofed,  203.0.113.20  ',
    });
    expect(getClientIp(req)).toBe('203.0.113.20');
  });

  it('falls back to X-Real-IP when X-Forwarded-For is absent', () => {
    const req = requestWithHeaders({ 'x-real-ip': '203.0.113.30' });
    expect(getClientIp(req)).toBe('203.0.113.30');
  });

  it('prefers X-Forwarded-For over X-Real-IP when both are present', () => {
    const req = requestWithHeaders({
      'x-forwarded-for': 'spoofed-first, 203.0.113.40',
      'x-real-ip': '203.0.113.99',
    });
    expect(getClientIp(req)).toBe('203.0.113.40');
  });

  it("defaults to '127.0.0.1' when neither header is present", () => {
    // Prohibition #4 (01-07-PLAN): plan 05's limiter and existing tests key on
    // this exact default — it must not change.
    const req = requestWithHeaders({});
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
