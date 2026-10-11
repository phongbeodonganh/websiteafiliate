export type DealCategory = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
};

export type MarketplaceStore = {
  slug: string;
  name: string;
  initials: string;
  categorySlug: string;
  description: string;
  offerCount: number;
  accent: string;
  destination: string;
};

export type MarketplaceDeal = {
  id: string;
  storeSlug: string;
  categorySlug: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  code?: string;
  automatic?: boolean;
  originalPrice?: number;
  salePrice?: number;
  saving: string;
  publishedAt: string;
  retestedAt?: string;
  featured?: boolean;
};

export type CouponGuide = {
  slug: string;
  categorySlug: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  readTime: string;
};

export const DEAL_CATEGORIES: DealCategory[] = [
  { slug: "home-garden", name: "Home & Garden", shortName: "Home", description: "Furniture, cookware, plants and practical upgrades for everyday spaces." },
  { slug: "tech", name: "Tech", shortName: "Tech", description: "Laptops, mobile accessories, audio and useful consumer electronics." },
  { slug: "beauty-fragrance", name: "Beauty & Fragrance", shortName: "Beauty", description: "Skincare, grooming and fragrance offers from established retailers." },
  { slug: "ai-saas", name: "AI Tools & SaaS", shortName: "AI & SaaS", description: "Useful software discounts with renewal terms explained before checkout." },
  { slug: "gaming", name: "Gaming", shortName: "Gaming", description: "Hardware, accessories and games for console and PC players." },
  { slug: "tools", name: "Tools", shortName: "Tools", description: "Workshop, craft and DIY equipment chosen for real projects." },
  { slug: "finance", name: "Finance", shortName: "Finance", description: "Carefully labelled financial offers with prominent risk information." },
];

export const MARKETPLACE_STORES: MarketplaceStore[] = [
  { slug: "beavercraft", name: "BeaverCraft", initials: "BC", categorySlug: "tools", description: "Wood-carving tools and starter kits for makers.", offerCount: 1, accent: "#f1b24a", destination: "https://beavercrafttools.com/" },
  { slug: "bookbolt", name: "BookBolt", initials: "BB", categorySlug: "ai-saas", description: "Publishing research and design software.", offerCount: 1, accent: "#7559e8", destination: "https://bookbolt.io/" },
  { slug: "leaf-and-clay", name: "Leaf & Clay", initials: "LC", categorySlug: "home-garden", description: "Succulents, houseplants and growing supplies.", offerCount: 1, accent: "#3d8d67", destination: "https://leafandclay.co/" },
  { slug: "simply-carbon-fiber", name: "Simply Carbon Fiber", initials: "SC", categorySlug: "tech", description: "Carbon-fibre phone cases and accessories.", offerCount: 1, accent: "#202b3f", destination: "https://simplycarbonfiber.com/" },
  { slug: "x-arcade", name: "X-Arcade", initials: "XA", categorySlug: "gaming", description: "Arcade controllers and cabinet hardware.", offerCount: 1, accent: "#e8473f", destination: "https://shop.xgaming.com/" },
  { slug: "notino", name: "Notino", initials: "NO", categorySlug: "beauty-fragrance", description: "Beauty, skincare and fragrance across Europe.", offerCount: 1, accent: "#9c4778", destination: "https://www.notino.com/" },
  { slug: "anker", name: "Anker", initials: "AN", categorySlug: "tech", description: "Charging, power and mobile accessories.", offerCount: 1, accent: "#2d6fd5", destination: "https://www.anker.com/eu-en" },
  { slug: "xm", name: "XM", initials: "XM", categorySlug: "finance", description: "Trading platform offers with risk-first context.", offerCount: 1, accent: "#bd2734", destination: "https://www.xm.com/" },
];

