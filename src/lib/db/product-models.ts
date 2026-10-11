import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { MARKETPLACE_KEYS, type Marketplace } from '@/lib/marketplaces';
import { computePriceSummary, pickPrimaryOfferIndex } from '@/lib/products/pricing';

/* ------------------------------------------------------------------ */
/* Shared enums                                                        */
/* ------------------------------------------------------------------ */

export const STOCK_STATUSES = ['in_stock', 'low_stock', 'out_of_stock', 'preorder'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const OFFER_STATUSES = ['active', 'inactive', 'blacklisted'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const VARIANT_OPTION_TYPES = ['color', 'size', 'text'] as const;
export const DIMENSION_UNITS = ['mm', 'cm', 'in'] as const;
export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  country?: string;
  website?: string;
  created_at: Date;
}

const BrandSchema = new Schema<IBrand>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  logo_url: { type: String },
  description: { type: String },
  country: { type: String },
  website: { type: String },
  created_at: { type: Date, default: Date.now },
});

/* ------------------------------------------------------------------ */
/* Product sub-documents                                               */
/* ------------------------------------------------------------------ */

export interface IProductImage {
  _id?: Types.ObjectId;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  /** Tiny base64 preview for the blur-up effect. */
  blur_data_url?: string;
  /** e.g. "color:black" — the gallery jumps to this image when that option is picked. */
  variant_option?: string;
  sort_order: number;
}

const ProductImageSchema = new Schema<IProductImage>({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
  width: { type: Number },
  height: { type: Number },
  blur_data_url: { type: String },
  variant_option: { type: String },
  sort_order: { type: Number, default: 0 },
});

export interface IVariantOptionValue {
  value: string;
  label: string;
  hex?: string;
}

export interface IVariantOption {
  key: string;
  label: string;
  type: (typeof VARIANT_OPTION_TYPES)[number];
  values: IVariantOptionValue[];
}

const VariantOptionSchema = new Schema<IVariantOption>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: VARIANT_OPTION_TYPES, default: 'text' },
    values: [
      {
        _id: false,
        value: { type: String, required: true },
        label: { type: String, required: true },
        hex: { type: String },
      },
    ],
  },
  { _id: false }
);

export interface IProductVariant {
  _id?: Types.ObjectId;
  sku: string;
  options: Record<string, string>;
  price?: number;
  original_price?: number;
  image_index?: number;
  stock_status: StockStatus;
  is_default: boolean;
}

const ProductVariantSchema = new Schema<IProductVariant>({
  sku: { type: String, required: true, trim: true },
  options: { type: Map, of: String, default: {} },
  price: { type: Number, min: 0 },
  original_price: { type: Number, min: 0 },
  image_index: { type: Number, min: 0 },
  stock_status: { type: String, enum: STOCK_STATUSES, default: 'in_stock' },
  is_default: { type: Boolean, default: false },
});

export interface IOffer {
  _id: Types.ObjectId;
  marketplace: Marketplace;
  store_name: string;
  is_official_store: boolean;
  /** Real affiliate deep link — NEVER serialised to public responses. */
  affiliate_url: string;
  /** Optional query param name for a per-click sub id (e.g. "ascsubtag" for Amazon). */
  subid_param?: string;
  /** Empty = offer applies to every variant. */
  variant_sku?: string;
  price: number;
  original_price?: number;
  coupon_code?: string;
  coupon_note?: string;
  free_shipping: boolean;
  stock_status: StockStatus;
  is_primary: boolean;
  sort_order: number;
  last_checked_at?: Date;
  click_count: number;
  status: OfferStatus;
}

const OfferSchema = new Schema<IOffer>({
  marketplace: { type: String, enum: MARKETPLACE_KEYS, required: true },
  store_name: { type: String, default: '' },
  is_official_store: { type: Boolean, default: false },
  affiliate_url: { type: String, required: true },
  subid_param: { type: String },
  variant_sku: { type: String },
  price: { type: Number, required: true, min: 0 },
  original_price: { type: Number, min: 0 },
  coupon_code: { type: String },
  coupon_note: { type: String },
  free_shipping: { type: Boolean, default: false },
  stock_status: { type: String, enum: STOCK_STATUSES, default: 'in_stock' },
  is_primary: { type: Boolean, default: false },
  sort_order: { type: Number, default: 0 },
  last_checked_at: { type: Date },
  click_count: { type: Number, default: 0 },
  status: { type: String, enum: OFFER_STATUSES, default: 'active' },
});

