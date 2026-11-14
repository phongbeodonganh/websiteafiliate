import { connectToDatabase } from './mongodb';
import { ArticleModel } from './models';

// One-off cleanup for a Gemini AI content-generation bug: it sometimes leaked
// raw Markdown link syntax `[text](url)` into an <a href="..."> attribute
// instead of emitting clean HTML (e.g. href="/article/[https://aidealsuk.com]
// (https://aidealsuk.com)/article/some-other-slug"). Google then crawled these
// as real broken URLs, showing up as 404s in Search Console. The generation
// path is fixed in src/lib/sanitizer.ts + src/lib/gemini.ts; this script finds
// and cleans up articles that were already saved with the bad markup.
//
// A first run of a narrower version of this script (regex-filtered on
// `content` only, via a MongoDB $regex query) found nothing, even though the
// broken URL still 404s live on the site. So this version instead pulls every
// article and checks EVERY text field in plain JS (no Mongo regex, no
// assumptions about which field holds it), to find where the markdown
// artifact actually lives.
//
// Usage:
//   npx tsx src/lib/db/fix-malformed-links.ts            (scan + dry-run report only)
//   npx tsx src/lib/db/fix-malformed-links.ts --apply     (write fixes to DB, content field only)

const hrefRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
const hasMarkdownArtifacts = (value: string) => /[[\]()]/.test(value);

// Fields worth scanning for a leaked `[text](url)` fragment.
const SCAN_FIELDS = ['content', 'slug', 'title', 'meta_title', 'meta_description', 'excerpt', 'focus_keyword'] as const;

function cleanContent(html: string): { cleaned: string; changed: boolean } {
  let changed = false;
  const cleaned = html.replace(hrefRegex, (match, prefix, href, suffix) => {
    if (hasMarkdownArtifacts(href)) {
      changed = true;
      return `<a ${prefix}href="#" ${suffix}>`;
    }
    return match;
  });
  return { cleaned, changed };
}

async function run() {
  const apply = process.argv.includes('--apply');

  await connectToDatabase();
  console.log(`Connected to MongoDB. Mode: ${apply ? 'APPLY (writing content fixes)' : 'SCAN (report only)'}`);

  const allArticles = await ArticleModel.find({}).select(
    '_id title slug content meta_title meta_description excerpt focus_keyword'
  );

  console.log(`Scanning ${allArticles.length} article(s) across fields: ${SCAN_FIELDS.join(', ')}\n`);

  let hitCount = 0;

  for (const art of allArticles) {
    const doc = art.toObject() as Record<string, any>;
    const hits: string[] = [];

    for (const field of SCAN_FIELDS) {
      const value = doc[field];
      if (typeof value === 'string' && /\]\(/.test(value)) {
        hits.push(field);
      }
    }

    if (hits.length === 0) continue;

    hitCount++;
    console.log(`- [${doc._id}] "${doc.title}" (/article/${doc.slug})`);
    console.log(`  Markdown-link artifact found in field(s): ${hits.join(', ')}`);

    for (const field of hits) {
      const value = String(doc[field]);
      const idx = value.indexOf('](');
      const snippetStart = Math.max(0, idx - 40);
      const snippet = value.slice(snippetStart, idx + 60);
      console.log(`    ${field}: ...${snippet}...`);
    }

    if (hits.includes('content')) {
      const { cleaned, changed } = cleanContent(doc.content);
      if (changed) {
        if (apply) {
          await ArticleModel.updateOne({ _id: doc._id }, { $set: { content: cleaned } });
          console.log('    -> content href fixed and saved.');
        } else {
          console.log('    -> content href would be fixed (run with --apply to save).');
        }
      } else {
        console.log('    -> "](" found in content but not inside an href attribute — needs manual review.');
      }
    }

    if (hits.some((f) => f !== 'content')) {
      console.log('    -> non-content field affected; this script does not auto-fix title/slug/meta fields, edit manually in admin.');
    }

    console.log('');
  }

  if (hitCount === 0) {
    console.log('No markdown-link artifacts found in any scanned field on any article.');
    console.log('The broken URL is live (confirmed via curl), so it likely lives outside the Article collection —');
    console.log('check Category, Setting (e.g. schemaJsonld/headScripts), or the insider digest templates next.');
  }

  console.log('\nDone.');
}

if (typeof require !== 'undefined' && require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to run fix-malformed-links:', err);
      process.exit(1);
    });
}
