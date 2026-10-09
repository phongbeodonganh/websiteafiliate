import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import type { StorefrontProduct } from "@/lib/products/public";
import styles from "./storefront.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "USD" }).format(value);

export default function ProductCard({ product }: { product: StorefrontProduct }) {
  return (
    <article className={styles.productCard} data-motion="scale">
      <Link href={`/products/${product.slug}`} className={styles.productImageLink} aria-label={`Xem ${product.name}`}>
        {product.images[0]?.url ? (
          // Product images can come from admin-configured retailer CDNs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            width="640"
            height="640"
            loading="lazy"
            decoding="async"
          />
        ) : <span className={styles.imagePlaceholder}>GP</span>}
        {product.discountPercent > 0 && <span className={styles.discountTag}>Giảm {product.discountPercent}%</span>}
        {product.trust.authentic && <span className={styles.verifiedTag}><BadgeCheck size={13} /> Đã kiểm tra</span>}
      </Link>
      <div className={styles.productBody}>
        <p className={styles.productKicker}>{product.category || "GoodPick đề xuất"}{product.brand ? ` · ${product.brand}` : ""}</p>
        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        <div className={styles.ratingRow} aria-label={`${product.rating} trên 5 sao`}>
          <Star size={15} fill="currentColor" />
          <strong>{product.rating ? product.rating.toFixed(1) : "Được đề xuất"}</strong>
          {product.ratingCount > 0 && <span>({product.ratingCount.toLocaleString("vi-VN")})</span>}
        </div>
        <p className={styles.productDescription}>{product.shortDescription}</p>
        <div className={styles.priceRow}>
          <div><span>Giá từ</span><strong>{money(product.price)}</strong>{product.originalPrice && <del>{money(product.originalPrice)}</del>}</div>
          <Link href={`/products/${product.slug}`} aria-label={`Xem ưu đãi ${product.name}`}><ArrowUpRight size={19} /></Link>
        </div>
      </div>
    </article>
  );
}
