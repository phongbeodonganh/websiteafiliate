import "server-only";

import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ProductModel, type IProduct } from "@/lib/db/product-models";
import { escapeRegExp } from "@/lib/utils";
import type { Marketplace } from "@/lib/marketplaces";

export type StorefrontOffer = {
  id: string;
  marketplace: Marketplace;
  storeName: string;
  official: boolean;
  price: number;
  originalPrice?: number;
  couponCode?: string;
  couponNote?: string;
  freeShipping: boolean;
  stockStatus: string;
  lastCheckedAt?: string;
  directUrl?: string;
};

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand?: string;
  category?: string;
  categorySlug?: string;
  shortDescription: string;
  description: string;
  images: { url: string; alt: string }[];
  highlights: string[];
  pros: string[];
  cons: string[];
  specs: { group: string; items: { label: string; value: string; highlight?: boolean }[] }[];
  offers: StorefrontOffer[];
  price: number;
  originalPrice?: number;
  discountPercent: number;
  rating: number;
  ratingCount: number;
  editorScore?: number;
  featured: boolean;
  deal: boolean;
  material?: string;
  originCountry?: string;
  warrantyMonths?: number;
  trust: { authentic: boolean; freeShipping: boolean; returnDays?: number; warrantyText?: string };
  faq: { question: string; answer: string }[];
  updatedAt: string;
  demo?: boolean;
};

