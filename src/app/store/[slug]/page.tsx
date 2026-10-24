import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, ExternalLink, Flag, RefreshCw, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import CouponDealCard from "@/components/marketplace/CouponDealCard";
import { getCategory, getDealsForStore, getStore } from "@/lib/marketplace";
import { getPublishedStores } from "@/lib/stores/public";
import StoreViewTracker from "@/components/storefront/StoreViewTracker";
import { storeRedirectHref } from "@/lib/stores/tracking";
import ManagedStorePage from "@/components/storefront/ManagedStorePage";
import { createPageMetadata } from "@/lib/seo";
import styles from "../../marketplace-pages.module.css";

interface StorePageProps { params: Promise<{ slug: string }>; }
export const dynamic = "force-dynamic";
export async function generateMetadata({params}:StorePageProps):Promise<Metadata>{const {slug}=await params;const store=(await getPublishedStores()).find((item)=>item.slug===slug);if(!store)return{title:"Store Not Found",robots:{index:false,follow:false}};return createPageMetadata({title:`${store.name} coupons & promo codes`,description:store.description || `Browse ${store.name} coupons, promo codes and store information.`,path:`/store/${slug}`});}

export default async function StorePage({params}:StorePageProps){
  const {slug}=await params;
  const record=(await getPublishedStores()).find((item)=>item.slug===slug);
  if(!record)notFound();
  if(record.id)return <ManagedStorePage store={record}/>;
  const store=getStore(slug); if(!store)notFound(); const deals=getDealsForStore(slug); const category=getCategory(store.categorySlug); const lastTest=deals[0]?.retestedAt||deals[0]?.publishedAt;
  const isFinance=slug==="xm"; const isBeaver=slug==="beavercraft";
  return <div className={styles.page}><StorefrontHeader/><StoreViewTracker slug={slug}/><main className={styles.main}>
    <nav className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><Link href="/stores">Stores</Link><span>/</span><span>{store.name}</span></nav>
    <header className={styles.storeHero}><span className={styles.largeMark} style={{"--store-accent":store.accent} as React.CSSProperties}>{store.initials}</span><div><p className={styles.eyebrow}>{category?.name} store</p><h1>{store.name} coupons</h1><p>{store.description} We show only offers with a clear source and a visible verification record.</p></div><a href={storeRedirectHref(slug)} target="_blank" rel="nofollow sponsored noopener">Visit store <ExternalLink/></a></header>
    <div className={styles.verificationBar}><span><BadgeCheck/> Verification record active</span><span><RefreshCw/> Last checkout test: {lastTest}</span><span><ShieldCheck/> Affiliate relationship does not change results</span></div>
    <section><div className={styles.sectionHead}><h2>Working offers</h2><p>{deals.length} active offer{deals.length===1?"":"s"}. If a code fails, report it and it moves to the front of our re-test queue.</p></div><div className={styles.dealGrid}>{deals.map((deal)=><CouponDealCard key={deal.id} deal={{...deal,destination:storeRedirectHref(slug,deal.id)}}/>)}</div></section>
    <section className={styles.section}><div className={styles.review}><article><p className={styles.eyebrow}>Honest review</p><h2>What to know before using this offer</h2>{isBeaver?<><p>BeaverCraft sells approachable carving tools and beginner sets. The most dependable saving is usually the brand&apos;s own newsletter or a clearly published seasonal offer—not the large collection of unverified codes repeated by coupon scrapers.</p><h3>Why we reject some BeaverCraft codes</h3><p>We do not mark a code as working when it only reaches the checkout field, applies to an excluded product, or produces no price change. Codes copied from other coupon sites remain unverified until our own checkout test succeeds.</p><div className={styles.warning}><strong><AlertTriangle/> Common coupon trap</strong><p>A code appearing on many websites is not evidence that it works. Check the re-test date above and confirm the order total changes.</p></div></>:isFinance?<><p>XM provides access to leveraged trading products. Any promotion must be secondary to understanding fees, withdrawal conditions and the chance of losing money.</p><div className={styles.warning}><strong><AlertTriangle/> High-risk financial product</strong><p>CFDs are complex instruments and carry a high risk of losing money rapidly due to leverage. This page is not investment advice. Confirm the regulated entity and risk disclosure available in your country before opening an account.</p></div><h3>Our editorial position</h3><p>We will not frame a deposit incentive as a saving or hide risk information behind a call-to-action. Eligibility and protections can differ by European jurisdiction.</p></>:<><p>We checked the offer path, the code behaviour and the most important exclusions visible at checkout. Final prices, stock and delivery terms remain controlled by {store.name}.</p><h3>The practical check</h3><p>Compare the basket total before and after applying a code. A large headline percentage may apply only to selected products, first orders or minimum-spend baskets.</p></>}</article><aside className={styles.reviewAside}><strong>Our verification promise</strong><p>A “Re-tested” stamp means a person repeated the checkout path on the date shown. It is not a guarantee that every basket or country qualifies.</p><Link href="/how-we-verify-coupons">Read the full method</Link><p><Link href={`/contact?store=${store.slug}`}><Flag/> Report a broken {store.name} code</Link></p></aside></div></section>
  </main><StorefrontFooter/></div>;
}