export interface ISpecItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ISpecGroup {
  group: string;
  items: ISpecItem[];
}

const SpecGroupSchema = new Schema<ISpecGroup>(
  {
    group: { type: String, required: true },
    items: [
      {
        _id: false,
        label: { type: String, required: true },
        value: { type: String, required: true },
        highlight: { type: Boolean, default: false },
      },
    ],
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/* Product                                                             */
/* ------------------------------------------------------------------ */

export interface IProduct extends Document {
  name: string;
  slug: string;
  sku: string;
  brand_id?: Types.ObjectId;
  category_id?: Types.ObjectId;
  sub_category_id?: Types.ObjectId;

  short_description?: string;
  description?: string;
  highlights: string[];
  pros: string[];
  cons: string[];

  dimensions?: { length?: number; width?: number; height?: number; unit: (typeof DIMENSION_UNITS)[number] };
  weight?: { value?: number; unit: (typeof WEIGHT_UNITS)[number] };
  material?: string;
  origin_country?: string;
  warranty_months?: number;

  images: Types.DocumentArray<IProductImage & Document>;
  variant_options: IVariantOption[];
  variants: Types.DocumentArray<IProductVariant & Document>;
  specs: ISpecGroup[];
  offers: Types.DocumentArray<IOffer & Document>;

  /** Manual reference price (USD) — used when no offer is priced. */
  price?: number;
  original_price?: number;
  /** Denormalised from offers in the pre-validate hook. */
  price_min: number;
  price_max: number;
  discount_percent: number;
  currency: 'USD';

  trust: {
    authentic: boolean;
    free_shipping: boolean;
    return_days?: number;
    warranty_text?: string;
  };

  rating_avg: number;
  rating_count: number;
  rating_breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number };
  editor_score?: number;

  related_product_ids: Types.ObjectId[];
  article_ids: Types.ObjectId[];

  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  faq_schema: { question: string; answer: string }[];

  status: ProductStatus;
  is_featured: boolean;
  is_deal: boolean;
  view_count: number;
  click_count: number;
  price_checked_at?: Date;
  author_id?: Types.ObjectId;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true, trim: true },
  brand_id: { type: Schema.Types.ObjectId, ref: 'Brand' },
  category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
  sub_category_id: { type: Schema.Types.ObjectId, ref: 'SubCategory' },

  short_description: { type: String },
  description: { type: String },
  highlights: [{ type: String }],
  pros: [{ type: String }],
  cons: [{ type: String }],

  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String, enum: DIMENSION_UNITS, default: 'cm' },
  },
  weight: {
    value: { type: Number, min: 0 },
    unit: { type: String, enum: WEIGHT_UNITS, default: 'g' },
  },
  material: { type: String },
  origin_country: { type: String },
  warranty_months: { type: Number, min: 0 },

  images: { type: [ProductImageSchema], default: [] },
  variant_options: { type: [VariantOptionSchema], default: [] },
  variants: { type: [ProductVariantSchema], default: [] },
  specs: { type: [SpecGroupSchema], default: [] },
  offers: { type: [OfferSchema], default: [] },

  price: { type: Number, min: 0 },
  original_price: { type: Number, min: 0 },
  price_min: { type: Number, default: 0 },
  price_max: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  currency: { type: String, enum: ['USD'], default: 'USD' },

  trust: {
    authentic: { type: Boolean, default: true },
    free_shipping: { type: Boolean, default: false },
    return_days: { type: Number, min: 0 },
    warranty_text: { type: String },
  },

  rating_avg: { type: Number, default: 0, min: 0, max: 5 },
  rating_count: { type: Number, default: 0 },
  rating_breakdown: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 },
  },
  editor_score: { type: Number, min: 0, max: 10 },

  related_product_ids: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  article_ids: [{ type: Schema.Types.ObjectId, ref: 'Article' }],

  meta_title: { type: String },
  meta_description: { type: String },
  focus_keyword: { type: String },
  faq_schema: [{ _id: false, question: { type: String }, answer: { type: String } }],

  status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
  is_featured: { type: Boolean, default: false },
  is_deal: { type: Boolean, default: false },
  view_count: { type: Number, default: 0 },
  click_count: { type: Number, default: 0 },
  price_checked_at: { type: Date },
  author_id: { type: Schema.Types.ObjectId, ref: 'User' },
  published_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

