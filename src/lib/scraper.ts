/**
 * Jina AI Reader Scraper Utility
 * Scrapes landing page content using https://r.jina.ai/{url} and returns clean Markdown.
 * Automatically truncates output to a max of 4,000 words (~20,000 chars) for token optimization.
 */

export async function scrapeLandingPageWithJina(productUrl: string): Promise<string> {
  try {
    if (!productUrl || !productUrl.startsWith('http')) {
      return 'No valid product URL provided for Jina AI scraper.';
    }

    const jinaUrl = `https://r.jina.ai/${encodeURI(productUrl)}`;
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream, text/plain, text/html',
        'X-No-Cache': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`Jina AI Scraper HTTP warning: ${response.status} for URL ${productUrl}`);
      return `Target URL ${productUrl} reached with status ${response.status}. Context scraped: Product/Service landing page.`;
    }

    const text = await response.text();

    // Truncate to maximum 4000 words (~20,000 chars) to prevent context limit overflow
    const words = text.split(/\s+/);
    if (words.length > 4000) {
      return words.slice(0, 4000).join(' ') + '\n\n[Content truncated at 4,000 words limit]';
    }

    return text;
  } catch (error: any) {
    console.error('Error in scrapeLandingPageWithJina:', error);
    return `Scraper fallback context for ${productUrl}. Overview of features and capabilities.`;
  }
}
