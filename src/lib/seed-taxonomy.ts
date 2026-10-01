import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel, SubCategoryModel } from '@/lib/db/models';

// V5.2 §1.2 — the exact two-level AI-niche taxonomy the CMS seeds on day one.
// Six top-level categories; `AI Use Cases` carries the five Use-Case children.
// The tree is data, not logic — the seed below is the only writer.
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

export const SEED_TAXONOMY: SeedCategory[] = [
  {
    name: 'AI Use Cases',
    slug: 'ai-use-cases',
    description:
      'Case Study bài viết ứng dụng AI thực tế theo ngành và chức năng.',
    subCategories: [
      { name: 'AI for Creators & Media', slug: 'ai-for-creators-media' },
      { name: 'AI for Real Estate & Sales', slug: 'ai-for-real-estate-sales' },
      { name: 'AI for E-commerce & Business', slug: 'ai-for-e-commerce-online-business' },
      { name: 'AI for Marketers & Agencies', slug: 'ai-for-marketers-agencies' },
      { name: 'AI for Finance & Legal', slug: 'ai-for-finance-legal-consulting' },
    ],
  },
  { name: 'AI Content & Copywriting', slug: 'ai-content-copywriting' },
  { name: 'AI Video & Image Generation', slug: 'ai-video-image-generation' },
  { name: 'AI Automation & Agents', slug: 'ai-automation-agents' },
  { name: 'AI Marketing & Sales', slug: 'ai-marketing-sales' },
  { name: 'AI Audio & Code', slug: 'ai-audio-code' },
];

export interface SeedTaxonomyResult {
  createdCategories: number;
  createdSubCategories: number;
}

// Idempotent by construction: find-by-slug then create only when absent. It
// never updates an existing document and never calls deleteMany, so ad-hoc
// categories and sub-categories an admin created are left untouched
// (D-11, T-02-22). No top-level side effects — importing this module does not
// connect, so a Vitest import stays inert until the function is called.
export async function seedTaxonomy(): Promise<SeedTaxonomyResult> {
  await connectToDatabase();

  let createdCategories = 0;
  let createdSubCategories = 0;

  for (const entry of SEED_TAXONOMY) {
    let parent = await CategoryModel.findOne({ slug: entry.slug });
    if (!parent) {
      parent = await CategoryModel.create({
        name: entry.name,
        slug: entry.slug,
        description: entry.description,
      });
      createdCategories += 1;
    }

    for (const child of entry.subCategories ?? []) {
      const existingChild = await SubCategoryModel.findOne({ slug: child.slug });
      if (existingChild) continue;
      await SubCategoryModel.create({
        category_id: parent._id,
        name: child.name,
        slug: child.slug,
      });
      createdSubCategories += 1;
    }
  }

  return { createdCategories, createdSubCategories };
}
