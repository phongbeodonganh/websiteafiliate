import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, Search, SlidersHorizontal, Store, TicketPercent, X } from "lucide-react";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import StoreCard from "@/components/storefront/StoreCard";
import { getDiscoverableStores } from "@/lib/stores/public";
import { filterStoreDirectory, storeDirectoryHref, storeOfferCounts, type StoreFilters } from "@/lib/stores/discovery";
import { getCategory } from "@/lib/marketplace";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CategoryModel } from "@/lib/db/models";
import { createPageMetadata, normalizeSiteUrl, serializeJsonLd } from "@/lib/seo";
import styles from "./stores-directory.module.css";
import storeStyles from "@/components/storefront/stores.module.css";

type DirectoryProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = "force-dynamic";

function readFilters(params: Record<string, string | string[] | undefined>): StoreFilters {
  const text = (key: string) => typeof params[key] === "string" ? params[key].trim().slice(0, 120) : "";
  return {
    q: text("q"), category: text("category"),
    letter: /^[A-Z#]$/.test(text("letter").toUpperCase()) ? text("letter").toUpperCase() : "",
    offer: ["active", "codes", "coupons"].includes(text("offer")) ? text("offer") : "all",
    sort: ["name", "offers"].includes(text("sort")) ? text("sort") : "popular",
  };
}

function hasFilters(filters: StoreFilters) {
  return Boolean(filters.q || filters.category || filters.letter || filters.offer !== "all" || filters.sort !== "popular");
}

export async function generateMetadata({ searchParams }: DirectoryProps): Promise<Metadata> {
  const filtered = hasFilters(readFilters(await searchParams));
  return {
    ...createPageMetadata({ title: "All stores: active coupons & promo codes", description: "Find your favourite stores, explore active coupons and promo codes, and filter by category to discover your next place to shop with TheHavenDeals.", path: "/stores" }),
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function StoresPage({ searchParams }: DirectoryProps) {
  const filters = readFilters(await searchParams);
  const allStores = await getDiscoverableStores();
  const stores = filterStoreDirectory(allStores, filters);
  const slugs = [...new Set(allStores.map((store) => store.categorySlug).filter(Boolean))];
  let categoryNames = new Map<string, string>();
  try {
    await connectToDatabase();
    const categories = await CategoryModel.find({ slug: { $in: slugs } }).select("name slug").lean();
    categoryNames = new Map(categories.map((category) => [category.slug, category.name]));
  } catch { }
  const categories = slugs.map((slug) => ({ slug, name: categoryNames.get(slug) || getCategory(slug)?.name || slug.replace(/-/g, " ") })).sort((a, b) => a.name.localeCompare(b.name));
  const totalOffers = allStores.reduce((total, store) => total + storeOfferCounts(store).total, 0);
  const letters = new Set(allStores.map((store) => /^\d/.test(store.name) ? "#" : store.name[0]?.toUpperCase()));
  const filtered = hasFilters(filters);
  const jsonLd = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: normalizeSiteUrl() }, { "@type": "ListItem", position: 2, name: "All stores", item: `${normalizeSiteUrl()}/stores` }] },
      { "@type": "ItemList", name: "TheHavenDeals store directory", numberOfItems: stores.length, itemListElement: stores.map((store, index) => ({ "@type": "ListItem", position: index + 1, name: store.name, url: `${normalizeSiteUrl()}/store/${store.slug}` })) },
    ],
  };
  return <div className={styles.page}>
    <StorefrontHeader />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">All stores</span></nav>
      <header className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}><Store size={15} aria-hidden="true" /> TheHavenDeals store directory</p><h1>Find your next<br /><span>favourite store.</span></h1><p>Find a brand you love, discover somewhere new and explore the coupons and promo codes available before you shop.</p><a href="#find-stores" className={styles.heroCta}>Find your store <ArrowRight size={18} aria-hidden="true" /></a></div>
        <div className={styles.heroStats}><div><span className={styles.statIcon}><Store size={22} aria-hidden="true" /></span><strong>{allStores.length}</strong><span>stores to discover</span></div><div><span className={styles.statIcon}><TicketPercent size={22} aria-hidden="true" /></span><strong>{totalOffers}</strong><span>active coupons<br />&amp; promo codes</span></div><p>Real stores. Clear offer details.<br />A simpler way to shop.</p></div>
      </header>

      <section id="find-stores" className={styles.filterPanel} aria-labelledby="find-stores-heading">
        <div className={styles.filterHeading}><div><p className={styles.eyebrow}>Make it your shortlist</p><h2 id="find-stores-heading">What are you looking for?</h2></div><SlidersHorizontal size={22} aria-hidden="true" /></div>
        <form action="/stores#find-stores" method="get" className={styles.filterForm} role="search" aria-label="Find and filter stores">
          <label className={styles.searchField}><span>Search stores</span><span className={styles.searchInput}><Search size={19} aria-hidden="true" /><input name="q" type="search" defaultValue={filters.q} placeholder="Try Anker, fashion or home essentials…" /></span></label>
          <label><span>Category</span><select aria-label="Category" name="category" defaultValue={filters.category}><option value="">All categories</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label><span>Offer type</span><select aria-label="Offer type" name="offer" defaultValue={filters.offer}><option value="all">All stores</option><option value="active">With active offers</option><option value="codes">With promo codes</option><option value="coupons">With coupons & deals</option></select></label>
          <label><span>Sort by</span><select aria-label="Sort by" name="sort" defaultValue={filters.sort}><option value="popular">Most popular</option><option value="offers">Most active offers</option><option value="name">Store name A–Z</option></select></label>
          {filters.letter && <input type="hidden" name="letter" value={filters.letter} />}
          <button type="submit" className={styles.applyButton}>Find stores <ArrowRight size={17} aria-hidden="true" /></button>
        </form>
        <nav className={styles.alphabet} aria-label="Filter stores by first letter">
          <Link href={`${storeDirectoryHref({ ...filters, letter: "" })}#find-stores`} aria-current={!filters.letter ? "page" : undefined}>All</Link>
          {["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => letters.has(letter) ? <Link key={letter} href={`${storeDirectoryHref({ ...filters, letter })}#find-stores`} aria-label={letter === "#" ? "Stores starting with a number" : `Stores starting with ${letter}`} aria-current={filters.letter === letter ? "page" : undefined}>{letter === "#" ? "0–9" : letter}</Link> : <span key={letter} aria-disabled="true">{letter === "#" ? "0–9" : letter}</span>)}
        </nav>
      </section>

      <div className={styles.resultsHeading}><div><h2>{filtered ? "Your store shortlist" : "Explore every store"}</h2><p>{stores.length} {stores.length === 1 ? "store" : "stores"}{filtered ? ` matching your filters · ${allStores.length} in total` : " — find one that fits your day"}</p></div>{filtered && <Link href="/stores" className={styles.resetButton}><X size={16} aria-hidden="true" /> Clear filters</Link>}</div>
      {stores.length ? <div className={storeStyles.grid}>{stores.map((store) => <StoreCard key={store.slug} store={store} />)}</div> : <div className={styles.empty}><span><Search size={28} aria-hidden="true" /></span><h2>No matching stores yet.</h2><p>Try a shorter name or a different category. There are more stores to explore.</p><Link href="/stores" className={styles.applyButton}>Explore all stores <ArrowRight size={18} aria-hidden="true" /></Link></div>}
      <aside className={styles.disclosure}><TicketPercent size={20} aria-hidden="true" /><p>Offer availability and conditions can change. Check the store page before you shop. We may earn a commission through affiliate links. <Link href="/disclosure">How affiliate links work</Link></p></aside>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    <StorefrontFooter />
  </div>;
}
