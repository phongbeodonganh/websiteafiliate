import { revalidateTag } from 'next/cache';

export const PUBLIC_ARTICLES_CACHE_TAG = 'public-articles';
export const SITEMAP_CACHE_TAG = 'sitemap';

function isDirectVitestRouteCall(error: unknown) {
  return (
    process.env.NODE_ENV === 'test' &&
    error instanceof Error &&
    error.message.includes('static generation store missing')
  );
}

export function revalidatePublicArticles() {
  try {
    revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) {
      return;
    }

    throw error;
  }
}

/**
 * Bust the per-slug article cache (D-04). Called by CMS write paths after an
 * article is created/updated/deleted. Uses the same revalidateTag(tag, "max")
 * + vitest-guard pattern as revalidatePublicArticles.
 */
export function revalidateArticle(slug: string) {
  try {
    revalidateTag(`article-${slug}`, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) {
      return;
    }

    throw error;
  }
}

/**
 * Bust the sitemap cache (D-09). Called after any content change that affects
 * the sitemap.xml (articles, categories, settings).
 */
export function revalidateSitemap() {
  try {
    revalidateTag(SITEMAP_CACHE_TAG, 'max');
  } catch (error) {
    if (isDirectVitestRouteCall(error)) {
      return;
    }

    throw error;
  }
}
