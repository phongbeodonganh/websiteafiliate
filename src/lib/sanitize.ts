import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'div', 'span',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel', 'class', 'data-affiliate-id', 'data-article-id'],
  img: ['src', 'alt', 'width', 'height', 'class'],
  div: ['class'],
  span: ['class'],
  p: ['class'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  '*': [],
};

// Content is authored as HTML by CMS users (including lower-trust editor/author roles)
// and rendered with dangerouslySetInnerHTML on the public site, so it must never contain
// executable script or event-handler attributes.
export function sanitizeArticleContent(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
  });
}

// ---- SEC-03 / CONCERNS #11 — admin color injection point defense (plan 06 Task 4) ----
//
// The stored primary_color/accent_color values are interpolated raw into the
// sitewide <style> tag at src/app/layout.tsx (:134-144). A dirty value (named
// color, url(), trailing `;}` context escape) reaches every visitor's DOM via
// that interpolation. The fix uses a strict HEX-ONLY color-format regex at BOTH
// boundaries:
//   - WRITE (PUT /api/v1/cms/settings): reject malformed values with 400
//   - RENDER (layout.tsx): fall back to the site default for dirty stored
//     values that may have been written before this phase
// Hex-only by design: the stored values are hex literals and the strict format
// is what renders the CSS interpolation inert. rgb()/url()/named-color parsing
// surface is intentionally NOT provided (CONCERNS #11 — no parsing surface to
// defend). The regex accepts the standard CSS hex color lengths:

// 3-digit (#rgb), 4-digit (#rgba), 6-digit (#rrggbb), 8-digit (#rrggbbaa).
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Returns true only for a strict hex color-format string (# + 3, 4, 6, or 8
 * hex digits, case-insensitive). Non-strings, empty input, named colors, and
 * any payload with trailing/leading context (e.g. `#111111; }`) return false.
 * Used at the PUT write boundary (reject malformed) AND at the render
 * boundary (decide whether to fall back to the site default).
 */
export function isValidCssColor(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return HEX_COLOR_RE.test(value);
}

/**
 * Render-time fallback. Returns `value` when it passes isValidCssColor,
 * otherwise `fallback`. Used by src/app/layout.tsx so a dirty stored color
 * can never reach the <style> interpolation even if it was written before
 * this validator existed.
 */
export function sanitizeCssColor(value: unknown, fallback: string): string {
  return isValidCssColor(value) ? (value as string) : fallback;
}
