import React from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Star } from 'lucide-react';

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
  top_cta: 'Top Pick',
  middle: 'Featured Deal',
  middle_comparison: 'Partner Offer',
  footer_banner: 'Special Deal',
};

export default function AffiliateCtaBlock({ articleId, link, positionLabel, variant = 'editorial' }: AffiliateCtaBlockProps) {
  const labelText = POSITION_LABELS[positionLabel] || 'Editor Pick';

  return (
    <div className="group relative flex flex-col justify-between border border-neutral-300 bg-white p-5">
      {/* Top Tag & Rating */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="bg-black text-white text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5">
            {labelText}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 uppercase tracking-wider">
            <CheckCircle2 size={11} className="text-black" /> Verified
          </span>
        </div>

        {/* Offer Title */}
        <h4 className="text-base font-bold text-black m-0 mb-1 leading-snug font-['Plus_Jakarta_Sans'] group-hover:underline">
          {link.name}
        </h4>

        {/* Rating Stars */}
        <div className="flex items-center gap-1 mb-3 text-amber-500">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={11} fill="currentColor" />
          ))}
          <span className="text-[11px] font-bold text-neutral-500 ml-1">5.0</span>
        </div>

        {/* Benefits / Deal Specs */}
        <div className="border-t border-b border-neutral-100 py-2.5 mb-4 space-y-1 text-xs text-neutral-600">
          <div className="flex items-center justify-between">
            <span>Commission:</span>
            <strong className="text-black font-bold">{link.commission || 'Up to 50% Off'}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Guarantee:</span>
            <strong className="text-black font-semibold">{link.cookie || '30-Day Cookie'}</strong>
          </div>
        </div>
      </div>

      {/* High-Converting Black Button */}
      <a
        href={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${link.id}`}
        className="affiliate-btn w-full inline-flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider py-3 transition-colors text-center"
        rel="nofollow sponsored"
        target="_blank"
      >
        Claim Offer <ArrowRight size={13} />
      </a>
    </div>
  );
}
