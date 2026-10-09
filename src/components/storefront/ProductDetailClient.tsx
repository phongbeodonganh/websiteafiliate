"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy, ExternalLink, ShieldCheck, Truck } from "lucide-react";
import type { StorefrontProduct } from "@/lib/products/public";
import { getMarketplaceMeta } from "@/lib/marketplaces";
import styles from "./product-detail.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "USD" }).format(value);

const offerHref = (product: StorefrontProduct, offerId: string, directUrl?: string, placement = "main_cta") =>
  directUrl || `/api/v1/public/products/redirect?product_id=${product.id}&offer_id=${offerId}&placement=${placement}`;

export default function ProductDetailClient({ product }: { product: StorefrontProduct }) {
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const primaryOffer = product.offers[0];
  const market = primaryOffer ? getMarketplaceMeta(primaryOffer.marketplace) : null;

  const copyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <>
      <div className={styles.buyGrid} data-motion="fade">
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {product.images[activeImage]?.url ? (
              // Retailer images can come from admin-configured CDN domains.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[activeImage].url}
                alt={product.images[activeImage].alt || product.name}
                width="900"
                height="900"
                fetchPriority="high"
                decoding="async"
              />
            ) : <span>GOODPICK</span>}
            {product.discountPercent > 0 && <b>Giảm {product.discountPercent}%</b>}
          </div>
          {product.images.length > 1 && (
            <div className={styles.thumbs} aria-label="Ảnh sản phẩm">
              {product.images.map((image, index) => (
                <button className={index === activeImage ? styles.activeThumb : ""} key={`${image.url}-${index}`} onClick={() => setActiveImage(index)} aria-label={`Xem ảnh ${index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" width="140" height="140" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className={styles.buyBox}>
          {product.editorScore && <div className={styles.score}><span>Điểm GoodPick</span><strong>{product.editorScore.toFixed(1)}</strong><small>/10</small></div>}
          <p className={styles.kicker}>{product.brand || "GoodPick"} · {product.category || "Sản phẩm đề xuất"}</p>
          <h1>{product.name}</h1>
          <p className={styles.shortDescription}>{product.shortDescription}</p>
          <div className={styles.priceBlock}>
            <span>Giá tốt nhất hiện tại</span>
            <div><strong>{money(product.price)}</strong>{product.originalPrice && <del>{money(product.originalPrice)}</del>}</div>
            {primaryOffer?.lastCheckedAt && <small>Kiểm tra giá ngày {new Date(primaryOffer.lastCheckedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</small>}
          </div>
          {product.highlights.length > 0 && <ul className={styles.highlights}>{product.highlights.slice(0, 4).map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul>}
          {primaryOffer && market && (
            <div className={styles.primaryOffer}>
              <div><span>Ưu đãi tốt nhất</span><strong>{primaryOffer.storeName || market.label}</strong></div>
              {primaryOffer.couponCode && <button type="button" onClick={() => copyCoupon(primaryOffer.couponCode!)} aria-label={`Sao chép mã ${primaryOffer.couponCode}`}><span>{primaryOffer.couponCode}</span>{copied === primaryOffer.couponCode ? <Check size={15} /> : <Copy size={15} />}</button>}
              <a href={offerHref(product, primaryOffer.id, primaryOffer.directUrl)} target="_blank" rel="nofollow sponsored noopener">
                Xem giá tại {market.label} <ExternalLink size={16} />
              </a>
              <small>Bạn sẽ hoàn tất mua hàng trên website của nhà bán lẻ.</small>
            </div>
          )}
          <div className={styles.trustRow}>
            {product.trust.authentic && <span><BadgeCheck size={17} /> Đã kiểm tra tính xác thực</span>}
            {product.trust.freeShipping && <span><Truck size={17} /> Có miễn phí vận chuyển</span>}
            {product.trust.returnDays && <span><ShieldCheck size={17} /> Đổi trả trong {product.trust.returnDays} ngày</span>}
          </div>
          <span className={styles.copyStatus} aria-live="polite">{copied ? "Đã sao chép mã giảm giá" : ""}</span>
        </aside>
      </div>

      {primaryOffer && market && (
        <div className={styles.mobileBuyBar}>
          <div><span>Giá đang xem</span><strong>{money(primaryOffer.price)}</strong></div>
          <a href={offerHref(product, primaryOffer.id, primaryOffer.directUrl, "mobile_sticky")} target="_blank" rel="nofollow sponsored noopener">
            Xem tại {market.label} <ExternalLink size={15} />
          </a>
        </div>
      )}
    </>
  );
}

export function OfferList({ product }: { product: StorefrontProduct }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className={styles.offerList} id="where-to-buy">
      {product.offers.map((offer, index) => {
        const market = getMarketplaceMeta(offer.marketplace);
        return (
          <div className={styles.offerRow} key={offer.id}>
            <div className={styles.offerRank}>{index === 0 ? "Giá tốt nhất" : `Lựa chọn ${index + 1}`}</div>
            <div className={styles.storeName}><strong>{offer.storeName || market.label}</strong><span>{offer.official ? market.officialLabel : market.label}{offer.freeShipping ? " · Miễn phí vận chuyển" : ""}</span></div>
            {offer.couponCode ? (
              <button type="button" className={styles.coupon} onClick={async () => { await navigator.clipboard.writeText(offer.couponCode!); setCopied(offer.id); }} aria-label={`Sao chép mã ${offer.couponCode}`}>
                <span>{offer.couponCode}</span>{copied === offer.id ? <Check size={15} /> : <Copy size={15} />}
              </button>
            ) : <span className={styles.noCoupon}>Không cần mã</span>}
            <div className={styles.offerPrice}><strong>{money(offer.price)}</strong>{offer.originalPrice && <del>{money(offer.originalPrice)}</del>}</div>
            <a style={{ background: market.color, color: market.textColor }} href={offerHref(product, offer.id, offer.directUrl, "offer_list")} target="_blank" rel="nofollow sponsored noopener">Xem ưu đãi <ExternalLink size={15} /></a>
          </div>
        );
      })}
      <span className={styles.copyStatus} aria-live="polite">{copied ? "Đã sao chép mã giảm giá" : ""}</span>
    </div>
  );
}
