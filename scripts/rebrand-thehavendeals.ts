import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectToDatabase } from '../src/lib/db/mongodb';
import { BRAND_NAME, BRAND_LOGO, BRAND_ICON, BRAND_COLORS } from '../src/lib/brand';

// Dry-run by default. This migration changes branding fields, never slugs, retailer links, credentials or contact addresses.
const apply = process.argv.includes('--apply');
const rename = (value: string) => value.replace(/GoodPick|GOODPICK/g, BRAND_NAME);
const fields: Record<string, string[]> = {
  settings: ['site_title', 'metaDescription', 'footer_text', 'banner_text', 'businessName', 'schemaJsonld'],
  articles: ['title', 'excerpt', 'content', 'meta_title', 'meta_description'],
  users: ['full_name', 'bio'],
  stores: ['description', 'content'],
};
async function main() {
  await connectToDatabase();
  const changes: { collection: string; id: mongoose.Types.ObjectId; before: Record<string, unknown>; after: Record<string, unknown> }[] = [];
  for (const [collection, keys] of Object.entries(fields)) {
    const docs = await mongoose.connection.collection(collection).find({}, { projection: Object.fromEntries(keys.map(key => [key, 1])) }).toArray();
    for (const doc of docs) {
      const after: Record<string, unknown> = {};
      for (const key of keys) {
        if (typeof doc[key] === 'string' && rename(doc[key]) !== doc[key]) after[key] = rename(doc[key]);
      }
      if (collection === 'settings') {
        Object.assign(after, { site_title: BRAND_NAME, logo_url: BRAND_LOGO, favicon_url: BRAND_ICON, primary_color: BRAND_COLORS.green, accent_color: BRAND_COLORS.gold });
      }
      if (!Object.keys(after).length) continue;
      const before: Record<string, unknown> = {};
      const original = await mongoose.connection.collection(collection).findOne({ _id: doc._id }, { projection: Object.fromEntries(Object.keys(after).map(key => [key, 1])) });
      for (const key of Object.keys(after)) before[key] = original?.[key] ?? null;
      changes.push({ collection, id: doc._id, before, after });
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', changes: changes.map(change => ({ collection: change.collection, fields: Object.keys(change.after) })) }));
  if (!apply || !changes.length) return;
  const backupPath = `/tmp/thehavendeals-brand-backup-${Date.now()}.json`;
  await fs.writeFile(backupPath, JSON.stringify(changes, null, 2), { mode: 0o600 });
  for (const change of changes) {
    await mongoose.connection.collection(change.collection).updateOne({ _id: change.id }, { $set: change.after });
  }
  console.log(`Updated ${changes.length} records. Reversible branding backup: ${backupPath}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Branding migration failed'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
