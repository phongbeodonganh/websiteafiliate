import { connectToDatabase } from './mongodb';
import { ArticleModel } from './models';

// One-off cleanup for a Gemini AI content-generation bug: it sometimes leaked
// raw Markdown link syntax `[text](url)` into an <a href="..."> attribute
// instead of emitting clean HTML (e.g. href="/article/[https://aidealsuk.com]
// (https://aidealsuk.com)/article/some-other-slug"). Google then crawled these
// as real broken URLs, showing up as 404s in Search Console. The generation
// path is fixed in src/lib/sanitizer.ts + src/lib/gemini.ts; this script
// cleans up articles that were already saved with the bad markup.
//
// Usage:
//   npx tsx src/lib/db/fix-malformed-links.ts            (dry-run: report only)
//   npx tsx src/lib/db/fix-malformed-links.ts --apply     (write fixes to DB)

const hrefRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
const hasMarkdownArtifacts = (value: string) => /[[\]()]/.test(value);

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
  console.log(`Connected to MongoDB. Mode: ${apply ? 'APPLY (writing changes)' : 'DRY-RUN (report only)'}`);

  const articles = await ArticleModel.find({
    content: { $regex: /href=["'][^"']*[[\]()]/i },
  }).select('_id title slug content');

  if (articles.length === 0) {
    console.log('No articles with malformed links found. Nothing to do.');
    return;
  }

  console.log(`Found ${articles.length} article(s) with malformed links:\n`);

  for (const art of articles) {
    const doc = art.toObject();
    const { cleaned, changed } = cleanContent(doc.content);

    console.log(`- [${doc._id}] "${doc.title}" (/article/${doc.slug})`);

    if (!changed) {
      console.log('  (regex pre-filter matched but no href actually needed fixing, skipping)');
      continue;
    }

    if (apply) {
      await ArticleModel.updateOne({ _id: doc._id }, { $set: { content: cleaned } });
      console.log('  -> fixed and saved.');
    } else {
      console.log('  -> would fix (run with --apply to save).');
    }
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
