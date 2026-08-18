'use client';

import { ArrowRight, Clock, ShieldCheck, Sparkles, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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

const DISMISSED_AT_KEY_PREFIX = 'affiliate-recommendation-dismissed-at';
const SHOWN_THIS_SESSION_KEY_PREFIX = 'affiliate-recommendation-shown';
const LAST_SHOWN_AT_KEY = 'affiliate-recommendation-last-shown-at';
const DISMISS_FOR_MS = 24 * 60 * 60 * 1000;
const DISPLAY_COOLDOWN_MS = 60 * 1000;

export default function AffiliateRecommendationSheet({
  articleId,
  articleOffers,
}: AffiliateRecommendationSheetProps) {
  const [fallbackOffers, setFallbackOffers] = useState<AffiliateOffer[]>([]);
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const offers = articleOffers.length > 0 ? articleOffers : fallbackOffers;
  const dismissedAtKey = `${DISMISSED_AT_KEY_PREFIX}:${articleId}`;
  const shownThisSessionKey = `${SHOWN_THIS_SESSION_KEY_PREFIX}:${articleId}`;
  const dismiss = useCallback(() => {
    localStorage.setItem(dismissedAtKey, String(Date.now()));
    setOpen(false);
  }, [dismissedAtKey]);

  useEffect(() => {
    if (articleOffers.length > 0) return;
    const controller = new AbortController();
    fetch('/api/v1/public/top-picks', { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.status === 'success' && Array.isArray(payload.data)) {
          setFallbackOffers(payload.data.slice(0, 3));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [articleOffers.length]);

  useEffect(() => {
    if (offers.length === 0) return;

    const dismissedAt = Number(localStorage.getItem(dismissedAtKey) || 0);
    if (
      sessionStorage.getItem(shownThisSessionKey) === 'true' ||
      Date.now() - dismissedAt < DISMISS_FOR_MS
    ) return;

    let shown = false;
    let cooldownTimer: number | undefined;
    const show = () => {
      if (shown) return;
      shown = true;
      sessionStorage.setItem(shownThisSessionKey, 'true');
      localStorage.setItem(LAST_SHOWN_AT_KEY, String(Date.now()));
      setOpen(true);
      window.removeEventListener('scroll', handleScroll);
    };
    const showAfterCooldown = () => {
      const lastShownAt = Number(localStorage.getItem(LAST_SHOWN_AT_KEY) || 0);
      const remainingCooldown = DISPLAY_COOLDOWN_MS - (Date.now() - lastShownAt);
      if (remainingCooldown <= 0) {
        show();
        return;
      }
      window.removeEventListener('scroll', handleScroll);
      cooldownTimer = window.setTimeout(show, remainingCooldown);
    };
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= 0.4) {
        showAfterCooldown();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (cooldownTimer !== undefined) window.clearTimeout(cooldownTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [dismissedAtKey, offers.length, shownThisSessionKey]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismiss, open]);

  if (!open || offers.length === 0) return null;

  return (
    <div className="affiliate-sheet-backdrop fixed inset-0 z-[1200] bg-black/45" onMouseDown={dismiss}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="affiliate-sheet-title"
        className="affiliate-sheet-panel fixed inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto border-t-2 border-black bg-white p-5 text-black shadow-2xl sm:p-7 lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[410px] lg:border-l lg:border-t-0"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-200 pb-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-neutral-500">
              <Sparkles size={13} /> Partner offers
            </p>
            <h2 id="affiliate-sheet-title" className="text-xl font-bold uppercase text-black sm:text-2xl">
              {articleOffers.length > 0 ? 'Selected for this article' : 'Popular right now'}
            </h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={dismiss} aria-label="Close partner offers" className="grid h-10 w-10 shrink-0 place-items-center border border-neutral-300 bg-white text-black hover:border-black">
            <X size={19} />
          </button>
        </div>

        <div className="space-y-3">
          {offers.slice(0, 3).map((offer, index) => (
            <article key={offer.id} className="relative border border-neutral-300 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 bg-black px-2 py-1 text-[9px] font-bold uppercase text-white">
                  <Star size={10} fill="currentColor" /> Pick #{index + 1}
                </span>
                <span className="text-[9px] font-bold uppercase text-neutral-500">Sponsored</span>
              </div>
              <h3 className="mb-3 text-base font-bold text-black">{offer.name}</h3>
              <div className="mb-4 space-y-2 text-xs text-neutral-600">
                <p className="flex items-center gap-2"><ShieldCheck size={14} /> {offer.commission || 'Exclusive offer'}</p>
                <p className="flex items-center gap-2"><Clock size={14} /> {offer.cookie || '30-day cookie'}</p>
              </div>
              <a
                href={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${offer.id}`}
                target="_blank"
                rel="nofollow sponsored"
                className="affiliate-btn flex w-full items-center justify-between bg-black px-4 py-3 text-[10px] font-bold uppercase text-white"
              >
                View offer <ArrowRight size={14} />
              </a>
            </article>
          ))}
        </div>

        <p className="mt-5 text-[10px] leading-relaxed text-neutral-500">
          We may earn a commission when you use a partner link, at no extra cost to you.
        </p>
      </section>
    </div>
  );
}
