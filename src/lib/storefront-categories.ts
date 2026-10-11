import { cache } from 'react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { CategoryModel } from '@/lib/db/models';

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  order: number;
}

export const DEFAULT_STOREFRONT_CATEGORIES = [
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Cook, clean and live well', imageUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=720&q=82', order: 0 },
  { name: 'Fashion', slug: 'fashion', description: 'Wearable everyday essentials', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=720&q=82', order: 1 },
  { name: 'Technology', slug: 'tech', description: 'Devices that solve a real job', imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=720&q=82', order: 2 },
  { name: 'Mobility', slug: 'mobility', description: 'Commute, drive and travel', imageUrl: 'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?auto=format&fit=crop&w=720&q=82', order: 3 },
  { name: 'Family & Wellness', slug: 'wellness', description: 'Care for people and routines', imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=720&q=82', order: 4 },
  { name: 'Outdoors', slug: 'outdoor', description: 'Gear for time outside', imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=720&q=82', order: 5 },
] as const;

export const getStorefrontCategories = cache(async (): Promise<StorefrontCategory[]> => {
  try {
    await connectToDatabase();
    const categories = await CategoryModel.find({ show_on_homepage: true })
      .sort({ nav_order: 1, created_at: 1 })
      .select('name slug description homepage_image_url nav_order')
      .lean();
    return categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.homepage_image_url || '',
      order: category.nav_order || 0,
    }));
  } catch (error) {
    console.error('Unable to load storefront categories:', error);
    return [];
  }
});

export async function syncDefaultStorefrontCategories() {
  await connectToDatabase();
  let createdCategories = 0;
  let updatedCategories = 0;

  for (const category of DEFAULT_STOREFRONT_CATEGORIES) {
    const existing = await CategoryModel.findOne({ slug: category.slug });
    const presentation = {
      name: category.name,
      description: category.description,
      homepage_image_url: category.imageUrl,
      show_on_homepage: true,
      nav_order: category.order,
    };
    if (existing) {
      await CategoryModel.updateOne({ _id: existing._id }, { $set: presentation });
      updatedCategories += 1;
    } else {
      await CategoryModel.create({ slug: category.slug, ...presentation });
      createdCategories += 1;
    }
  }

  return { createdCategories, updatedCategories };
}
