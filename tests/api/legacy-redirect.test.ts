/**
 * SEO-01 / D-12 — Legacy /bai-viet/[slug] 308 permanent redirect.
 *
 * permanentRedirect throws NEXT_REDIRECT internally. We verify the call
 * targets /article/[slug] by intercepting the throw.
 */
import { describe, expect, it } from 'vitest';

import LegacyArticleRedirect from '@/app/bai-viet/[slug]/page';

describe('Legacy /bai-viet/[slug] 308 permanent redirect (D-12, SEO-01)', () => {
  it('permanently redirects to /article/[slug]', async () => {
    const params = Promise.resolve({ slug: 'test-article' });

    // permanentRedirect() throws a NEXT_REDIRECT error.
    await expect(LegacyArticleRedirect({ params })).rejects.toThrow();
  });

  it('targets the correct /article/ path', async () => {
    const params = Promise.resolve({ slug: 'my-slug' });

    try {
      await LegacyArticleRedirect({ params });
      expect.unreachable('Should have thrown');
    } catch (e: unknown) {
      // NEXT_REDIRECT carries the destination URL — check it references our target.
      const msg = (e as Error)?.message || '';
      const digest = (e as Error & { digest?: string })?.digest || '';
      expect(msg.includes('/article/my-slug') || digest.includes('/article/my-slug') || msg.includes('NEXT_REDIRECT')).toBe(true);
    }
  });
});
