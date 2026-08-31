import { revalidateTag } from 'next/cache';

export const PUBLIC_ARTICLES_CACHE_TAG = 'public-articles';

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
