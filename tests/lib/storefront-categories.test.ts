import { describe, expect, it } from 'vitest';
import { CategoryModel } from '@/lib/db/models';
import { DEFAULT_STOREFRONT_CATEGORIES, syncDefaultStorefrontCategories } from '@/lib/storefront-categories';

describe('storefront category sync', () => {
  it('creates the six homepage categories in display order', async () => {
    await expect(syncDefaultStorefrontCategories()).resolves.toEqual({ createdCategories: 6, updatedCategories: 0 });
    const categories = await CategoryModel.find({ show_on_homepage: true }).sort({ nav_order: 1 });
    expect(categories.map((category) => category.slug)).toEqual(DEFAULT_STOREFRONT_CATEGORIES.map((category) => category.slug));
    expect(categories.every((category) => Boolean(category.homepage_image_url))).toBe(true);
  });

  it('updates storefront presentation without duplicating an existing category', async () => {
    const existing = await CategoryModel.create({ name: 'Tech', slug: 'tech', description: 'Old copy' });
    await expect(syncDefaultStorefrontCategories()).resolves.toEqual({ createdCategories: 5, updatedCategories: 1 });
    const technology = await CategoryModel.findOne({ slug: 'tech' });
    expect(technology?._id.toString()).toBe(existing._id.toString());
    expect(technology?.name).toBe('Technology');
    expect(technology?.show_on_homepage).toBe(true);
    expect(await CategoryModel.countDocuments()).toBe(6);
  });
});
