import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { MARKETPLACE_STORES } from "@/lib/marketplace";
import { createPageMetadata } from "@/lib/seo";
import styles from "../marketplace-pages.module.css";

export const metadata: Metadata = createPageMetadata({ title: "All coupon stores A–Z", description: "Browse every GoodPick store with current coupon codes and recently checked offers.", path: "/stores" });

export default async function StoresPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; letter?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const letter = typeof params.letter === "string" ? params.letter.toUpperCase().slice(0, 1) : "";
  const stores = MARKETPLACE_STORES.filter((store) => (!query || `${store.name} ${store.description}`.toLowerCase().includes(query.toLowerCase())) && (!letter || store.name.startsWith(letter)));
  const availableLetters = new Set(MARKETPLACE_STORES.map((store) => store.name[0].toUpperCase()));
  return <div className={styles.page}><StorefrontHeader query={query} /><main className={styles.main}>
    <nav className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><span>All stores</span></nav>
    <header className={styles.hero}><div><p className={styles.eyebrow}>Store directory / A–Z</p><h1>Every verified store, one clean directory.</h1><p>Jump to a brand, see its live offers and check exactly when each coupon was last tested.</p></div><div className={styles.heroStat}><strong>{MARKETPLACE_STORES.length}</strong><span>stores with current offers</span></div></header>
    <div className={styles.toolbar}><h2>Find a store</h2><form className={styles.directorySearch} action="/stores"><Search /><input name="q" defaultValue={query} placeholder="Search store names" aria-label="Search store names"/><button>Search</button></form></div>
    <nav className={styles.alphabet} aria-label="Stores by initial"><Link href="/stores" data-active={!letter}>All</Link>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((char)=><Link key={char} href={`/stores?letter=${char}`} aria-disabled={!availableLetters.has(char)} data-active={letter===char} style={!availableLetters.has(char)?{opacity:.35,pointerEvents:"none"}:undefined}>{char}</Link>)}</nav>
    {stores.length ? <div className={styles.storeGrid}>{stores.map((store)=><Link href={`/store/${store.slug}`} className={styles.storeCard} key={store.slug}><span className={styles.storeMark} style={{"--store-accent":store.accent} as React.CSSProperties}>{store.initials}</span><div><h2>{store.name}</h2><p>{store.description}</p><small>{store.offerCount} current offers</small></div><ArrowRight /></Link>)}</div>:<div className={styles.empty}><h2>No store matched that search.</h2><p>Try a shorter brand name or return to the complete directory.</p><Link href="/stores">Show all stores</Link></div>}
  </main><StorefrontFooter /></div>;
}
