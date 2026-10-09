/**
 * Marketplace registry — single source of truth for every store an Offer can
 * point at. Shared by the backend (validation enum) and the frontend (CTA label,
 * logo, brand colour). Keep this file free of server-only imports so client
 * components can use it.
 */

export const MARKETPLACE_KEYS = [
  'amazon',
  'walmart',
  'bestbuy',
  'target',
  'ebay',
  'aliexpress',
  'temu',
  'shopee',
  'lazada',
  'tiki',
  'tiktok',
  'official',
  'other',
] as const;

export type Marketplace = (typeof MARKETPLACE_KEYS)[number];

export interface MarketplaceMeta {
  key: Marketplace;
  label: string;
  /** CTA copy, e.g. "View on Amazon". */
  ctaLabel: string;
  /** Public path under /public — logos are added in the frontend step. */
  logo: string;
  /** Brand colour used for the CTA button background. */
  color: string;
  /** Foreground colour that passes contrast on `color`. */
  textColor: string;
  /** Label for the "official store" badge on this marketplace. */
  officialLabel: string;
}

export const MARKETPLACES: Record<Marketplace, MarketplaceMeta> = {
  amazon: { key: 'amazon', label: 'Amazon', ctaLabel: 'View on Amazon', logo: '/marketplaces/amazon.svg', color: '#FF9900', textColor: '#111111', officialLabel: 'Sold by Amazon' },
  walmart: { key: 'walmart', label: 'Walmart', ctaLabel: 'View on Walmart', logo: '/marketplaces/walmart.svg', color: '#0071DC', textColor: '#FFFFFF', officialLabel: 'Sold by Walmart' },
  bestbuy: { key: 'bestbuy', label: 'Best Buy', ctaLabel: 'View on Best Buy', logo: '/marketplaces/bestbuy.svg', color: '#0046BE', textColor: '#FFE000', officialLabel: 'Sold by Best Buy' },
  target: { key: 'target', label: 'Target', ctaLabel: 'View on Target', logo: '/marketplaces/target.svg', color: '#CC0000', textColor: '#FFFFFF', officialLabel: 'Sold by Target' },
  ebay: { key: 'ebay', label: 'eBay', ctaLabel: 'View on eBay', logo: '/marketplaces/ebay.svg', color: '#3665F3', textColor: '#FFFFFF', officialLabel: 'Top Rated Seller' },
  aliexpress: { key: 'aliexpress', label: 'AliExpress', ctaLabel: 'View on AliExpress', logo: '/marketplaces/aliexpress.svg', color: '#E62E04', textColor: '#FFFFFF', officialLabel: 'Official Store' },
  temu: { key: 'temu', label: 'Temu', ctaLabel: 'View on Temu', logo: '/marketplaces/temu.svg', color: '#FB7701', textColor: '#FFFFFF', officialLabel: 'Official Store' },
  shopee: { key: 'shopee', label: 'Shopee', ctaLabel: 'View on Shopee', logo: '/marketplaces/shopee.svg', color: '#EE4D2D', textColor: '#FFFFFF', officialLabel: 'Shopee Mall' },
  lazada: { key: 'lazada', label: 'Lazada', ctaLabel: 'View on Lazada', logo: '/marketplaces/lazada.svg', color: '#0F146D', textColor: '#FFFFFF', officialLabel: 'LazMall' },
  tiki: { key: 'tiki', label: 'Tiki', ctaLabel: 'View on Tiki', logo: '/marketplaces/tiki.svg', color: '#1A94FF', textColor: '#FFFFFF', officialLabel: 'Tiki Trading' },
  tiktok: { key: 'tiktok', label: 'TikTok Shop', ctaLabel: 'View on TikTok Shop', logo: '/marketplaces/tiktok.svg', color: '#000000', textColor: '#FFFFFF', officialLabel: 'Official Shop' },
  official: { key: 'official', label: 'Official Store', ctaLabel: 'Buy from Official Store', logo: '/marketplaces/official.svg', color: '#0F172A', textColor: '#FFFFFF', officialLabel: 'Brand Store' },
  other: { key: 'other', label: 'Retailer', ctaLabel: 'Check Price', logo: '/marketplaces/other.svg', color: '#334155', textColor: '#FFFFFF', officialLabel: 'Authorized Retailer' },
};

export function isMarketplace(value: unknown): value is Marketplace {
  return typeof value === 'string' && (MARKETPLACE_KEYS as readonly string[]).includes(value);
}

export function getMarketplaceMeta(key: string | undefined | null): MarketplaceMeta {
  return isMarketplace(key) ? MARKETPLACES[key] : MARKETPLACES.other;
}
