import { describe, expect, it } from 'vitest';
import { sanitizeArticleContent } from '@/lib/sanitize';

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
