/**
 * Post-Processing Sanitization Link Checker
 * Scans generated HTML for <a href="..."> tags.
 * Ensures only authorized affiliate tracking base_urls or safe relative links are preserved.
 */

export function sanitizeGeneratedHtmlContent(htmlContent: string, allowedBaseUrls: string[]): string {
  if (!htmlContent) return '';

  const cleanAllowedUrls = allowedBaseUrls
    .map((url) => {
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
      } catch {
        return url.toLowerCase().replace(/^www\./, '');
      }
    })
    .filter(Boolean);

  // Regex to match <a ... href="..." ...>
  const hrefRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;

  // Gemini occasionally leaks raw Markdown link syntax `[text](url)` into an
  // href attribute instead of emitting a clean HTML anchor (seen in production
  // as e.g. href="/article/[https://aidealsuk.com](https://aidealsuk.com)/article/...",
  // which Google then crawls as a real broken URL). These characters never
  // belong in a legitimate href, so any href containing them is malformed
  // regardless of whether it looks relative.
  const hasMarkdownArtifacts = (value: string) => /[[\]()]/.test(value);

  return htmlContent.replace(hrefRegex, (match, prefix, href, suffix) => {
    if (hasMarkdownArtifacts(href)) {
      return `<a ${prefix}href="#" ${suffix}>`;
    }

    // Keep relative links or anchor links intact
    if (href.startsWith('#') || href.startsWith('/')) {
      return match;
    }

    try {
      const hrefUrl = new URL(href.startsWith('http') ? href : `https://${href}`);
      const hrefDomain = hrefUrl.hostname.replace(/^www\./, '');

      // Check if href domain is in allowed affiliate base_urls
      const isAllowed = cleanAllowedUrls.some((allowed) => hrefDomain.includes(allowed) || allowed.includes(hrefDomain));

      if (isAllowed) {
        return `<a ${prefix}href="${href}" target="_blank" rel="noopener noreferrer nofollow" ${suffix}>`;
      } else {
        // Replace unapproved external href with primary allowed URL if available, or strip link
        const primaryAllowedUrl = allowedBaseUrls[0] || '#';
        return `<a ${prefix}href="${primaryAllowedUrl}" target="_blank" rel="noopener noreferrer nofollow" ${suffix}>`;
      }
    } catch {
      return `<a ${prefix}href="#" ${suffix}>`;
    }
  });
}
