import Link from "next/link";
import { BadgeCheck, CalendarCheck2, ShieldCheck } from "lucide-react";
import type { MarketplaceDeal, MarketplaceStore } from "@/lib/marketplace";
import { getStore } from "@/lib/marketplace";
import CouponAction from "./CouponAction";
import styles from "./CouponDealCard.module.css";

const money = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);

export default function CouponDealCard({ deal, compact = false, store: suppliedStore }: { deal: MarketplaceDeal; compact?: boolean; store?: MarketplaceStore }) {
  const store = suppliedStore || getStore(deal.storeSlug);
  if (!store) return null;

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`} data-motion="rise">
      <div className={styles.storeLine}>
        <Link href={`/store/${store.slug}`} className={styles.storeMark} style={{ "--store-accent": store.accent } as React.CSSProperties}>{store.initials}</Link>
        <div><Link href={`/store/${store.slug}`}>{store.name}</Link><span><BadgeCheck aria-hidden="true" /> {store.managed ? "Store offers" : "Verified store"}</span></div>
        {!deal.imageUrl && <strong>{deal.saving}</strong>}
      </div>
      {deal.imageUrl && <Link href={`/store/${store.slug}`} className={styles.dealImage} aria-label={`View ${deal.title} at ${store.name}`}>
        {/* Demo and merchant images can be served by remote CDNs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={deal.imageUrl} alt={deal.imageAlt || deal.title} width="720" height="420" loading="lazy" decoding="async" />
        <span>{deal.saving}</span>
      </Link>}
      <div className={styles.body}>
        <h3><Link href={`/store/${store.slug}`}>{deal.title}</Link></h3>
        <p>{deal.description}</p>
        {deal.terms && <details className={styles.terms}><summary>Conditions & exclusions</summary><p>{deal.terms}</p></details>}
        {deal.expiresAt && <p>Expires {new Date(deal.expiresAt).toLocaleDateString("en-GB", { timeZone: "UTC" })} (UTC)</p>}
        {(deal.salePrice || deal.originalPrice) && (
          <div className={styles.price}>{deal.salePrice && <strong>{money(deal.salePrice)}</strong>}{deal.originalPrice && <del>{money(deal.originalPrice)}</del>}</div>
        )}
        <div className={styles.codeRow}>
          <span className={styles.code}>{deal.code || "Applied automatically"}</span>
          <CouponAction code={deal.code} href={deal.destination || store.destination} className={styles.action} />
        </div>
      </div>
      <footer className={styles.verified}>
        <span><CalendarCheck2 aria-hidden="true" /> {deal.retestedAt ? `Re-tested ${deal.retestedAt}` : `Published ${deal.publishedAt}`}</span>
        <span><ShieldCheck aria-hidden="true" /> {deal.retestedAt ? "Checkout checked" : "Not yet checkout-tested"}</span>
      </footer>
    </article>
  );
}
