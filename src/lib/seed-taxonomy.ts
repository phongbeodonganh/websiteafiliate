import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';

export interface SeedSubCategory {
  name: string;
  slug: string;
}

export interface SeedCategory {
  name: string;
  slug: string;
  description?: string;
  subCategories?: SeedSubCategory[];
}

// The physical-product storefront taxonomy. The seed is intentionally
// additive: existing administrator-created categories are never removed.
export const SEED_TAXONOMY: SeedCategory[] = [
  {
    name: 'Tech',
    slug: 'tech',
    description: 'Computers, mobile accessories, audio, charging, and smart-home gear.',
    subCategories: [
      { name: 'Computers & Accessories', slug: 'computers-accessories' },
      { name: 'Mobile & Charging', slug: 'mobile-charging' },
      { name: 'Audio & Smart Home', slug: 'audio-smart-home' },
    ],
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    subCategories: [
      { name: 'Kitchen Appliances', slug: 'kitchen-appliances' },
      { name: 'Cleaning & Storage', slug: 'cleaning-storage' },
    ],
  },
  {
    name: 'Garden',
    slug: 'garden',
    subCategories: [
      { name: 'Garden Tools', slug: 'garden-tools' },
      { name: 'Planters & Growing', slug: 'planters-growing' },
    ],
  },
  {
    name: 'Tools',
    slug: 'tools',
    subCategories: [
      { name: 'Power Tools', slug: 'power-tools' },
      { name: 'Hand Tools', slug: 'hand-tools' },
    ],
  },
  {
    name: 'Outdoor',
    slug: 'outdoor',
    subCategories: [
      { name: 'Camping & Travel', slug: 'camping-travel' },
      { name: 'Patio & Grilling', slug: 'patio-grilling' },
    ],
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    subCategories: [
      { name: 'Personal Care', slug: 'personal-care' },
      { name: 'Skin & Hair', slug: 'skin-hair' },
    ],
  },
];

export interface SeedTaxonomyResult {
  createdCategories: number;
  createdSubCategories: number;
}

export async function seedTaxonomy(): Promise<SeedTaxonomyResult> {
  await connectToDatabase();
  let createdCategories = 0;
  let createdSubCategories = 0;

  for (const entry of SEED_TAXONOMY) {
    let parent = await CategoryModel.findOne({ slug: entry.slug });
    if (!parent) {
      parent = await CategoryModel.create({ name: entry.name, slug: entry.slug, description: entry.description });
      createdCategories += 1;
    }
    for (const child of entry.subCategories ?? []) {
      if (await SubCategoryModel.findOne({ slug: child.slug })) continue;
      await SubCategoryModel.create({ category_id: parent._id, name: child.name, slug: child.slug });
      createdSubCategories += 1;
    }
  }
  return { createdCategories, createdSubCategories };
}
