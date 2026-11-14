'use client';

import { ArrowRight, Clock, ShieldCheck, Star, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type AffiliateOffer = {
  id: string;
  name: string;
  commission?: string;
  cookie?: string;
};

type AffiliateRecommendationSheetProps = {
  articleId: string;
  articleOffers: AffiliateOffer[];
};

function uniqueOffers(offers: AffiliateOffer[]) {
  return Array.from(new Map(offers.map((offer) => [offer.id, offer])).values());
}

export default function AffiliateRecommendationSheet({
  articleId,
  articleOffers,
}: AffiliateRecommendationSheetProps) {
  const [fallbackOffers, setFallbackOffers] = useState<AffiliateOffer[]>([]);
  const [open, setOpen] = useState(articleOffers.length > 0);
  const offers = uniqueOffers(articleOffers.length > 0 ? articleOffers : fallbackOffers);
  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (articleOffers.length > 0) return;
    const controller = new AbortController();
    fetch('/api/v1/public/top-picks', { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.status === 'success' && Array.isArray(payload.data)) {
          setFallbackOffers(payload.data.slice(0, 3));
          setOpen(payload.data.length > 0);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [articleOffers.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismiss, open]);

  if (offers.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-controls="affiliate-recommendation-sheet"
        aria-expanded="false"
        className="fixed bottom-[68px] right-4 z-[1200] inline-flex items-center gap-2 border border-black bg-black px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-xl transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black min-[821px]:bottom-5 min-[821px]:right-5"
      >
        <Star size={13} fill="currentColor" /> Offers
      </button>
    );
  }

  return (
    <section
      id="affiliate-recommendation-sheet"
      role="dialog"
      aria-label="Partner offers"
      className="affiliate-sheet-panel fixed inset-x-4 bottom-4 z-[1200] max-h-[calc(100dvh-32px)] overflow-y-auto border border-neutral-300 border-t-2 border-t-black bg-white p-4 text-black shadow-2xl sm:inset-x-5 sm:bottom-5 sm:max-h-[calc(100dvh-40px)] lg:p-5"
    >
      <button type="button" onClick={dismiss} aria-label="Close partner offers" className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center border border-neutral-300 bg-white text-black shadow-sm transition-colors hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
        <X size={18} />
      </button>

      <div className="affiliate-offers-track flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 pr-10 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 lg:pr-11">
        {offers.slice(0, 3).map((offer, index) => (
          <article key={offer.id} className="relative flex min-w-[85%] snap-start flex-col border border-neutral-300 bg-white p-3 sm:min-w-[48%] lg:min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1 bg-black px-2 py-1 text-[9px] font-bold uppercase text-white">
                <Star size={10} fill="currentColor" /> Pick #{index + 1}
              </span>
              <span className="text-[9px] font-bold uppercase text-neutral-500">Sponsored</span>
            </div>
            <h3 className="mb-2 text-sm font-bold text-black sm:text-base">{offer.name}</h3>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
              <p className="flex items-center gap-2"><ShieldCheck size={14} /> {offer.commission || 'Exclusive offer'}</p>
              <p className="flex items-center gap-2"><Clock size={14} /> {offer.cookie || '30-day cookie'}</p>
            </div>
            <a
              href={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${offer.id}`}
              target="_blank"
              rel="nofollow sponsored"
              className="affiliate-btn mt-auto flex w-full items-center justify-between bg-black px-3 py-2.5 text-[10px] font-bold uppercase text-white"
            >
              View offer <ArrowRight size={14} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
