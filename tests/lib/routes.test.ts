import { describe, expect, it } from 'vitest';
import { articlePath, categoryPath, subCategoryPath } from '@/lib/routes';

describe('public route helpers', () => {
  it('builds hierarchical category, subcategory, and article paths', () => {
    expect(categoryPath('ai-tools')).toBe('/ai-tools');
    expect(subCategoryPath('ai-tools', 'video')).toBe('/ai-tools/video');
    expect(articlePath({
      categorySlug: 'ai-tools',
      subCategorySlug: 'video',
      slug: 'best-generators',
    })).toBe('/ai-tools/video/best-generators');
  });

  it('omits the subcategory segment when an article has no subcategory', () => {
    expect(articlePath({ categorySlug: 'ai-tools', slug: 'legacy-post' })).toBe('/ai-tools/legacy-post');
    expect(articlePath({ slug: 'legacy-post' })).toBe('/uncategorized/legacy-post');
  });

  it('encodes unsafe path segment characters', () => {
    expect(articlePath({
      categorySlug: 'AI tools',
      subCategorySlug: 'video & audio',
      slug: 'what is new?',
    })).toBe('/AI%20tools/video%20%26%20audio/what%20is%20new%3F');
  });
});
