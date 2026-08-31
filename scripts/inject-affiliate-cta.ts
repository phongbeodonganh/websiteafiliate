import mongoose from 'mongoose';
import { connectToDatabase } from '../src/lib/db/mongodb';
import { ArticleModel, AffiliateLinkModel } from '../src/lib/db/models';

function buildCtaHtml(articleId: string, link: any, labelText: string) {
  return `
<div class="my-8 flex flex-col items-center justify-center p-6 bg-[#0056B3]/10 border border-[#0056B3]/30 rounded-2xl text-center">
  <p class="font-bold text-[#0056B3] text-lg mb-2">🔥 ${labelText} (${link.name}):</p>
  <p class="text-xs text-slate-500 mb-4">Commission: ${link.commission || 'Exclusive'} • Cookie: ${link.cookie || '30 Days'}</p>
  <a href="/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${link._id}" data-affiliate-id="${link._id}" data-article-id="${articleId}" class="affiliate-btn inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-200 bg-[#FF6B6B] hover:bg-[#ff5252] rounded-full hover:scale-105 shadow-md shadow-rose-500/20" rel="nofollow sponsored" target="_blank">
    👉 Claim Offer On ${link.name}
  </a>
</div>
`;
}

async function injectForArticle(slug: string, linkId: string) {
  const article = await ArticleModel.findOne({ slug });
  if (!article) {
    console.log(`Article not found: ${slug}`);
    return;
  }
  const link = await AffiliateLinkModel.findById(linkId);
  if (!link) {
    console.log(`Affiliate link not found: ${linkId}`);
    return;
  }

  const articleId = article._id.toString();

  if (article.content.includes('affiliate-btn') && article.content.includes(`affiliate_link_id=${linkId}`)) {
    console.log(`Skipping (CTA already present): ${slug}`);
    return;
  }

  const topCta = buildCtaHtml(articleId, link, 'Top Partner Deal');
  const middleCta = buildCtaHtml(articleId, link, 'Comparison Offer');

  // Insert top CTA right after the first paragraph, middle CTA before the "Verdict" section (fallback: append at end)
  let newContent = article.content;
  const firstParaEnd = newContent.indexOf('</p>');
  if (firstParaEnd !== -1) {
    newContent =
      newContent.slice(0, firstParaEnd + 4) + topCta + newContent.slice(firstParaEnd + 4);
  } else {
    newContent = topCta + newContent;
  }

  const verdictIdx = newContent.indexOf('<h2>Verdict</h2>');
  if (verdictIdx !== -1) {
    newContent = newContent.slice(0, verdictIdx) + middleCta + newContent.slice(verdictIdx);
  } else {
    newContent = newContent + middleCta;
  }

  article.content = newContent;
  article.affiliate_placements = [
    { affiliate_link_id: link._id, position_label: 'top_cta' } as any,
    { affiliate_link_id: link._id, position_label: 'middle' } as any,
  ];
  await article.save();
  console.log(`Injected CTA into: ${slug}`);
}

async function main() {
  await connectToDatabase();

  await injectForArticle('cursor-ai-code-editor-review-2026', '6a71b7551827086f47552b41');
  await injectForArticle('elevenlabs-voice-ai-review-2026', '6a71b7551827086f47552b40');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.connection.close());
