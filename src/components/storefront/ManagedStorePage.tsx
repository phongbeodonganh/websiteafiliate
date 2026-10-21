import Link from "next/link";
import { ExternalLink } from "lucide-react";
import StorefrontHeader from "./StorefrontHeader";
import StorefrontFooter from "./StorefrontFooter";
import StoreOffers from "./StoreOffers";
import { getCategory } from "@/lib/marketplace";
import { prepareAffiliateContent } from "@/lib/affiliate-content";
import { storeRedirectHref } from "@/lib/stores/tracking";
import StoreViewTracker from "./StoreViewTracker";
import type { StoreRecord } from "@/lib/stores/types";
import styles from "@/app/marketplace-pages.module.css";
import storeStyles from "./stores.module.css";

export default function ManagedStorePage({ store }: { store: StoreRecord }) {
  return <div className={styles.page}><StorefrontHeader /><StoreViewTracker slug={store.slug} /><main className={styles.main}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/stores">Stores</Link><span>/</span><span>{store.name}</span></nav>
    <header className={styles.storeHero}>
      {store.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={storeStyles.logo} src={store.imageUrl} alt={store.imageAlt || store.name} width="140" height="96" />
      ) : <span className={styles.largeMark} style={{ "--store-accent": "#0d766e" } as React.CSSProperties}>{store.name.slice(0, 2).toUpperCase()}</span>}
      <div><p className={styles.eyebrow}>{getCategory(store.categorySlug)?.name || "Store"}</p><h1>{store.name} coupons & promo codes</h1><p>{store.description}</p></div>
      <a href={storeRedirectHref(store.slug)} target="_blank" rel="nofollow sponsored noopener noreferrer">Visit store <ExternalLink aria-hidden="true" /></a>
    </header>
    <section id="offers" aria-labelledby="offers-title"><div className={styles.sectionHead}><h2 id="offers-title">Coupons & promo codes</h2><p>Confirm eligibility and the final total at checkout. We may earn a commission through store links.</p></div><StoreOffers offers={store.offers.map((offer) => ({ ...offer, destination: storeRedirectHref(store.slug, offer.id) }))} destination={storeRedirectHref(store.slug)} /></section>
    {store.content && <section className={styles.section} aria-labelledby="about-store"><div className={styles.review}><article><p className={styles.eyebrow}>About the store</p><h2 id="about-store">Shopping at {store.name}</h2><div className={storeStyles.content} dangerouslySetInnerHTML={{ __html: prepareAffiliateContent(store.content, storeRedirectHref(store.slug)).html }} /></article><aside className={styles.reviewAside}><strong>Before you checkout</strong><p>Read each offer&apos;s conditions, minimum spend and exclusions. Check that a promo code changes your basket total.</p><Link href="/how-we-verify-coupons">How we verify coupons</Link></aside></div></section>}
    {store.faqs.length > 0 && <section className={styles.section} aria-labelledby="store-faq"><div className={styles.sectionHead}><h2 id="store-faq">Questions about {store.name}</h2></div><div className={storeStyles.faqList}>{store.faqs.map((faq, index) => <details className={storeStyles.faq} key={index}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>}
  </main><StorefrontFooter /></div>;
}