ProductSchema.index({ 'variants.sku': 1 }, { sparse: true });
ProductSchema.index({ status: 1, category_id: 1, published_at: -1 });
ProductSchema.index({ status: 1, is_featured: 1, published_at: -1 });
ProductSchema.index({ status: 1, is_deal: 1, discount_percent: -1 });
ProductSchema.index({ status: 1, price_min: 1 });
ProductSchema.index({ brand_id: 1, status: 1 });
ProductSchema.index({ name: 'text', short_description: 'text', sku: 'text' }, { default_language: 'english' });

/**
 * Business invariants enforced on every save (create / update via doc.save()):
 *  - images sorted by sort_order and re-numbered 0..n
 *  - exactly one primary offer (or none when no offer is purchasable)
 *  - price_min / price_max / discount_percent denormalised from offers
 *  - trust.free_shipping auto-enabled when any active offer ships free
 *  - published_at stamped on first publish
 */
ProductSchema.pre('validate', function () {
  const doc = this as IProduct;

  if (doc.images?.length) {
    const sorted = [...doc.images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    sorted.forEach((img, i) => {
      img.sort_order = i;
    });
    doc.images = sorted as typeof doc.images;
  }

  const offers = doc.offers ?? [];
  const primaryIndex = pickPrimaryOfferIndex(offers);
  offers.forEach((offer, i) => {
    offer.is_primary = i === primaryIndex;
  });

  const summary = computePriceSummary(offers, { price: doc.price, original_price: doc.original_price });
  doc.price_min = summary.price_min;
  doc.price_max = summary.price_max;
  doc.discount_percent = summary.discount_percent;

  if (offers.some((o) => o.status === 'active' && o.free_shipping)) {
    doc.trust = { ...(doc.trust ?? { authentic: true }), free_shipping: true };
  }

  if (doc.status === 'published' && !doc.published_at) {
    doc.published_at = new Date();
  }
  doc.updated_at = new Date();
});

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_SOURCES = ['site', 'amazon', 'walmart', 'shopee', 'lazada', 'tiki', 'other'] as const;

export interface IReview extends Document {
  product_id: Types.ObjectId;
  author_name: string;
  /** Private — never exposed publicly; used for moderation / dedupe. */
  author_email?: string;
  rating: number;
  title?: string;
  content: string;
  images: string[];
  variant_label?: string;
  is_verified_purchase: boolean;
  source: (typeof REVIEW_SOURCES)[number];
  status: ReviewStatus;
  helpful_count: number;
  ip_address?: string;
  created_at: Date;
}

const ReviewSchema = new Schema<IReview>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  author_name: { type: String, required: true, trim: true, maxlength: 80 },
  author_email: { type: String, trim: true, lowercase: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 140 },
  content: { type: String, required: true, maxlength: 5000 },
  images: [{ type: String }],
  variant_label: { type: String },
  is_verified_purchase: { type: Boolean, default: false },
  source: { type: String, enum: REVIEW_SOURCES, default: 'site' },
  status: { type: String, enum: REVIEW_STATUSES, default: 'pending' },
  helpful_count: { type: Number, default: 0 },
  ip_address: { type: String },
  created_at: { type: Date, default: Date.now },
});

ReviewSchema.index({ product_id: 1, status: 1, created_at: -1 });
ReviewSchema.index({ status: 1, created_at: -1 });

/* ------------------------------------------------------------------ */
/* Model exports (HMR-safe)                                            */
/* ------------------------------------------------------------------ */

export const BrandModel: Model<IBrand> = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);
export const ProductModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const ReviewModel: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
