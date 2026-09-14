import { describe, expect, it } from 'vitest';
import { sanitizeArticleContent, isValidCssColor, sanitizeCssColor } from '@/lib/sanitize';

describe('sanitizeArticleContent (SEC-03 XSS defense)', () => {
  it('strips <script> tags entirely', () => {
    const result = sanitizeArticleContent('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips inline event handler attributes like onerror', () => {
    const result = sanitizeArticleContent('<img src="x" onerror="alert(1)" />');
    expect(result).not.toContain('onerror');
    expect(result).toContain('src="x"');
  });

  it('strips javascript: hrefs', () => {
    const result = sanitizeArticleContent('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('keeps safe formatting tags and attributes intact', () => {
    const input =
      '<p>Some <strong>bold</strong> text</p><h2>Heading</h2><ul><li>Item</li></ul>' +
      '<a href="https://example.com">link</a><img src="https://example.com/x.png" alt="x" />';
    const result = sanitizeArticleContent(input);
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<h2>Heading</h2>');
    expect(result).toContain('<li>Item</li>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('src="https://example.com/x.png"');
  });

  it('keeps the affiliate CTA link markup intact (class + tracking data-attributes)', () => {
    const input =
      '<a href="/api/v1/public/tracking/redirect?article_id=1&affiliate_link_id=2" ' +
      'data-affiliate-id="2" data-article-id="1" class="affiliate-btn" rel="nofollow sponsored" target="_blank">Claim</a>';
    const result = sanitizeArticleContent(input);
    expect(result).toContain('data-affiliate-id="2"');
    expect(result).toContain('data-article-id="1"');
    expect(result).toContain('class="affiliate-btn"');
  });

  it('returns empty string for empty/undefined input', () => {
    expect(sanitizeArticleContent('')).toBe('');
  });
});

describe('isValidCssColor — strict hex color-format gate (SEC-03 / CONCERNS #11)', () => {
  // The validator's contract: only allow strings that match a strict hex
  // color-format regex (# + 3, 4, 6, or 8 hex digits, case-insensitive).
  // Anything else — named colors, unparseable payloads, trailing context
  // that could break out of the <style> interpolation — is rejected.

  it('accepts 3-digit hex (e.g. #abc)', () => {
    expect(isValidCssColor('#abc')).toBe(true);
  });

  it('accepts 4-digit hex (e.g. #abcd)', () => {
    expect(isValidCssColor('#abcd')).toBe(true);
  });

  it('accepts 6-digit hex (e.g. #abcdef, case-insensitive)', () => {
    expect(isValidCssColor('#abcdef')).toBe(true);
    expect(isValidCssColor('#AbCdEf')).toBe(true);
    expect(isValidCssColor('#111111')).toBe(true);
  });

  it('accepts 8-digit hex (e.g. #abcdef12 — with alpha)', () => {
    expect(isValidCssColor('#abcdef12')).toBe(true);
  });

  it('rejects named colors (e.g. red)', () => {
    expect(isValidCssColor('red')).toBe(false);
  });

  it('rejects CSS-breaking payloads that would escape the interpolation', () => {
    expect(isValidCssColor('red; } body { display:none }')).toBe(false);
  });

  it('rejects url()/javascript: payloads', () => {
    expect(isValidCssColor('url(javascript:alert(1))')).toBe(false);
  });

  it('rejects trailing context escape attempts (e.g. #111111; })', () => {
    expect(isValidCssColor('#111111; }')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCssColor('')).toBe(false);
  });

  it('rejects non-string input (null, number, undefined, object)', () => {
    expect(isValidCssColor(null)).toBe(false);
    expect(isValidCssColor(undefined as unknown as string)).toBe(false);
    expect(isValidCssColor(123 as unknown as string)).toBe(false);
    expect(isValidCssColor({} as unknown as string)).toBe(false);
  });

  it('rejects hex without the leading hash (e.g. 111111)', () => {
    expect(isValidCssColor('111111')).toBe(false);
  });

  it('rejects # + wrong digit count (5, 7)', () => {
    expect(isValidCssColor('#abcde')).toBe(false);
    expect(isValidCssColor('#abcdefg')).toBe(false);
  });
});

describe('sanitizeCssColor — render-time fallback (SEC-03 / CONCERNS #11)', () => {
  it('returns the value when it is a valid hex color', () => {
    expect(sanitizeCssColor('#111111', '#000000')).toBe('#111111');
    expect(sanitizeCssColor('#abc', '#000000')).toBe('#abc');
  });

  it('returns the fallback when the value is invalid', () => {
    expect(sanitizeCssColor('red', '#000000')).toBe('#000000');
    expect(sanitizeCssColor('red; } body{x}', '#000000')).toBe('#000000');
    expect(sanitizeCssColor('url(javascript:alert(1))', '#000000')).toBe('#000000');
  });

  it('returns the fallback when the value is empty or non-string', () => {
    expect(sanitizeCssColor('', '#000000')).toBe('#000000');
    expect(sanitizeCssColor(null, '#000000')).toBe('#000000');
    expect(sanitizeCssColor(undefined, '#000000')).toBe('#000000');
  });

  it('passes the literal through unchanged when valid (no re-encoding)', () => {
    expect(sanitizeCssColor('#AbCdEf', '#000000')).toBe('#AbCdEf');
  });
});
