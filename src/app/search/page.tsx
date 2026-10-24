import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import CouponDealCard from "@/components/marketplace/CouponDealCard";
import { COUPON_GUIDES } from "@/lib/marketplace";
import { getStoreCatalogue } from "@/lib/stores/public";
import { createPageMetadata } from "@/lib/seo";
import styles from "../marketplace-pages.module.css";

export const metadata: Metadata = { ...createPageMetadata({ title: "Search deals and stores", description: "Search TheHavenDeals coupon codes, stores and saving guides.", path: "/search" }), robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams; const query = typeof params.q === "string" ? params.q.trim() : ""; const needle=query.toLowerCase();
  const catalogue = query ? await getStoreCatalogue() : { stores: [], deals: [] };
  const stores=query?catalogue.stores.filter(s=>`${s.name} ${s.description}`.toLowerCase().includes(needle)):[];
  const deals=query?catalogue.deals.filter(d=>`${d.title} ${d.description} ${d.code||""} ${catalogue.stores.find((store)=>store.slug===d.storeSlug)?.name||""}`.toLowerCase().includes(needle)):[];
  const guides=query?COUPON_GUIDES.filter(g=>`${g.title} ${g.excerpt}`.toLowerCase().includes(needle)):[];
  const total=stores.length+deals.length+guides.length;
  return <div className={styles.page}><StorefrontHeader query={query}/><main className={styles.main}><nav className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><span>Search</span></nav><header className={styles.hero}><div><p className={styles.eyebrow}>Marketplace search</p><h1>{query?`Results for “${query}”`:"Search every deal in one place."}</h1><p>{query?`${total} matching result${total===1?"":"s"} across stores, active offers and coupon guides.`:"Enter a store, product or coupon in the search bar above."}</p></div><div className={styles.heroStat}><strong>{total}</strong><span>matching marketplace results</span></div></header>
  {!query?<div className={styles.empty}><h2>What are you shopping for?</h2><p>Try a store such as BeaverCraft, a product such as power bank, or a category such as beauty.</p></div>:total===0?<div className={styles.empty}><h2>No close matches yet.</h2><p>Check the spelling or browse the full store directory.</p><Link href="/stores">Browse all stores</Link></div>:<div className={styles.resultGroups}>
    {stores.length>0&&<section><h2 className={styles.resultTitle}>Stores <span>({stores.length})</span></h2><div className={styles.storeGrid}>{stores.map(store=><Link href={`/store/${store.slug}`} className={styles.storeCard} key={store.slug}><span className={styles.storeMark} style={{"--store-accent":store.accent} as React.CSSProperties}>{store.initials}</span><div><h2>{store.name}</h2><p>{store.description}</p><small>{store.offerCount} current offers</small></div><ArrowRight/></Link>)}</div></section>}
    {deals.length>0&&<section><h2 className={styles.resultTitle}>Deals <span>({deals.length})</span></h2><div className={styles.dealGrid}>{deals.map(deal=><CouponDealCard key={deal.id} deal={deal} store={catalogue.stores.find((store)=>store.slug===deal.storeSlug)}/>)}</div></section>}
    {guides.length>0&&<section><h2 className={styles.resultTitle}>Coupon guides <span>({guides.length})</span></h2><div className={styles.guideGrid}>{guides.map(guide=><Link href={`/guide/${guide.slug}`} className={styles.guideCard} key={guide.slug}><small>Updated {guide.updatedAt}</small><h3>{guide.title}</h3><p>{guide.excerpt}</p></Link>)}</div></section>}
  </div>}</main><StorefrontFooter/></div>;
}
