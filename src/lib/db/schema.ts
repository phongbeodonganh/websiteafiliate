import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface definitions
export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'author';
  name?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: Date;
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
}

export interface ISubCategory extends Document {
  categoryId: mongoose.Types.ObjectId | string;
  name: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
}

export interface IArticle extends Document {
  authorId: mongoose.Types.ObjectId | string;
  categoryId?: mongoose.Types.ObjectId | string;
  subCategoryId?: mongoose.Types.ObjectId | string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published';
  isFeatured: boolean;
  viewCount: number;
  revenue: number;
  metaTitle?: string;
  metaDescription?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAffiliateLink extends Document {
  name: string;
  baseUrl: string;
  commission?: string;
  cookie?: string;
  isTopPick: boolean;
  createdAt: Date;
}

export interface IArticleAffiliateRelation extends Document {
  articleId: mongoose.Types.ObjectId | string;
  affiliateLinkId: mongoose.Types.ObjectId | string;
  positionLabel: string;
}

export interface IClickLog extends Document {
  articleId?: mongoose.Types.ObjectId | string;
  affiliateLinkId?: mongoose.Types.ObjectId | string;
  ipAddress?: string;
  clickedAt: Date;
}

export interface ISubscriber extends Document {
  email: string;
  subscribedAt: Date;
}

export interface ISetting extends Document {
  siteTitle: string;
  metaDescription?: string;
  focusKeywords?: string;
  canonicalUrl?: string;
  hreflang: string;
  geoTarget: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  ogImageUrl?: string;
  schemaJsonld?: string;
  headScripts?: string;
  primaryColor: string;
  accentColor: string;
  themeMode: string;
  fontFamily: string;
  logoUrl?: string;
  faviconUrl?: string;
  bannerText?: string;
  footerText?: string;
  customCss?: string;
  geoLatitude: number;
  geoLongitude: number;
  geoRegionName: string;
  geoPlacename: string;
  updatedAt: Date;
}

const opts = {
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};

// 1. User Schema
const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'author'], default: 'author', required: true },
    name: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  opts
);

// 2. Category Schema
const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    metaTitle: { type: String },
    metaDescription: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  opts
);

// 3. SubCategory Schema
const SubCategorySchema = new Schema<ISubCategory>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    metaTitle: { type: String },
    metaDescription: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  opts
);

// 4. Article Schema
const ArticleSchema = new Schema<IArticle>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    subCategoryId: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', required: true },
    isFeatured: { type: Boolean, default: false, required: true },
    viewCount: { type: Number, default: 0, required: true },
    revenue: { type: Number, default: 0, required: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    thumbnailUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  opts
);

// 5. AffiliateLink Schema
const AffiliateLinkSchema = new Schema<IAffiliateLink>(
  {
    name: { type: String, required: true },
    baseUrl: { type: String, required: true },
    commission: { type: String },
    cookie: { type: String },
    isTopPick: { type: Boolean, default: false, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  opts
);

// 6. ArticleAffiliateRelation Schema
const ArticleAffiliateRelationSchema = new Schema<IArticleAffiliateRelation>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    affiliateLinkId: { type: Schema.Types.ObjectId, ref: 'AffiliateLink', required: true },
    positionLabel: { type: String, default: 'top_cta', required: true },
  },
  opts
);

// 7. ClickLog Schema
const ClickLogSchema = new Schema<IClickLog>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article' },
    affiliateLinkId: { type: Schema.Types.ObjectId, ref: 'AffiliateLink' },
    ipAddress: { type: String },
    clickedAt: { type: Date, default: Date.now },
  },
  opts
);

// 8. Subscriber Schema
const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  opts
);

// 9. Setting Schema
const SettingSchema = new Schema<ISetting>(
  {
    siteTitle: { type: String, default: 'AIDEALSUK' },
    metaDescription: { type: String },
    focusKeywords: { type: String },
    canonicalUrl: { type: String },
    hreflang: { type: String, default: 'en-US' },
    geoTarget: { type: String, default: 'GLOBAL' },
    businessName: { type: String },
    businessAddress: { type: String },
    businessPhone: { type: String },
    ogImageUrl: { type: String },
    schemaJsonld: { type: String },
    headScripts: { type: String },
    primaryColor: { type: String, default: '#0f172a' },
    accentColor: { type: String, default: '#f59e0b' },
    themeMode: { type: String, default: 'dark' },
    fontFamily: { type: String, default: 'Inter' },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    bannerText: { type: String },
    footerText: { type: String },
    customCss: { type: String },
    geoLatitude: { type: Number, default: 40.7128 },
    geoLongitude: { type: Number, default: -74.0060 },
    geoRegionName: { type: String, default: 'US-NY' },
    geoPlacename: { type: String, default: 'New York' },
    updatedAt: { type: Date, default: Date.now },
  },
  opts
);

// Mongoose Models with Next.js HMR protection
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const SubCategory: Model<ISubCategory> = mongoose.models.SubCategory || mongoose.model<ISubCategory>('SubCategory', SubCategorySchema);
export const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
export const AffiliateLink: Model<IAffiliateLink> = mongoose.models.AffiliateLink || mongoose.model<IAffiliateLink>('AffiliateLink', AffiliateLinkSchema);
export const ArticleAffiliateRelation: Model<IArticleAffiliateRelation> = mongoose.models.ArticleAffiliateRelation || mongoose.model<IArticleAffiliateRelation>('ArticleAffiliateRelation', ArticleAffiliateRelationSchema);
export const ClickLog: Model<IClickLog> = mongoose.models.ClickLog || mongoose.model<IClickLog>('ClickLog', ClickLogSchema);
export const Subscriber: Model<ISubscriber> = mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
export const Setting: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

// Legacy aliases / Types for compatibility
export type User = IUser;
export type Category = ICategory;
export type SubCategory = ISubCategory;
export type Article = IArticle;
export type AffiliateLink = IAffiliateLink;
export type ArticleAffiliateRelation = IArticleAffiliateRelation;
export type ClickLog = IClickLog;
export type Subscriber = ISubscriber;
export type Setting = ISetting;
