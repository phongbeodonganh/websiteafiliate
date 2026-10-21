import { sanitizeArticleContent } from "./sanitize";

// Resolve redirects from saved content, never from a visitor-supplied URL.
export function prepareAffiliateContent(content: string, redirectBase?: string) {
  const links: string[] = [];
  const html = sanitizeArticleContent(sanitizeArticleContent(content), (attributes) => {
    if (!attributes.rel?.split(/\s+/).includes("sponsored")) return attributes;
    try {
      const url = new URL(attributes.href);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return attributes;
      const index = links.push(url.href) - 1;
      return { ...attributes, href: redirectBase ? `${redirectBase}&link=${index}` : url.href, target: "_blank", rel: "nofollow sponsored noopener noreferrer" };
    } catch { return attributes; }
  });
  return { html, links };
}
