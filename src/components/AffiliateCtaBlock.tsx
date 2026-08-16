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
  variant?: 'default' | 'editorial';
}

const POSITION_LABELS: Record<string, string> = {
  top_cta: 'Top Partner Deal',
  middle: 'Comparison Offer',
  middle_comparison: 'Comparison Offer',
  footer_banner: 'Special Offer',
};

export default function AffiliateCtaBlock({ articleId, link, positionLabel, variant = 'default' }: AffiliateCtaBlockProps) {
  const labelText = POSITION_LABELS[positionLabel] || 'Recommended Offer';
  const editorial = variant === 'editorial';

  return (
    <div className={editorial
      ? 'my-5 flex flex-col items-center justify-center border border-black bg-white p-6 text-center'
      : 'my-8 flex flex-col items-center justify-center rounded-2xl border border-[#0056B3]/30 bg-[#0056B3]/10 p-6 text-center'}>
      <p className={editorial ? 'mb-2 text-lg font-bold text-black' : 'mb-2 text-lg font-bold text-[#0056B3]'}>
        {labelText} ({link.name})
      </p>
      <p className={editorial ? 'mb-4 text-xs text-neutral-600' : 'mb-4 text-xs text-slate-500'}>
        Commission: {link.commission || 'Exclusive'} · Cookie: {link.cookie || '30 Days'}
      </p>
      <a
        href={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${link.id}`}
        data-affiliate-id={link.id}
        data-article-id={articleId}
        className={editorial
          ? 'affiliate-btn inline-flex items-center justify-center border border-black bg-black px-8 py-3.5 text-sm font-bold text-white transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]'
          : 'affiliate-btn inline-flex items-center justify-center rounded-full bg-[#FF6B6B] px-8 py-3.5 font-bold text-white shadow-md shadow-rose-500/20 transition-all duration-200 hover:scale-105 hover:bg-[#ff5252]'}
        rel="nofollow sponsored"
        target="_blank"
      >
        Claim Offer On {link.name}
      </a>
    </div>
  );
}
