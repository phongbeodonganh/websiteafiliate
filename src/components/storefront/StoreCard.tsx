import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StoreRecord } from "@/lib/stores/types";
import styles from "./stores.module.css";

export default function StoreCard({ store }: { store: StoreRecord }) {
  return <Link href={`/store/${store.slug}`} className={styles.card} data-motion="scale">
    <span className={styles.image}>
      {store.imageUrl ? (
        // Merchant images use the same upload/CDN sources as the product catalogue.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.imageUrl} alt={store.imageAlt || store.name} width="640" height="360" loading="lazy" decoding="async" />
      ) : <span className={styles.initials}>{store.name.slice(0, 2).toUpperCase()}</span>}
      <span className={styles.count}>{store.offers.length} active offer{store.offers.length === 1 ? "" : "s"}</span>
    </span>
    <span className={styles.copy}><strong>{store.name}</strong><span>{store.description}</span><small>View coupons & promo codes <ArrowRight size={14} aria-hidden="true" /></small></span>
  </Link>;
}
