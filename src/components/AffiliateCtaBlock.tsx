import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface AffiliateCtaLink {
  id: string;
  name: string;
  description?: string;
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

/**
 * Redesigned affiliate CTA block — editorial style.
 *
 * Changes from previous version:
 * - Removed fake 5/5 star ratings (broke trust)
 * - Uses the same typographic language as article content
 * - "Verified" badge replaced with specific claim ("Tested by our team")
 * - CTA uses verdict-cta class with shimmer hover effect
 */
export default function AffiliateCtaBlock({ articleId, link, positionLabel }: AffiliateCtaBlockProps) {
  const labelText = POSITION_LABELS[positionLabel] || 'Editor Pick';
  const trackingUrl = `/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${link.id}`;

  return (
    <div className="clickable-card group relative flex cursor-pointer flex-col justify-between border border-[#E2E2DE] bg-white p-5" data-motion="scale">
      <a
        href={trackingUrl}
        className="card-stretched-link"
        rel="nofollow sponsored"
        target="_blank"
        aria-label={`View deal for ${link.name}`}
      />

      {/* Top: Label + Trust indicator */}
      <div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 mb-3">
          <span className="bg-black text-white text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5">
            {labelText}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ed-verdict)' }}>
            <CheckCircle2 size={11} /> Tested
          </span>
        </div>

        {/* Tool name */}
        <h4 className="text-base font-bold text-black m-0 mb-1 leading-snug font-['Plus_Jakarta_Sans'] group-hover:underline">
          {link.name}
        </h4>

        {link.description && <p className="mb-4 text-sm leading-relaxed text-neutral-600 break-words">{link.description}</p>}
      </div>

      {/* CTA with shimmer effect */}
      <a
        href={trackingUrl}
        className="verdict-cta w-full justify-center"
        rel="nofollow sponsored"
        target="_blank"
      >
        View deal <ArrowRight size={13} className="cta-arrow" />
      </a>
    </div>
  );
}
