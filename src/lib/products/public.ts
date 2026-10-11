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
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
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
    images: [{ url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=85", alt: "Modern monitor and desk setup" }],
    highlights: ["No-screen-glare light bar", "Warm-to-cool color control", "USB-C powered"],
    pros: ["Frees up desk space", "Easy physical controls", "Comfortable for late-night work"],
    cons: ["Not suitable for curved monitors", "Power adapter is not included"],
    specs: [{ group: "Key details", items: [{ label: "Width", value: "45 cm" }, { label: "Power", value: "USB-C, 5W" }, { label: "Color temperature", value: "2700–6500K", highlight: true }] }],
    offers: [{ id: "demo-offer-luma", marketplace: "amazon", storeName: "Amazon Europe", official: false, price: 39.99, originalPrice: 59.99, couponCode: "SAVE10", freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=monitor+light+bar" }],
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
    images: [{ url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=85", alt: "Bright modern kitchen counter" }],
    highlights: ["6-quart basket", "Dishwasher-safe tray", "Eight cooking presets"],
    pros: ["Simple controls", "Good family capacity", "Fast preheat"],
    cons: ["Takes up counter space"],
    specs: [{ group: "Appliance", items: [{ label: "Capacity", value: "6 qt", highlight: true }, { label: "Power", value: "1700W" }] }],
    offers: [{ id: "demo-offer-crisp", marketplace: "amazon", storeName: "Amazon Europe", official: false, price: 74, originalPrice: 99, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=6qt+air+fryer" }],
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
    offers: [{ id: "demo-offer-pruner", marketplace: "official", storeName: "Fieldcraft EU", official: true, price: 28.5, originalPrice: 35, freeShipping: false, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=garden+bypass+pruner" }],
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
    images: [{ url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=85", alt: "Smartphone ready for portable charging" }],
    highlights: ["65W USB-C output", "20,000mAh capacity", "Battery display"],
    pros: ["Laptop-capable output", "Useful percentage display"],
    cons: ["Heavier than phone-only batteries"],
    specs: [{ group: "Power", items: [{ label: "Capacity", value: "20,000mAh", highlight: true }, { label: "Max output", value: "65W" }] }],
    offers: [{ id: "demo-offer-volt", marketplace: "amazon", storeName: "Amazon Europe", official: false, price: 49.99, originalPrice: 69.99, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=20000mah+power+bank" }],
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
  {
    id: "demo-trainers",
    slug: "corestep-everyday-trainers",
    name: "CoreStep Everyday Trainers",
    sku: "DEMO-STEP-08",
    brand: "CoreStep",
    category: "Fashion",
    categorySlug: "fashion",
    shortDescription: "A lightweight everyday trainer with a washable upper and a supportive, replaceable insole.",
    description: "A simple walking shoe for commutes, errands and travel days, chosen for comfort and easy care rather than performance styling.",
    images: [{ url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85", alt: "Red everyday trainer on a neutral background" }],
    highlights: ["All-day walking", "Washable knit upper", "Replaceable insole"],
    pros: ["Light on foot", "Easy to clean", "Room for custom insoles"],
    cons: ["Not waterproof", "Limited ankle support"],
    specs: [{ group: "Fit", items: [{ label: "Weight", value: "265 g per shoe" }, { label: "Fit", value: "True to size", highlight: true }] }],
    offers: [{ id: "demo-offer-step", marketplace: "amazon", storeName: "Amazon Europe", official: false, price: 64, originalPrice: 79, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=everyday+walking+trainers" }],
    price: 64,
    originalPrice: 79,
    discountPercent: 19,
    rating: 4.5,
    ratingCount: 682,
    editorScore: 8.5,
    featured: false,
    deal: true,
    trust: { authentic: true, freeShipping: true, returnDays: 30 },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-commuter-bike",
    slug: "cityfold-commuter-bike",
    name: "CityFold Commuter Bike",
    sku: "DEMO-CITY-20",
    brand: "CityFold",
    category: "Mobility",
    categorySlug: "mobility",
    shortDescription: "A compact folding bike for mixed train-and-road commutes and limited home storage.",
    description: "A practical twenty-inch folding bicycle with mudguards, rack mounts and a simple eight-speed drivetrain for everyday urban trips.",
    images: [{ url: "https://images.unsplash.com/photo-1502744688674-c619d1586c9e?auto=format&fit=crop&w=1200&q=85", alt: "Bicycle prepared for an everyday city ride" }],
    highlights: ["Mixed-mode commuting", "20-inch wheels", "Eight-speed drivetrain"],
    pros: ["Fits small storage spaces", "Useful gear range", "Rack-ready frame"],
    cons: ["Heavier to carry upstairs", "Not intended for rough trails"],
    specs: [{ group: "Frame", items: [{ label: "Folded size", value: "78 × 66 × 36 cm", highlight: true }, { label: "Weight", value: "13.2 kg" }] }],
    offers: [{ id: "demo-offer-city", marketplace: "official", storeName: "CityFold Europe", official: true, price: 549, originalPrice: 629, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=folding+commuter+bike" }],
    price: 549,
    originalPrice: 629,
    discountPercent: 13,
    rating: 4.6,
    ratingCount: 214,
    editorScore: 8.8,
    featured: false,
    deal: true,
    trust: { authentic: true, freeShipping: true, returnDays: 14, warrantyText: "2-year frame warranty" },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-wellness-lamp",
    slug: "morningside-wake-light",
    name: "Morningside Wake Light",
    sku: "DEMO-MORN-01",
    brand: "Morningside",
    category: "Family & Wellness",
    categorySlug: "wellness",
    shortDescription: "A gentle bedside light that builds brightness gradually for calmer winter mornings.",
    description: "A sunrise-style alarm for people who prefer light before sound, with physical controls and a warm evening mode.",
    images: [{ url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85", alt: "Warm bedside lamp in a calm bedroom" }],
    highlights: ["Gentler wake-up routine", "Thirty-minute sunrise", "Warm evening mode"],
    pros: ["Simple physical buttons", "No account required", "Soft minimum brightness"],
    cons: ["Takes space on a small bedside table"],
    specs: [{ group: "Light", items: [{ label: "Sunrise duration", value: "10–30 minutes", highlight: true }, { label: "Alarm sounds", value: "6" }] }],
    offers: [{ id: "demo-offer-morn", marketplace: "amazon", storeName: "Amazon Europe", official: false, price: 46, originalPrice: 59, freeShipping: true, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=sunrise+alarm+clock" }],
    price: 46,
    originalPrice: 59,
    discountPercent: 22,
    rating: 4.4,
    ratingCount: 519,
    editorScore: 8.4,
    featured: false,
    deal: true,
    trust: { authentic: true, freeShipping: true, returnDays: 30 },
    faq: [],
    updatedAt: new Date().toISOString(),
    demo: true,
  },
  {
    id: "demo-daypack",
    slug: "trailnest-22l-daypack",
    name: "TrailNest 22L Daypack",
    sku: "DEMO-TRAIL-22",
    brand: "TrailNest",
    category: "Outdoors",
    categorySlug: "outdoor",
    shortDescription: "A ventilated daypack sized for local hikes, train trips and carry-on essentials.",
    description: "A lightweight twenty-two litre pack with an open mesh back, useful side pockets and enough structure for a full day outside.",
    images: [{ url: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=85", alt: "Hiker carrying a daypack on a mountain trail" }],
    highlights: ["Day hikes and travel", "22-litre capacity", "Ventilated back panel"],
    pros: ["Comfortable in warm weather", "Useful bottle pockets", "Lightweight frame"],
    cons: ["No included rain cover"],
    specs: [{ group: "Pack", items: [{ label: "Capacity", value: "22 L", highlight: true }, { label: "Weight", value: "720 g" }] }],
    offers: [{ id: "demo-offer-trail", marketplace: "official", storeName: "TrailNest EU", official: true, price: 58, originalPrice: 72, freeShipping: false, stockStatus: "in_stock", directUrl: "https://www.amazon.de/s?k=22l+hiking+daypack" }],
    price: 58,
    originalPrice: 72,
    discountPercent: 19,
    rating: 4.7,
    ratingCount: 341,
    editorScore: 8.9,
    featured: false,
    deal: true,
    trust: { authentic: true, freeShipping: false, returnDays: 30 },
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
    metaTitle: doc.meta_title || undefined,
    metaDescription: doc.meta_description || undefined,
    focusKeyword: doc.focus_keyword || undefined,
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
