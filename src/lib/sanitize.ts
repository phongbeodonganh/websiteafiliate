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
