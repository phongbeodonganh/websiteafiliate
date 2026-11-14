/**
 * Build a stable identity for an affiliate tracking URL without changing the
 * URL that is ultimately used for redirects.
 *
 * WHATWG URL canonicalizes protocol/host casing, default ports and the root
 * slash. Sorting query parameters also makes URLs with the same parameters in
 * a different order collide, while preserving path/query value casing and the
 * fragment because those can affect the landing experience.
 */
export function normalizeAffiliateUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    url.searchParams.sort();
    return url.toString();
  } catch {
    return null;
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
  );
}
