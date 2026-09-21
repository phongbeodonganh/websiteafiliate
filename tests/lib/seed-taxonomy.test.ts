import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { SEED_TAXONOMY, seedTaxonomy } from '@/lib/seed-taxonomy';

// The exact V5.2 §1.2 tree, pinned here independently of the implementation so a
// drift in either side fails loudly (T-02-25).
const EXPECTED_CATEGORY_SLUGS = [
  'ai-use-cases',
  'ai-content-copywriting',
  'ai-video-image-generation',
  'ai-automation-agents',
  'ai-marketing-sales',
  'ai-audio-code',
];

const EXPECTED_USE_CASE_SUB_SLUGS = [
  'ai-for-creators-media',
  'ai-for-real-estate-sales',
  'ai-for-e-commerce-online-business',
  'ai-for-marketers-agencies',
  'ai-for-finance-legal-consulting',
];

describe('seedTaxonomy — V5.2 §1.2 two-level taxonomy (CMS-04, D-11)', () => {
  it('creates the six categories and five AI Use Cases sub-categories with the exact spec slugs', async () => {
    const result = await seedTaxonomy();

    expect(result.createdCategories).toBe(6);
    expect(result.createdSubCategories).toBe(5);

    const categories = await CategoryModel.find();
    expect(categories).toHaveLength(6);
    expect(categories.map((c) => c.slug).sort()).toEqual([...EXPECTED_CATEGORY_SLUGS].sort());

    const subCategories = await SubCategoryModel.find();
    expect(subCategories).toHaveLength(5);
    expect(subCategories.map((s) => s.slug).sort()).toEqual([...EXPECTED_USE_CASE_SUB_SLUGS].sort());
  });

  it('links every sub-category to the AI Use Cases parent', async () => {
    await seedTaxonomy();

    const parent = await CategoryModel.findOne({ slug: 'ai-use-cases' });
    expect(parent).not.toBeNull();

    const children = await SubCategoryModel.find({ category_id: parent!._id });
    expect(children).toHaveLength(5);
    for (const child of children) {
      expect(child.category_id.toString()).toBe(parent!._id.toString());
    }
  });

  it('is idempotent — a second run creates nothing and the total counts are unchanged', async () => {
    const first = await seedTaxonomy();
    expect(first).toEqual({ createdCategories: 6, createdSubCategories: 5 });

    const second = await seedTaxonomy();
    expect(second).toEqual({ createdCategories: 0, createdSubCategories: 0 });

    expect(await CategoryModel.countDocuments()).toBe(6);
    expect(await SubCategoryModel.countDocuments()).toBe(5);
  });

  it('coexists with ad-hoc categories and sub-categories — it never deletes or renames them', async () => {
    await connectToDatabase();

    const adHocCategory = await CategoryModel.create({
      name: 'Admin Ad-Hoc Category',
      slug: 'admin-ad-hoc-category',
      description: 'Created by an admin, not by the seed.',
    });
    const adHocSub = await SubCategoryModel.create({
      category_id: adHocCategory._id,
      name: 'Admin Ad-Hoc Sub',
      slug: 'admin-ad-hoc-sub',
      description: 'Created by an admin, not by the seed.',
    });

    const result = await seedTaxonomy();
    expect(result.createdCategories).toBe(6);
    expect(result.createdSubCategories).toBe(5);

    const survivor = await CategoryModel.findById(adHocCategory._id);
    expect(survivor).not.toBeNull();
    expect(survivor?.name).toBe('Admin Ad-Hoc Category');
    expect(survivor?.slug).toBe('admin-ad-hoc-category');
    expect(survivor?.description).toBe('Created by an admin, not by the seed.');

    const subSurvivor = await SubCategoryModel.findById(adHocSub._id);
    expect(subSurvivor).not.toBeNull();
    expect(subSurvivor?.name).toBe('Admin Ad-Hoc Sub');
    expect(subSurvivor?.slug).toBe('admin-ad-hoc-sub');
    expect(subSurvivor?.category_id.toString()).toBe(adHocCategory._id.toString());

    // The seed adds its six on top of the pre-existing one.
    expect(await CategoryModel.countDocuments()).toBe(7);
    expect(await SubCategoryModel.countDocuments()).toBe(6);
  });

  it('exports the seed tree with the AI Use Cases children declared (structural contract)', () => {
    const useCases = SEED_TAXONOMY.find((c) => c.slug === 'ai-use-cases');
    expect(useCases).toBeDefined();
    expect(useCases?.subCategories?.map((s) => s.slug)).toEqual(EXPECTED_USE_CASE_SUB_SLUGS);
    expect(SEED_TAXONOMY.map((c) => c.slug)).toEqual(EXPECTED_CATEGORY_SLUGS);
  });
});
