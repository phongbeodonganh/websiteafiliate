import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Table: users
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'author'] }).notNull().default('author'),
  name: text('name'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  avatar: text('avatar'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: categories (Category Level 1)
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: sub_categories (Category Level 2)
export const subCategories = sqliteTable('sub_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: articles
export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  subCategoryId: integer('sub_category_id').references(() => subCategories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  revenue: real('revenue').notNull().default(0),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: affiliate_links (Admin managed base links)
export const affiliateLinks = sqliteTable('affiliate_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  commission: text('commission'),
  cookie: text('cookie'),
  isTopPick: integer('is_top_pick', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: article_affiliate_relations
export const articleAffiliateRelations = sqliteTable('article_affiliate_relations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  affiliateLinkId: integer('affiliate_link_id').notNull().references(() => affiliateLinks.id, { onDelete: 'cascade' }),
  positionLabel: text('position_label').notNull().default('top_cta'),
});

// Table: click_logs
export const clickLogs = sqliteTable('click_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'set null' }),
  affiliateLinkId: integer('affiliate_link_id').references(() => affiliateLinks.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  clickedAt: text('clicked_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: subscribers (Lead Capture Newsletter Box)
export const subscribers = sqliteTable('subscribers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  subscribedAt: text('subscribed_at').default(sql`CURRENT_TIMESTAMP`),
});

// Table: settings (Global System, UI Theme, SEO & GEO)
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  siteTitle: text('site_title').default('NEXUS FINANCE GLOBAL'),
  metaDescription: text('meta_description'),
  focusKeywords: text('focus_keywords'),
  canonicalUrl: text('canonical_url'),
  hreflang: text('hreflang').default('en-US'),
  geoTarget: text('geo_target').default('GLOBAL'),
  businessName: text('business_name'),
  businessAddress: text('business_address'),
  businessPhone: text('business_phone'),
  ogImageUrl: text('og_image_url'),
  schemaJsonld: text('schema_jsonld'),
  headScripts: text('head_scripts'),
  // UI Theme & Branding Settings
  primaryColor: text('primary_color').default('#0f172a'),
  accentColor: text('accent_color').default('#f59e0b'),
  themeMode: text('theme_mode').default('dark'),
  fontFamily: text('font_family').default('Inter'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  bannerText: text('banner_text'),
  footerText: text('footer_text'),
  customCss: text('custom_css'),
  // Enhanced GEO Fields
  geoLatitude: real('geo_latitude').default(40.7128),
  geoLongitude: real('geo_longitude').default(-74.0060),
  geoRegionName: text('geo_region_name').default('US-NY'),
  geoPlacename: text('geo_placename').default('New York'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// TypeScript Types
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type SubCategory = typeof subCategories.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type ArticleAffiliateRelation = typeof articleAffiliateRelations.$inferSelect;
export type ClickLog = typeof clickLogs.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Setting = typeof settings.$inferSelect;
