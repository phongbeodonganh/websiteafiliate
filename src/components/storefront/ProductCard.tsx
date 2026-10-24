import Link from "next/link";
import { ArrowRight, BadgeCheck, RefreshCw, Store } from "lucide-react";
import type { StorefrontProduct } from "@/lib/products/public";
import styles from "./storefront.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function ProductCard({ product }: { product: StorefrontProduct }) {
  const checkedAt = new Date(product.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const bestFor = product.highlights[0] || product.pros[0] || "Everyday use";
  const retailerCount = product.offers.length || 1;

  return (
    <article className={styles.productCard} data-motion="scale">
      <Link href={`/products/${product.slug}`} className={styles.productImageLink} aria-label={`View ${product.name}`}>
        {product.images[0]?.url ? (
          // Product images can come from admin-configured retailer CDNs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0].url} alt={product.images[0].alt || product.name} width="640" height="640" loading="lazy" decoding="async" />
        ) : <span className={styles.imagePlaceholder}>TH</span>}
        {product.discountPercent > 0 && <span className={styles.discountTag}>Save {product.discountPercent}%</span>}
        {product.trust.authentic && <span className={styles.verifiedTag}><BadgeCheck size={13} /> Details checked</span>}
      </Link>
      <div className={styles.productBody}>
        <p className={styles.productKicker}>{product.category || "TheHavenDeals selection"}{product.brand ? ` · ${product.brand}` : ""}</p>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <div className={styles.passport}>
          <span className={styles.passportLabel}><BadgeCheck size={13} /> Product passport</span>
          <div><span>Best for</span><strong>{bestFor}</strong></div>
          <div className={styles.passportMeta}>
            <span><RefreshCw size={12} /> Checked {checkedAt}</span>
            <span><Store size={12} /> {retailerCount} retailer{retailerCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <p className={styles.productDescription}>{product.shortDescription}</p>
        <div className={styles.priceRow}>
          <div><span>From</span><strong>{money(product.price)}</strong>{product.originalPrice && <del>{money(product.originalPrice)}</del>}</div>
          <Link href={`/products/${product.slug}`} aria-label={`Compare offers for ${product.name}`}>Compare <ArrowRight size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
