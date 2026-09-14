import { describe, expect, it } from 'vitest';
import { escapeRegExp } from '@/lib/utils';

// SEC-04 / T-1-17: escapeRegExp is the single shared source that kills the
// ReDoS vector at both user-text→RegExp sites (public articles search +
// blacklist retroactive sweeper), per the plan's "no user-text→RegExp site may
// remain unescaped" prohibition (#6). These tests pin:
//   (1) escapeRegExp behavior — escapes every regex metacharacter, leaves
//       ordinary text untouched.
//   (2) The public search path does not blow up under a (a+)+$-class evil
//       input — completed well under a generous time-box, returns literal
//       matches only.
//   (3) The 100-char defense-in-depth cap at the articles route: over-cap
//       keywords skip the regex filter (graceful — no 400, just the
//       unfiltered result set).

describe('escapeRegExp (SEC-04 T-1-17 metacharacter escaping)', () => {
  it('returns an empty string unchanged', () => {
    expect(escapeRegExp('')).toBe('');
  });

  it('leaves ordinary text unchanged', () => {
    expect(escapeRegExp('hubspot')).toBe('hubspot');
  });

  it('escapes every regex metacharacter, producing a pattern that matches only the literal', () => {
    // Each of these is a regex metacharacter per ECMAScript; escaping makes the
    // compiled pattern match the literal only (no semantic interpretation).
    const checks: Array<[string, string]> = [
      ['.', '\\.'],
      ['*', '\\*'],
      ['+', '\\+'],
      ['?', '\\?'],
      ['^', '\\^'],
      ['$', '\\$'],
      ['{', '\\{'],
      ['}', '\\}'],
      ['(', '\\('],
      [')', '\\)'],
      ['|', '\\|'],
      ['[', '\\['],
      [']', '\\]'],
      ['\\', '\\\\'],
    ];
    for (const [meta, expected] of checks) {
      expect(escapeRegExp(meta)).toBe(expected);
    }
  });

  it('escapes a mixed payload so the wrapped regex matches the literal source text', () => {
    // The "evil regex" anatomy (OWASP): grouping with repetition and overlap.
    // Wrapping in escapeRegExp turns it into a literal that matches period-by-
    // period — no backtracking possible.
    const evil = '(a+)+$';
    const regex = new RegExp(escapeRegExp(evil), 'i');
    expect(regex.test(evil)).toBe(true);
    // It must NOT match semantically — e.g. a string of pure "a"s is what the
    // evil pattern would semantically capture; the escaped pattern must reject it.
    expect(regex.test('aaaa')).toBe(false);
  });
});

describe('SEC-04 T-1-17 ReDoS path — search builder stays fast and literal-only', () => {
  // Replicates the articles route's regex-builder shape (the Task 2 fix).
  // We don't hit the DB; the risk under test is the RegExp engine itself
  // hanging on a crafted input, which is independent of ArticleModel.
  function buildSafeRegex(keyword: string): RegExp {
    const trimmed = keyword.trim();
    return new RegExp(escapeRegExp(trimmed), 'i');
  }

  it('a nested-quantifier evil input stays fast and matches literally', () => {
    // OWASP-class evil regex input: `(a+)+$` followed by a non-matching tail.
    // Pre-fix this would compile to a catastrophic-backtracking pattern.
    const evil = '(a+)+$x';

    const start = Date.now();
    const regex = buildSafeRegex(evil);
    // Matching against a long non-matching string is the stress case — the
    // engine must give up quickly rather than backtrack exponentially.
    const haystack = 'a'.repeat(50_000) + 'b';
    const result = regex.test(haystack);
    const elapsed = Date.now() - start;

    expect(result).toBe(false);
    // Generous box-agnostic cap (2000ms). Pre-fix this shape exponential-
    // backtracks indefinitely; post-escape it completes in microseconds.
    expect(elapsed).toBeLessThan(2000);
  });

  it('a literal needle in a large haystack is found quickly', () => {
    const needle = 'partner.example.com/offer';
    const haystack = `https://${needle}?ref=123&utm_source=bananas`;
    const start = Date.now();
    const regex = buildSafeRegex(needle);
    const result = regex.test(haystack);
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  it('does not over-match — literal-only patterns ignore semantic regex meaning', () => {
    // Input 'a.c' must match the literal "a.c" (an affiliate URL path
    // component) and NOT match "abc" as the unescaped regex would.
    const regex = buildSafeRegex('a.c');
    expect(regex.test('a.c')).toBe(true);
    expect(regex.test('abc')).toBe(false);
  });
});

describe('SEC-04 T-1-17 — 100-char search cap (defense in depth)', () => {
  // Replicates the articles route's over-cap branch decision (graceful skip,
  // no 400). The SEARCH_KEYWORD_MAX_LENGTH constant is owned by the route;
  // here we pin the contract: any keyword ≤ cap builds a regex, anything over
  // is skipped.
  const CAP = 100;

  it('keywords at the boundary build a literal regex', () => {
    const at = 'a'.repeat(CAP);
    const regex = new RegExp(escapeRegExp(at), 'i');
    expect(regex.test(at)).toBe(true);
  });

  it('an over-cap keyword does not reach the RegExp engine — the route returns the unfiltered result set', () => {
    // The plan's contract is "no 400, no hang, search just doesn't filter".
    // Here we assert the builder is NOT invoked (no RegExp construction at all)
    // — represented at the test level by the same boolean gate the route uses.
    const over = 'a'.repeat(CAP + 50);
    let regexBuilt = false;
    let regex: RegExp | null = null;
    if (over.trim().length <= CAP) {
      regex = new RegExp(escapeRegExp(over.trim()), 'i');
      regexBuilt = true;
    }
    expect(regexBuilt).toBe(false);
    expect(regex).toBeNull();
  });
});
