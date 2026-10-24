"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Search, TicketPercent } from "lucide-react";
import { filterHomepageDeals, type HomepageDeal } from "@/lib/homepage/deals";
import { storeRedirectHref } from "@/lib/stores/tracking";
import DealStoreImage from "./DealStoreImage";
import styles from "./homepage-discovery.module.css";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function DealCard({ deal }: { deal: HomepageDeal }) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopied(true);
      setMessage("Code copied. Apply it at the store checkout.");
    } catch {
      setMessage("Select the code above and copy it to use at checkout.");
    }
  }
  return <article className={styles.dealCard}>
    <Link href={`/store/${deal.storeSlug}`} className={styles.dealStoreLink}>
      <DealStoreImage src={deal.storeImageUrl} alt={deal.storeImageAlt} name={deal.storeName} />
      <span className={styles.storeName}>{deal.storeName} <ArrowRight size={13} aria-hidden="true" /></span>
    </Link>
    <div className={styles.cardTop}><span className={styles.saving}>{deal.saving || "Store offer"}</span><span className={styles.kind}><TicketPercent size={12} aria-hidden="true" />{deal.kind === "code" ? "Promo code" : "Deal"}</span></div>
    <h3><Link href={`/store/${deal.storeSlug}`}>{deal.title}</Link></h3>
    {deal.description && <p className={styles.description}>{deal.description}</p>}
    <div className={styles.dates}>
      <span>{deal.checkedAt ? `Checked ${formatDate(deal.checkedAt)}` : "Check conditions at the store"}</span>
      {deal.expiresAt && <span>Ends {formatDate(deal.expiresAt)} (UTC)</span>}
    </div>
    {deal.terms && <details className={styles.terms}><summary>Offer terms</summary><p>{deal.terms}</p></details>}
    <div className={styles.cardActions}>
      {deal.code && <div className={styles.codeRow}><code>{deal.code}</code><button type="button" onClick={copyCode} aria-label={`Copy code ${deal.code} for ${deal.storeName}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</button></div>}
      <a href={storeRedirectHref(deal.storeSlug, deal.offerId)} target="_blank" rel="nofollow sponsored noopener" className={styles.shopButton}>{deal.code ? "Use code at store" : "Get this deal"}<ArrowRight size={16} aria-hidden="true" /><span className={styles.srOnly}> (opens in a new tab)</span></a>
    </div>
    {message && <p role="status" className={styles.copyStatus}>{message}</p>}
  </article>;
}

export default function HomepageDeals({ deals, categories, initialNow, initialQuery = "", initialCategory = "" }: {
  deals: HomepageDeal[]; initialNow: number; categories: { slug: string; name: string }[]; initialQuery?: string; initialCategory?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState("latest");
  const [limit, setLimit] = useState(6);
  // Expire displayed offers even when a visitor leaves the homepage open.
  const [now, setNow] = useState(initialNow);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const results = filterHomepageDeals(deals, { q: query, category, kind, sort }, now);
  const reset = () => { setQuery(""); setCategory(""); setKind(""); setSort("latest"); setLimit(6); };
  return <section className={styles.section} id="deals" aria-labelledby="deals-title">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><TicketPercent size={15} aria-hidden="true" /> Your next saving</p><h2 id="deals-title">Good deals. Less searching.</h2><p>Browse active store offers, copy a code and check the final price at checkout.</p></div><Link href="/stores?offer=active">Explore stores with offers <ArrowRight size={16} aria-hidden="true" /></Link></div>
    <div className={styles.filterPanel}>
      <div className={styles.tabs} role="group" aria-label="Filter by offer type">{[["", "All offers"], ["code", "Promo codes"], ["coupon", "Coupon"]].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); setLimit(6); }}>{label}</button>)}</div>
      <div className={styles.filters}>
        <label className={styles.searchLabel}><span>Find an offer</span><span className={styles.searchInput}><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(6); }} placeholder="Store, product or coupon…" /></span></label>
        <label><span>Category</span><select value={category} onChange={(e) => { setCategory(e.target.value); setLimit(6); }}><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span>Sort offers</span><select value={sort} onChange={(e) => { setSort(e.target.value); setLimit(6); }}><option value="latest">Recently checked / updated</option><option value="popular">Most clicked stores</option><option value="ending">Ending soon</option></select></label>
      </div>
    </div>
    <div className={styles.resultLine}><p role="status" aria-live="polite">{results.length} active {results.length === 1 ? "offer" : "offers"}{results.length > limit ? ` · showing ${limit}` : ""}</p>{(query || category || kind || sort !== "latest") && <button type="button" onClick={reset}>Clear filters</button>}</div>
    {results.length ? <div className={styles.dealGrid}>{results.slice(0, limit).map((deal) => <DealCard key={deal.id} deal={deal} />)}</div> : <div className={styles.empty}><TicketPercent size={30} aria-hidden="true" /><h3>No matching offers right now.</h3><p>Try another store or category. New offers will appear here when available.</p><button type="button" onClick={reset}>Reset filters</button><Link href="/stores">Browse all stores <ArrowRight size={15} aria-hidden="true" /></Link></div>}
    {results.length > limit && <button type="button" className={styles.loadMore} onClick={() => setLimit((value) => value + 6)}>Show more offers <ArrowRight size={16} aria-hidden="true" /></button>}
    <p className={styles.offerNote}>Offers can change. Check exclusions, delivery costs and the final total before paying. <Link href="/how-we-verify-coupons">How we check coupons</Link></p>
  </section>;
}
