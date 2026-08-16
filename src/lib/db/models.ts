import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. User
export interface IUser extends Document {
  username: string;
  password_hash: string;
  role: 'admin' | 'editor' | 'author';
  name?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  created_at: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'editor', 'author'], default: 'author' },
  name: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  avatar: { type: String },
  created_at: { type: Date, default: Date.now }
});

// 2. Category (Level 1)
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  meta_title: { type: String },
  meta_description: { type: String },
  created_at: { type: Date, default: Date.now }
});

// 3. SubCategory (Level 2)
export interface ISubCategory extends Document {
  category_id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: Date;
}

const SubCategorySchema = new Schema<ISubCategory>({
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  meta_title: { type: String },
  meta_description: { type: String },
  created_at: { type: Date, default: Date.now }
});

// 4. AffiliateLink
export interface IAffiliateLink extends Document {
  name: string;
  base_url: string;
  commission?: string;
  cookie?: string;
  is_top_pick: boolean;
  created_at: Date;
}

const AffiliateLinkSchema = new Schema<IAffiliateLink>({
  name: { type: String, required: true },
  base_url: { type: String, required: true },
  commission: { type: String },
  cookie: { type: String },
  is_top_pick: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

// 5. Article
export interface IArticle extends Document {
  author_id: mongoose.Types.ObjectId;
  category_id?: mongoose.Types.ObjectId;
  sub_category_id?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  view_count: number;
  revenue: number;
  meta_title?: string;
  meta_description?: string;
  thumbnail_url?: string;
  focus_keyword?: string;
  key_takeaways?: string[];
  entities?: string[];
  faq_schema?: { question: string; answer: string }[];
  affiliate_placements?: { affiliate_link_id: mongoose.Types.ObjectId; position_label: string }[];
  created_at: Date;
  updated_at: Date;
}

const ArticleSchema = new Schema<IArticle>({
  author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
  sub_category_id: { type: Schema.Types.ObjectId, ref: 'SubCategory' },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String },
  content: { type: String, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  is_featured: { type: Boolean, default: false },
  view_count: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  meta_title: { type: String },
  meta_description: { type: String },
  thumbnail_url: { type: String },
  focus_keyword: { type: String },
  key_takeaways: [{ type: String }],
  entities: [{ type: String }],
  faq_schema: [
    {
      question: { type: String },
      answer: { type: String },
    },
  ],
  affiliate_placements: [
    {
      affiliate_link_id: { type: Schema.Types.ObjectId, ref: 'AffiliateLink' },
      position_label: { type: String, default: 'top_cta' },
    },
  ],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// 6. ArticleAffiliateRelation
export interface IArticleAffiliateRelation extends Document {
  article_id: mongoose.Types.ObjectId;
  affiliate_link_id: mongoose.Types.ObjectId;
  position_label: string;
}

const ArticleAffiliateRelationSchema = new Schema<IArticleAffiliateRelation>({
  article_id: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
  affiliate_link_id: { type: Schema.Types.ObjectId, ref: 'AffiliateLink', required: true },
  position_label: { type: String, default: 'top_cta' }
});

// 7. ClickLog
export interface IClickLog extends Document {
  article_id?: mongoose.Types.ObjectId;
  affiliate_link_id?: mongoose.Types.ObjectId;
  ip_address?: string;
  clicked_at: Date;
}

const ClickLogSchema = new Schema<IClickLog>({
  article_id: { type: Schema.Types.ObjectId, ref: 'Article' },
  affiliate_link_id: { type: Schema.Types.ObjectId, ref: 'AffiliateLink' },
  ip_address: { type: String },
  clicked_at: { type: Date, default: Date.now }
});

// 8. Subscriber
export interface ISubscriber extends Document {
  email: string;
  subscribed_at: Date;
}

const SubscriberSchema = new Schema<ISubscriber>({
  email: { type: String, required: true, unique: true },
  subscribed_at: { type: Date, default: Date.now }
});

// 9. Setting
export interface ISetting extends Document {
  site_title?: string;
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
  primary_color?: string;
  accent_color?: string;
  theme_mode?: string;
  font_family?: string;
  logo_url?: string;
  favicon_url?: string;
  banner_text?: string;
  footer_text?: string;
  custom_css?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_region_name?: string;
  geo_placename?: string;
  updated_at: Date;
}

const SettingSchema = new Schema<ISetting>({
  site_title: { type: String, default: 'AIDEALSUK' },
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
  primary_color: { type: String, default: '#0f172a' },
  accent_color: { type: String, default: '#f59e0b' },
  theme_mode: { type: String, default: 'dark' },
  font_family: { type: String, default: 'Inter' },
  logo_url: { type: String },
  favicon_url: { type: String },
  banner_text: { type: String },
  footer_text: { type: String },
  custom_css: { type: String },
  geo_latitude: { type: Number, default: 40.7128 },
  geo_longitude: { type: Number, default: -74.0060 },
  geo_region_name: { type: String, default: 'US-NY' },
  geo_placename: { type: String, default: 'New York' },
  updated_at: { type: Date, default: Date.now }
});

// Model Exports (preventing overwrite model errors in Next.js hot reload)
export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const CategoryModel: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const SubCategoryModel: Model<ISubCategory> = mongoose.models.SubCategory || mongoose.model<ISubCategory>('SubCategory', SubCategorySchema);
export const AffiliateLinkModel: Model<IAffiliateLink> = mongoose.models.AffiliateLink || mongoose.model<IAffiliateLink>('AffiliateLink', AffiliateLinkSchema);
export const ArticleModel: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);
export const ArticleAffiliateRelationModel: Model<IArticleAffiliateRelation> = mongoose.models.ArticleAffiliateRelation || mongoose.model<IArticleAffiliateRelation>('ArticleAffiliateRelation', ArticleAffiliateRelationSchema);
export const ClickLogModel: Model<IClickLog> = mongoose.models.ClickLog || mongoose.model<IClickLog>('ClickLog', ClickLogSchema);
export const SubscriberModel: Model<ISubscriber> = mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
export const SettingModel: Model<ISetting> = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
