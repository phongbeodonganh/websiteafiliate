import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';
import { SEED_TAXONOMY, seedTaxonomy } from '@/lib/seed-taxonomy';

const EXPECTED_CATEGORY_SLUGS = ['tech', 'home-kitchen', 'garden', 'tools', 'outdoor', 'beauty'];
const EXPECTED_SUB_SLUGS = [
  'computers-accessories', 'mobile-charging', 'audio-smart-home',
  'kitchen-appliances', 'cleaning-storage', 'garden-tools', 'planters-growing',
  'power-tools', 'hand-tools', 'camping-travel', 'patio-grilling',
  'personal-care', 'skin-hair',
];

describe('seedTaxonomy — physical-product two-level taxonomy', () => {
  it('creates the storefront categories and sub-categories', async () => {
    const result = await seedTaxonomy();
    expect(result).toEqual({ createdCategories: 6, createdSubCategories: 13 });
    const categories = await CategoryModel.find();
    expect(categories).toHaveLength(6);
    expect(categories.map((c) => c.slug).sort()).toEqual([...EXPECTED_CATEGORY_SLUGS].sort());
    const subCategories = await SubCategoryModel.find();
    expect(subCategories).toHaveLength(13);
    expect(subCategories.map((s) => s.slug).sort()).toEqual([...EXPECTED_SUB_SLUGS].sort());
  });

  it('links the tech sub-categories to their parent', async () => {
    await seedTaxonomy();
    const parent = await CategoryModel.findOne({ slug: 'tech' });
    expect(parent).not.toBeNull();
    const children = await SubCategoryModel.find({ category_id: parent!._id });
    expect(children).toHaveLength(3);
    for (const child of children) expect(child.category_id.toString()).toBe(parent!._id.toString());
  });

  it('is idempotent', async () => {
    expect(await seedTaxonomy()).toEqual({ createdCategories: 6, createdSubCategories: 13 });
    expect(await seedTaxonomy()).toEqual({ createdCategories: 0, createdSubCategories: 0 });
    expect(await CategoryModel.countDocuments()).toBe(6);
    expect(await SubCategoryModel.countDocuments()).toBe(13);
  });

  it('keeps administrator-created categories and sub-categories', async () => {
    await connectToDatabase();
    const parent = await CategoryModel.create({ name: 'Admin Category', slug: 'admin-category' });
    const child = await SubCategoryModel.create({ category_id: parent._id, name: 'Admin Sub', slug: 'admin-sub' });
    expect(await seedTaxonomy()).toEqual({ createdCategories: 6, createdSubCategories: 13 });
    expect((await CategoryModel.findById(parent._id))?.name).toBe('Admin Category');
    expect((await SubCategoryModel.findById(child._id))?.name).toBe('Admin Sub');
    expect(await CategoryModel.countDocuments()).toBe(7);
    expect(await SubCategoryModel.countDocuments()).toBe(14);
  });

  it('exports the physical-product tree', () => {
    const tech = SEED_TAXONOMY.find((category) => category.slug === 'tech');
    expect(tech?.subCategories?.map((sub) => sub.slug)).toEqual(EXPECTED_SUB_SLUGS.slice(0, 3));
    expect(SEED_TAXONOMY.map((category) => category.slug)).toEqual(EXPECTED_CATEGORY_SLUGS);
  });
});
