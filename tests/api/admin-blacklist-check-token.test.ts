/**
 * CR-01 — source contract: handleCheckAffUrl routes the affiliate-link
 * blacklist pre-check through cmsFetch with a bearer token and fails closed.
 *
 * The node-env vitest suite has no jsdom (VERIFICATION.md human-verification
 * #2), so this is a source contract assertion: it reads the admin shell source
 * and pins three structural properties of the reworked handler:
 *
 *   1. The handler body contains `cmsFetch(` targeting the blacklist check path.
 *   2. The handler body no longer contains a bare `fetch(` call to that endpoint.
 *   3. The handler body contains a fail-closed branch guarded by `!result.ok`.
 *
 * Mirrors the readFileSync technique at cms-auth-inactive.test.ts:189-219 and
 * the ordering idiom at cms-rbac-affiliate-403.test.ts:224-232.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function extractHandlerBody(source: string): string {
  const startMarker = 'const handleCheckAffUrl';
  const startIdx = source.indexOf(startMarker);
  expect(startIdx, 'handleCheckAffUrl declaration not found in admin page source').toBeGreaterThan(-1);

  // Slice from the declaration to the next top-level `const ` at the same
  // indentation (the sibling handler that follows).
  const after = source.slice(startIdx);
  // Find the next `const ` at column 2 (same indentation level).
  const nextConstMatch = after.slice(1).match(/\n  const [A-Z]/);
  const endOffset = nextConstMatch ? nextConstMatch.index! + 1 : after.length;

  return after.slice(0, endOffset);
}

describe('CR-01 — handleCheckAffUrl source contract', () => {
  const adminPagePath = join(process.cwd(), 'src/app/admin/page.tsx');
  const source = readFileSync(adminPagePath, 'utf8');
  const handlerBody = extractHandlerBody(source);

  it('calls cmsFetch targeting the blacklist check endpoint', () => {
    expect(handlerBody).toContain('cmsFetch<');
    expect(handlerBody).toContain('/api/v1/cms/blacklist/check');
    expect(handlerBody).toContain('method: \'POST\'');
  });

  it('does not perform a bare fetch() against the check endpoint', () => {
    // The raw `fetch('/api/v1/cms/blacklist/check'` call must be gone.
    expect(
      handlerBody,
      'bare fetch() to blacklist/check must be replaced by cmsFetch'
    ).not.toContain("fetch('/api/v1/cms/blacklist/check'");
  });

  it('fails closed on !result.ok — a failed check never clears the warning', () => {
    expect(handlerBody).toContain('!result.ok');
    expect(handlerBody).toContain('Blacklist check unavailable. Retry before saving.');
  });

  it('passes the token from localStorage to cmsFetch', () => {
    expect(handlerBody).toContain("localStorage.getItem('token')");
    expect(handlerBody).toContain('token,');
  });
});
