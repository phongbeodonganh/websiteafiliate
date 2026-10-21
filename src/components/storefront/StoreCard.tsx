import Link from "next/link";
import { ArrowUpRight, TicketPercent } from "lucide-react";
import type { StoreRecord } from "@/lib/stores/types";
import { storeOfferCounts } from "@/lib/stores/discovery";
import { getStore } from "@/lib/marketplace";
import styles from "./stores.module.css";

export default function StoreCard({ store, compact = false }: { store: StoreRecord; compact?: boolean }) {
  const counts = storeOfferCounts(store);
  return <Link href={`/store/${store.slug}`} className={`${styles.card} ${compact ? styles.compact : ""}`} style={{ "--store-accent": getStore(store.slug)?.accent || "#0d766e" } as React.CSSProperties}>
    <span className={styles.image}>
      {store.imageUrl ? (
        // Merchant images use the same upload/CDN sources as the product catalogue.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.imageUrl} alt={store.imageAlt || `${store.name} store`} width="96" height="72" loading="lazy" decoding="async" />
      ) : <span className={styles.initials}>{store.name.slice(0, 2).toUpperCase()}</span>}
      <ArrowUpRight size={17} className={styles.cornerArrow} aria-hidden="true" />
    </span>
    <span className={styles.copy}>
      <strong>{store.name}</strong>
      {!compact && <span className={styles.description}>{store.description}</span>}
      <span className={styles.offerCount}><TicketPercent size={16} aria-hidden="true" /><b>{counts.total}</b><span>active coupons<br />&amp; promo codes</span></span>
      <span className={styles.cardCta}>Explore store <ArrowUpRight size={16} aria-hidden="true" /></span>
    </span>
  </Link>;
}
