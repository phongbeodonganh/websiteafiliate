import "server-only";

import { connectToDatabase } from "@/lib/db/mongodb";
import { ArticleModel, CategoryModel, SettingModel, SubCategoryModel } from "@/lib/db/models";
import { readThroughRamCache, refreshRamCache, setRamCache } from "@/lib/ram-cache";

const SETTINGS_KEY = "public:settings";
const TAXONOMY_KEY = "public:taxonomy";

export type PublicSettings = {
  id: string;
  siteTitle?: string;
  metaDescription?: string;
  focusKeywords?: string;
  canonicalUrl?: string;
  hreflang?: string;
  geoTarget?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  ogImageUrl?: string;
  schemaJsonld?: string;
  headScripts?: string;
  googleAnalyticsId?: string;
  googleSiteVerification?: string;
  primaryColor?: string;
  accentColor?: string;
  themeMode?: string;
  fontFamily?: string;
  logoUrl?: string;
  faviconUrl?: string;
  bannerText?: string;
  footerText?: string;
  customCss?: string;
  geoLatitude?: number;
  geoLongitude?: number;
  geoRegionName?: string;
  geoPlacename?: string;
  updatedAt?: Date;
};

export type PublicSubCategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: Date;
  articleCount: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  homepageImageUrl?: string;
  showOnHomepage?: boolean;
  navOrder?: number;
  createdAt?: Date;
  articleCount: number;
  subCategories: PublicSubCategory[];
};

export function serializePublicSettings(input: unknown): PublicSettings {
  const doc = input as Record<string, unknown>;
  const text = (key: string) => typeof doc[key] === "string" ? doc[key] as string : undefined;
  const number = (key: string) => typeof doc[key] === "number" ? doc[key] as number : undefined;
  return {
    id: String(doc._id),
    siteTitle: text("site_title"),
    metaDescription: text("metaDescription"),
    focusKeywords: text("focusKeywords"),
    canonicalUrl: text("canonicalUrl"),
    hreflang: text("hreflang"),
    geoTarget: text("geoTarget"),
    businessName: text("businessName"),
    businessAddress: text("businessAddress"),
    businessPhone: text("businessPhone"),
    ogImageUrl: text("ogImageUrl"),
    schemaJsonld: text("schemaJsonld"),
    headScripts: text("headScripts"),
    googleAnalyticsId: text("googleAnalyticsId"),
    googleSiteVerification: text("googleSiteVerification"),
    primaryColor: text("primary_color"),
    accentColor: text("accent_color"),
    themeMode: text("theme_mode"),
    fontFamily: text("font_family"),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    bannerText: text("banner_text"),
    footerText: text("footer_text"),
    customCss: text("custom_css"),
    geoLatitude: number("geo_latitude"),
    geoLongitude: number("geo_longitude"),
    geoRegionName: text("geo_region_name"),
    geoPlacename: text("geo_placename"),
    updatedAt: doc.updated_at instanceof Date ? doc.updated_at : undefined,
  };
}
async function loadPublicSettings(): Promise<PublicSettings | null> {
  await connectToDatabase();
  const settings = await SettingModel.findOne().lean();
  return settings ? serializePublicSettings(settings as unknown as Record<string, unknown>) : null;
}

export function getPublicSettings() {
  return readThroughRamCache(SETTINGS_KEY, loadPublicSettings);
}

export function setPublicSettingsFromDocument(doc: unknown) {
  return setRamCache(SETTINGS_KEY, serializePublicSettings(doc));
}

export function refreshPublicSettingsCache() {
  return refreshRamCache(SETTINGS_KEY, loadPublicSettings);
}

async function loadPublicTaxonomy(): Promise<PublicCategory[]> {
  await connectToDatabase();
  const [categories, subCategories, articles] = await Promise.all([
    CategoryModel.find().sort({ show_on_homepage: -1, nav_order: 1, created_at: 1 }).lean(),
    SubCategoryModel.find().lean(),
    ArticleModel.find({ status: "published" }).select("category_id sub_category_id").lean(),
  ]);

  const categoryCounts = new Map<string, number>();
  const subCategoryCounts = new Map<string, number>();
  for (const article of articles) {
    if (article.category_id) {
      const id = article.category_id.toString();
      categoryCounts.set(id, (categoryCounts.get(id) ?? 0) + 1);
    }
    if (article.sub_category_id) {
      const id = article.sub_category_id.toString();
      subCategoryCounts.set(id, (subCategoryCounts.get(id) ?? 0) + 1);
    }
  }

  return categories.map((category) => {
    const categoryId = category._id.toString();
    return {
      id: categoryId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      metaTitle: category.meta_title,
      metaDescription: category.meta_description,
      homepageImageUrl: category.homepage_image_url,
      showOnHomepage: category.show_on_homepage,
      navOrder: category.nav_order,
      createdAt: category.created_at,
      articleCount: categoryCounts.get(categoryId) ?? 0,
      subCategories: subCategories
        .filter((subCategory) => subCategory.category_id.toString() === categoryId)
        .map((subCategory) => {
          const subCategoryId = subCategory._id.toString();
          return {
            id: subCategoryId,
            categoryId,
            name: subCategory.name,
            slug: subCategory.slug,
            description: subCategory.description,
            metaTitle: subCategory.meta_title,
            metaDescription: subCategory.meta_description,
            createdAt: subCategory.created_at,
            articleCount: subCategoryCounts.get(subCategoryId) ?? 0,
          };
        }),
    };
  });
}

export function getPublicTaxonomy() {
  return readThroughRamCache(TAXONOMY_KEY, loadPublicTaxonomy);
}

export function refreshPublicTaxonomyCache() {
  return refreshRamCache(TAXONOMY_KEY, loadPublicTaxonomy);
}
