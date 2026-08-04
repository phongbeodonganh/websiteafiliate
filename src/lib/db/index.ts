import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sqlite.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export function initDb() {
  try { sqlite.exec(`ALTER TABLE affiliate_links ADD COLUMN is_top_pick INTEGER DEFAULT 0;`); } catch {}
  try { sqlite.exec(`ALTER TABLE categories ADD COLUMN description TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE categories ADD COLUMN meta_title TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE categories ADD COLUMN meta_description TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE sub_categories ADD COLUMN description TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE sub_categories ADD COLUMN meta_title TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE sub_categories ADD COLUMN meta_description TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN primary_color TEXT DEFAULT '#0f172a';`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN accent_color TEXT DEFAULT '#f59e0b';`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN theme_mode TEXT DEFAULT 'dark';`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN font_family TEXT DEFAULT 'Inter';`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN logo_url TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN favicon_url TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN banner_text TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN footer_text TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN custom_css TEXT;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN geo_latitude REAL DEFAULT 40.7128;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN geo_longitude REAL DEFAULT -74.0060;`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN geo_region_name TEXT DEFAULT 'US-NY';`); } catch {}
  try { sqlite.exec(`ALTER TABLE settings ADD COLUMN geo_placename TEXT DEFAULT 'New York';`); } catch {}

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'editor', 'author')) NOT NULL DEFAULT 'author',
      name TEXT,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sub_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sub_category_id INTEGER REFERENCES sub_categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL,
      status TEXT CHECK(status IN ('draft', 'published')) NOT NULL DEFAULT 'draft',
      is_featured INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      meta_title TEXT,
      meta_description TEXT,
      thumbnail_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS affiliate_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      commission TEXT,
      cookie TEXT,
      is_top_pick INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS article_affiliate_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      affiliate_link_id INTEGER NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
      position_label TEXT NOT NULL DEFAULT 'top_cta'
    );

    CREATE TABLE IF NOT EXISTS click_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
      affiliate_link_id INTEGER REFERENCES affiliate_links(id) ON DELETE SET NULL,
      ip_address TEXT,
      clicked_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      site_title TEXT DEFAULT 'NEXUS FINANCE GLOBAL',
      metaDescription TEXT,
      focusKeywords TEXT,
      canonicalUrl TEXT,
      hreflang TEXT DEFAULT 'en-US',
      geoTarget TEXT DEFAULT 'GLOBAL',
      businessName TEXT,
      businessAddress TEXT,
      businessPhone TEXT,
      ogImageUrl TEXT,
      schemaJsonld TEXT,
      headScripts TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDb();
