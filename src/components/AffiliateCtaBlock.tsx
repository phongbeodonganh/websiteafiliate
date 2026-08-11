interface AffiliateCtaLink {
  id: string;
  name: string;
  commission?: string;
  cookie?: string;
}

interface AffiliateCtaBlockProps {
  articleId: string;
  link: AffiliateCtaLink;
  positionLabel: string;
}

const POSITION_LABELS: Record<string, string> = {
  top_cta: 'Top Partner Deal',
  middle: 'Comparison Offer',
  middle_comparison: 'Comparison Offer',
  footer_banner: 'Special Offer',
};

export default function AffiliateCtaBlock({ articleId, link, positionLabel }: AffiliateCtaBlockProps) {
  const labelText = POSITION_LABELS[positionLabel] || 'Recommended Offer';

  return (
    <div className="my-8 flex flex-col items-center justify-center p-6 bg-[#0056B3]/10 border border-[#0056B3]/30 rounded-2xl text-center">
      <p className="font-bold text-[#0056B3] text-lg mb-2">🔥 {labelText} ({link.name}):</p>
      <p className="text-xs text-slate-500 mb-4">
        Commission: {link.commission || 'Exclusive'} • Cookie: {link.cookie || '30 Days'}
      </p>
      <a
        href={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${link.id}`}
        data-affiliate-id={link.id}
        data-article-id={articleId}
        className="affiliate-btn inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-200 bg-[#FF6B6B] hover:bg-[#ff5252] rounded-full hover:scale-105 shadow-md shadow-rose-500/20"
        rel="nofollow sponsored"
        target="_blank"
      >
        👉 Claim Offer On {link.name}
      </a>
    </div>
  );
}
