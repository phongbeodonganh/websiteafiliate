"use client";

import { useEffect, useState } from "react";
import CouponAction from "@/components/marketplace/CouponAction";
import { isOfferActive, type StoreOffer } from "@/lib/stores/types";
import styles from "./stores.module.css";

const date = (value: string) => new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export default function StoreOffers({ offers, destination }: { offers: StoreOffer[]; destination: string }) {
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState<number | null>(null);
  // The server already filters eligibility. Reuse that initial list for
  // hydration, then hide coupons that expire while this page remains open.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  const active = offers.filter((offer) => now === null || isOfferActive(offer, now));
  const visible = active.filter((offer) => filter === "all" || offer.kind === filter);
  return <>
    <div className={styles.filters} aria-label="Filter store offers">
      {[["all", "All offers"], ["code", "Promo codes"], ["coupon", "Coupons & deals"]].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} ({key === "all" ? active.length : active.filter((offer) => offer.kind === key).length})</button>)}
    </div>
    {visible.length ? <div className={styles.offers}>{visible.map((offer) => <article className={styles.offer} key={offer.id}>
      <span className={styles.saving}>{offer.saving || (offer.kind === "code" ? "Promo code" : "Store offer")}</span>
      <h3>{offer.title}</h3><p>{offer.description}</p>
      {offer.terms && <details className={styles.terms}><summary>Conditions & exclusions</summary><p>{offer.terms}</p></details>}
      <div className={styles.actionRow}>{offer.kind === "code" && <code>{offer.code}</code>}<CouponAction code={offer.kind === "code" ? offer.code : undefined} href={offer.destination || destination} className={styles.action} /></div>
      <div className={styles.offerFooter}><span>{offer.checkedAt ? `Checked ${date(offer.checkedAt)}` : "Not yet checkout-tested"}</span>{offer.expiresAt && <span>Expires {date(offer.expiresAt)} (UTC)</span>}</div>
    </article>)}</div> : <p className={styles.notice}>{filter === "all" ? "There are no active offers right now. Check back for new coupons and promo codes." : "No active offers in this category. Choose another filter."}</p>}
  </>;
}