export const MARKETPLACE_DEALS: MarketplaceDeal[] = [
  { id: "leaf-newsletter", storeSlug: "leaf-and-clay", categorySlug: "home-garden", title: "10% off your first plant order", description: "A reliable welcome offer for new email subscribers.", imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=82", imageAlt: "Potted houseplants arranged on a bright shelf", code: "WELCOME10", saving: "10% off", publishedAt: "8 Oct 2026", retestedAt: "11 Oct 2026", featured: true },
  { id: "beaver-starter", storeSlug: "beavercraft", categorySlug: "tools", title: "Save on the S15 carving starter set", description: "Discount applies to the selected beginner kit while stock lasts.", imageUrl: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=82", imageAlt: "Woodworking tools beside a handmade wooden project", code: "CARVE10", originalPrice: 79.95, salePrice: 71.95, saving: "10% off", publishedAt: "4 Oct 2026", retestedAt: "10 Oct 2026" },
  { id: "anker-power", storeSlug: "anker", categorySlug: "tech", title: "20K power bank price drop", description: "The sale price is shown automatically on the product page.", imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=82", imageAlt: "Smartphone ready for portable charging", automatic: true, originalPrice: 69.99, salePrice: 49.99, saving: "Save €20", publishedAt: "9 Oct 2026", retestedAt: "11 Oct 2026" },
  { id: "bookbolt-trial", storeSlug: "bookbolt", categorySlug: "ai-saas", title: "20% off a first software plan", description: "New accounts only. Review renewal pricing before subscribing.", imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=82", imageAlt: "Laptop displaying a creative software workspace", code: "START20", saving: "20% off", publishedAt: "1 Oct 2026", retestedAt: "9 Oct 2026" },
  { id: "xarcade-dual", storeSlug: "x-arcade", categorySlug: "gaming", title: "Dual joystick bundle offer", description: "Bundle pricing is applied when both eligible items are in the basket.", imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=82", imageAlt: "Gaming setup with illuminated display and controls", automatic: true, originalPrice: 249.99, salePrice: 219.99, saving: "Save €30", publishedAt: "6 Oct 2026", retestedAt: "10 Oct 2026" },
  { id: "notino-fragrance", storeSlug: "notino", categorySlug: "beauty-fragrance", title: "Selected fragrance event", description: "A rotating offer on selected fragrance lines and sizes.", imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=82", imageAlt: "Glass fragrance bottle on a dark surface", code: "SCENT12", saving: "12% off", publishedAt: "7 Oct 2026", retestedAt: "11 Oct 2026" },
  { id: "carbon-case", storeSlug: "simply-carbon-fiber", categorySlug: "tech", title: "Carbon phone case welcome offer", description: "Valid on eligible full-price cases for new customers.", imageUrl: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=900&q=82", imageAlt: "Modern smartphone held in one hand", code: "AFFILIATE10", saving: "10% off", publishedAt: "2 Oct 2026", retestedAt: "8 Oct 2026" },
  { id: "xm-review", storeSlug: "xm", categorySlug: "finance", title: "XM account promotion review", description: "High-risk investment product. Read the risk review before acting.", imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=82", imageAlt: "Financial market chart displayed on a screen", automatic: true, saving: "Terms apply", publishedAt: "30 Sep 2026", retestedAt: "10 Oct 2026" },
];

export const COUPON_GUIDES: CouponGuide[] = [
  { slug: "beavercraft-coupon-reality-check", categorySlug: "tools", title: "BeaverCraft coupons: which offers are actually worth trying?", excerpt: "We separate expired third-party codes from the dependable newsletter saving.", updatedAt: "11 Oct 2026", readTime: "6 min" },
  { slug: "xm-review-risk-guide", categorySlug: "finance", title: "XM review: fees, account terms and the CFD risk you should not skip", excerpt: "A plain-English review with the risk warning placed before any promotion.", updatedAt: "10 Oct 2026", readTime: "9 min" },
  { slug: "leaf-and-clay-saving-guide", categorySlug: "home-garden", title: "Leaf & Clay savings guide for first-time plant buyers", excerpt: "How the welcome code works and what to check for live-plant delivery.", updatedAt: "9 Oct 2026", readTime: "5 min" },
  { slug: "real-coupon-checklist", categorySlug: "tech", title: "A five-point checklist for spotting a real coupon code", excerpt: "Check dates, exclusions and basket behaviour before trusting a discount claim.", updatedAt: "8 Oct 2026", readTime: "4 min" },
  { slug: "saas-renewal-pricing", categorySlug: "ai-saas", title: "SaaS discounts: compare the renewal price, not only month one", excerpt: "A quick method for calculating the true first-year cost of a software deal.", updatedAt: "7 Oct 2026", readTime: "7 min" },
  { slug: "fragrance-sale-guide", categorySlug: "beauty-fragrance", title: "How to compare fragrance discounts across European retailers", excerpt: "Bottle size, concentration and delivery can matter more than the headline rate.", updatedAt: "6 Oct 2026", readTime: "5 min" },
];

export function getStore(slug: string) {
  return MARKETPLACE_STORES.find((store) => store.slug === slug);
}

export function getCategory(slug: string) {
  return DEAL_CATEGORIES.find((category) => category.slug === slug);
}

export function getDealsForStore(slug: string) {
  return MARKETPLACE_DEALS.filter((deal) => deal.storeSlug === slug);
}

export function getDealsForCategory(slug: string) {
  return MARKETPLACE_DEALS.filter((deal) => deal.categorySlug === slug);
}