const DEMO_PRODUCTS: StorefrontProduct[] = [
  {
    id: "demo-desk-lamp",
    slug: "luma-pro-monitor-light",
    name: "Luma Pro Monitor Light",
    sku: "DEMO-LUMA-01",
    brand: "Luma",
    category: "Tech",
    categorySlug: "tech",
    shortDescription: "An asymmetrical desk light with touch controls and adjustable color temperature.",
    description: "A compact monitor light designed to brighten your desk without reflecting on the screen. The weighted dial makes brightness and color temperature easy to adjust during long work sessions.",
    images: [{ url: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=85", alt: "Minimal monitor and desk setup" }],
    highlights: ["No-screen-glare light bar", "Warm-to-cool color control", "USB-C powered"],
    pros: ["Frees up desk space", "Easy physical controls", "Comfortable for late-night work"],
    cons: ["Not suitable for curved monitors", "Power adapter is not included"],
    specs: [{ group: "Key details", items: [{ label: "Width", value: "45 cm" }, { label: "Power", value: "USB-C, 5W" }, { label: "Color temperature", value: "2700–6500K", highlight: true }] }],
    offers: [{ id: "demo-offer-luma", marketplace: "amazon", storeName: "Amazon", official: false, price: 39.99, originalPrice: 59.99, couponCode: "SAVE10", freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.com/s?k=monitor+light+bar" }],
    price: 39.99,
    originalPrice: 59.99,
    discountPercent: 33,
    rating: 4.7,
    ratingCount: 1248,
    editorScore: 9.1,
    featured: true,
    deal: true,
    material: "Aluminum",
    warrantyMonths: 12,
    trust: { authentic: true, freeShipping: true, returnDays: 30, warrantyText: "1-year limited warranty" },
    faq: [{ question: "Will it create glare on my monitor?", answer: "The angled light path is designed to illuminate the desk while keeping direct light away from the display." }],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-air-fryer",
    slug: "crispwell-air-fryer-6qt",
    name: "Crispwell 6QT Air Fryer",
    sku: "DEMO-CRISP-06",
    brand: "Crispwell",
    category: "Home & Kitchen",
    categorySlug: "home-kitchen",
    shortDescription: "A roomy, easy-clean air fryer for weeknight meals and batch cooking.",
    description: "A practical six-quart air fryer with straightforward controls, a dishwasher-safe basket, and enough space for family meals.",
    images: [{ url: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=1200&q=85", alt: "Modern kitchen appliance on a counter" }],
    highlights: ["6-quart basket", "Dishwasher-safe tray", "Eight cooking presets"],
    pros: ["Simple controls", "Good family capacity", "Fast preheat"],
    cons: ["Takes up counter space"],
    specs: [{ group: "Appliance", items: [{ label: "Capacity", value: "6 qt", highlight: true }, { label: "Power", value: "1700W" }] }],
    offers: [{ id: "demo-offer-crisp", marketplace: "walmart", storeName: "Walmart", official: false, price: 74, originalPrice: 99, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.walmart.com/search?q=6qt+air+fryer" }],
    price: 74,
    originalPrice: 99,
    discountPercent: 25,
    rating: 4.5,
    ratingCount: 836,
    editorScore: 8.7,
    featured: true,
    deal: true,
    trust: { authentic: true, freeShipping: true, returnDays: 30 },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-pruner",
    slug: "fieldcraft-bypass-pruner",
    name: "Fieldcraft Bypass Pruner",
    sku: "DEMO-GARDEN-12",
    brand: "Fieldcraft",
    category: "Garden",
    categorySlug: "garden",
    shortDescription: "A forged-steel pruner with a comfortable grip for everyday garden care.",
    description: "A dependable hand pruner for flowers, herbs, and young branches. Replaceable blades and a simple safety lock make it a long-term garden tool.",
    images: [{ url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=85", alt: "Green garden plants and hand tools" }],
    highlights: ["Forged steel blade", "Replaceable spring", "Comfort grip"],
    pros: ["Clean cuts", "Good hand feel", "Serviceable parts"],
    cons: ["Too small for thick branches"],
    specs: [{ group: "Tool", items: [{ label: "Cut capacity", value: "20 mm", highlight: true }, { label: "Weight", value: "240 g" }] }],
    offers: [{ id: "demo-offer-pruner", marketplace: "official", storeName: "Fieldcraft", official: true, price: 28.5, originalPrice: 35, freeShipping: false, stockStatus: "in_stock", directUrl: "https://www.amazon.com/s?k=garden+bypass+pruner" }],
    price: 28.5,
    originalPrice: 35,
    discountPercent: 19,
    rating: 4.8,
    ratingCount: 421,
    editorScore: 9,
    featured: false,
    deal: true,
    material: "Forged steel",
    trust: { authentic: true, freeShipping: false, returnDays: 30 },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-powerbank",
    slug: "voltgo-20k-power-bank",
    name: "VoltGo 20K Power Bank",
    sku: "DEMO-VOLT-20",
    brand: "VoltGo",
    category: "Tech",
    categorySlug: "tech",
    shortDescription: "A travel-ready 65W battery that can charge a phone and laptop together.",
    description: "A high-capacity USB-C power bank for commuters and travelers who want one charger for their everyday devices.",
    images: [{ url: "https://images.unsplash.com/photo-1609592806596-b43bada2f2f0?auto=format&fit=crop&w=1200&q=85", alt: "Portable charger and phone on a desk" }],
    highlights: ["65W USB-C output", "20,000mAh capacity", "Battery display"],
    pros: ["Laptop-capable output", "Useful percentage display"],
    cons: ["Heavier than phone-only batteries"],
    specs: [{ group: "Power", items: [{ label: "Capacity", value: "20,000mAh", highlight: true }, { label: "Max output", value: "65W" }] }],
    offers: [{ id: "demo-offer-volt", marketplace: "bestbuy", storeName: "Best Buy", official: false, price: 49.99, originalPrice: 69.99, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.bestbuy.com/site/searchpage.jsp?st=20000mah+power+bank" }],
    price: 49.99,
    originalPrice: 69.99,
    discountPercent: 29,
    rating: 4.6,
    ratingCount: 967,
    editorScore: 8.9,
    featured: false,
    deal: true,
    trust: { authentic: true, freeShipping: true, returnDays: 15 },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
];

function populated(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === "string" ? result : undefined;
}

type ProductWithPopulated = Omit<IProduct, "brand_id" | "category_id"> & {
  _id: { toString(): string };
  brand_id?: { name?: string; slug?: string };
  category_id?: { name?: string; slug?: string };
};

function serializeProduct(input: unknown): StorefrontProduct {
  const doc = input as ProductWithPopulated;
  const offers = (doc.offers || [])
    .filter((offer) => offer.status === "active")
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((offer) => ({
      id: offer._id.toString(),
      marketplace: offer.marketplace,
      storeName: offer.store_name || "Retailer",
      official: Boolean(offer.is_official_store),
      price: Number(offer.price || 0),
      originalPrice: offer.original_price ? Number(offer.original_price) : undefined,
      couponCode: offer.coupon_code || undefined,
      couponNote: offer.coupon_note || undefined,
      freeShipping: Boolean(offer.free_shipping),
      stockStatus: offer.stock_status,
      lastCheckedAt: offer.last_checked_at ? new Date(offer.last_checked_at).toISOString() : undefined,
    }));

  const fallbackPrice = Number(doc.price_min || doc.price || offers[0]?.price || 0);
  const fallbackOriginal = Number(doc.original_price || offers[0]?.originalPrice || 0) || undefined;
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    sku: doc.sku,
    brand: populated(doc.brand_id, "name"),
    category: populated(doc.category_id, "name"),
    categorySlug: populated(doc.category_id, "slug"),
    shortDescription: doc.short_description || "",
    description: doc.description || "",
    images: (doc.images || []).map((image) => ({ url: image.url, alt: image.alt || doc.name })),
    highlights: doc.highlights || [],
    pros: doc.pros || [],
    cons: doc.cons || [],
    specs: doc.specs || [],
    offers,
    price: fallbackPrice,
    originalPrice: fallbackOriginal,
    discountPercent: Number(doc.discount_percent || 0),
    rating: Number(doc.rating_avg || 0),
    ratingCount: Number(doc.rating_count || 0),
    editorScore: doc.editor_score == null ? undefined : Number(doc.editor_score),
    featured: Boolean(doc.is_featured),
    deal: Boolean(doc.is_deal),
    material: doc.material || undefined,
    originCountry: doc.origin_country || undefined,
    warrantyMonths: doc.warranty_months == null ? undefined : Number(doc.warranty_months),
    trust: {
      authentic: doc.trust?.authentic !== false,
      freeShipping: Boolean(doc.trust?.free_shipping),
      returnDays: doc.trust?.return_days,
      warrantyText: doc.trust?.warranty_text,
    },
    faq: doc.faq_schema || [],
    updatedAt: new Date(doc.updated_at || doc.created_at || Date.now()).toISOString(),
  };
}

export async function getStorefrontProducts(options: { query?: string; category?: string; limit?: number; demoFallback?: boolean } = {}) {
  const { query = "", category = "", limit = 24, demoFallback = false } = options;
  try {
    await connectToDatabase();
    const filter: Record<string, unknown> = { status: "published" };
    if (query.trim()) {
      const regex = new RegExp(escapeRegExp(query.trim().slice(0, 100)), "i");
      filter.$or = [{ name: regex }, { short_description: regex }, { sku: regex }];
    }
    const docs = await ProductModel.find(filter)
      .populate("brand_id", "name slug")
      .populate("category_id", "name slug")
      .sort({ is_featured: -1, is_deal: -1, discount_percent: -1, published_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 60))
      .lean();
    let products = docs.map(serializeProduct);
    const queryReturnedProducts = products.length > 0;
    if (category) products = products.filter((product) => product.categorySlug === category);
    if (products.length) return products;
    // Demo cards are only a first-run canvas. Once the catalog contains real
    // published products, an empty filter/search should remain an honest empty state.
    if (queryReturnedProducts || ((query || category) && await ProductModel.exists({ status: "published" }))) return [];
  } catch (error) {
    console.error("Unable to load storefront products:", error);
  }

  if (!demoFallback) return [];
  return DEMO_PRODUCTS.filter((product) => {
    const matchesCategory = !category || product.categorySlug === category;
    const haystack = `${product.name} ${product.shortDescription} ${product.category}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query.toLowerCase()));
  }).slice(0, limit);
}

export const getStorefrontProduct = cache(async (slug: string): Promise<StorefrontProduct | null> => {
  try {
    await connectToDatabase();
    const doc = await ProductModel.findOne({ slug, status: "published" })
      .populate("brand_id", "name slug")
      .populate("category_id", "name slug")
      .lean();
    if (doc) return serializeProduct(doc);
  } catch (error) {
    console.error("Unable to load product:", error);
  }
  return DEMO_PRODUCTS.find((product) => product.slug === slug) || null;
});

export { DEMO_PRODUCTS };
