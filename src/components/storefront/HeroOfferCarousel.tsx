"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, TicketPercent } from "lucide-react";
import type { HomepageDeal } from "@/lib/homepage/deals";
import { isOfferActive } from "@/lib/stores/types";
import DealStoreImage from "./DealStoreImage";
import styles from "./homepage-discovery.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function HeroOfferCarousel({ deals, storeCount, initialNow }: {
  deals: HomepageDeal[]; storeCount: number; initialNow: number;
}) {
  const frame = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [now, setNow] = useState(initialNow);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const offers = deals.filter((deal) => isOfferActive(deal, now));
  const current = index % Math.max(offers.length, 1);
  const deal = offers[current];
  const rotating = inView && !focused && !reducedMotion && visible && !hovered && offers.length > 1;

  useEffect(() => {
    if (!frame.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  return <aside ref={frame} className={styles.heroFeature} aria-label="Featured coupons and deals" aria-roledescription="carousel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <span className={styles.featureLabel}><TicketPercent size={16} aria-hidden="true" /> From the offer shelf</span>
    <div className={styles.heroSlides} aria-live={rotating ? "off" : "polite"} aria-atomic="true">
      {deal && <div key={deal.id} className={styles.heroSlide} data-active="true"
        role="group" aria-roledescription="slide" aria-label={`${current + 1} of ${offers.length}`}>
        <div className={styles.heroMerchant}>
          <DealStoreImage src={deal.storeImageUrl} alt={deal.storeImageAlt} name={deal.storeName} compact eager />
          <p>{deal.storeName}<span>{deal.kind === "code" ? "Promo code" : "Coupon / deal"}</span></p>
        </div>
        <span className={styles.featureSaving} title={deal.saving}>{deal.saving || "Discover more"}</span>
        <h2 title={deal.title}>{deal.title}</h2>
        <Link href={`/store/${deal.storeSlug}`}>See offer & conditions <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>}
      {!offers.length && <div className={styles.heroSlide} data-active="true"><span className={styles.featureSaving}>More good buys.</span><p>Explore stores for the latest available offers.</p><Link href="/stores">Browse stores <ArrowRight size={17} aria-hidden="true" /></Link></div>}
    </div>
    {offers.length > 1 && !reducedMotion && <div className={styles.heroOfferProgress} aria-hidden="true">
      <span key={index} className={styles.heroOfferProgressFill} data-running={rotating}
        onAnimationEnd={() => setIndex((value) => value + 1)} />
    </div>}
    <div className={styles.heroStats}><span><strong>{storeCount}</strong> stores to explore</span><span><strong>{offers.length}</strong> active offers</span></div>
  </aside>;
}
