"use client";

import Select from "@/components/ui/Select";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Search, TicketPercent } from "lucide-react";
import { filterHomepageDeals, interleaveStoreDeals, type HomepageDeal } from "@/lib/homepage/deals";
import { storeRedirectHref } from "@/lib/stores/tracking";
import StoreCarousel from "./StoreCarousel";
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
    {deal.terms && <details className={styles.terms}><summary>Offer terms</summary><p>{deal.terms}</p></details>}
    <div className={styles.cardActions}>
      {deal.code && <div className={styles.codeRow}><code>{deal.code}</code><button type="button" onClick={copyCode} aria-label={`Copy code ${deal.code} for ${deal.storeName}`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</button></div>}
      <div className={styles.dates}>
        <span>{deal.checkedAt ? `Checked ${formatDate(deal.checkedAt)}` : "Check conditions at the store"}</span>
        {deal.expiresAt && <span>Ends {formatDate(deal.expiresAt)} (UTC)</span>}
      </div>
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
  // Expire displayed offers even when a visitor leaves the homepage open.
  const [now, setNow] = useState(initialNow);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  const filtered = filterHomepageDeals(deals, { q: query, category, kind, sort }, now);
  const results = category ? filtered : interleaveStoreDeals(filtered);
  const reset = () => { setQuery(""); setCategory(""); setKind(""); setSort("latest"); };
  return <section className={styles.section} id="deals" aria-labelledby="deals-title">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><TicketPercent size={15} aria-hidden="true" /> Your next saving</p><h2 id="deals-title">Good deals. Less searching.</h2><p>Browse active store offers, copy a code and check the final price at checkout.</p></div><Link href="/stores?offer=active">Explore stores with offers <ArrowRight size={16} aria-hidden="true" /></Link></div>
    <div className={styles.dealsFrame}>
    <div className={styles.filterPanel}>
      <div className={styles.tabs} role="group" aria-label="Filter by offer type">{[["", "All offers"], ["code", "Promo codes"], ["coupon", "Coupon"]].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div>
      <div className={styles.filters}>
        <label className={styles.searchLabel}><span>Find an offer</span><span className={styles.searchInput}><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Store, product or coupon…" /></span></label>
        <label><span>Category</span><Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</Select></label>
        <label><span>Sort offers</span><Select value={sort} onChange={(e) => setSort(e.target.value)}><option value="latest">Recently checked / updated</option><option value="popular">Most clicked stores</option><option value="ending">Ending soon</option></Select></label>
      </div>
    </div>
    <div className={styles.resultLine}><p role="status" aria-live="polite">{results.length} active {results.length === 1 ? "offer" : "offers"}</p>{(query || category || kind || sort !== "latest") && <button type="button" onClick={reset}>Clear filters</button>}</div>
    {results.length ? <StoreCarousel key={`${query}:${category}:${kind}:${sort}`} count={results.length} itemName="offers" label="Active store offers" className={styles.offerCarousel}>
      {results.map((deal) => <li key={deal.id}><DealCard deal={deal} /></li>)}
    </StoreCarousel> : <div className={styles.empty}><TicketPercent size={30} aria-hidden="true" /><h3>No matching offers right now.</h3><p>Try another store or category. New offers will appear here when available.</p><button type="button" onClick={reset}>Reset filters</button><Link href="/stores">Browse all stores <ArrowRight size={15} aria-hidden="true" /></Link></div>}
    </div>
    <p className={styles.offerNote}>Offers can change. Check exclusions, delivery costs and the final total before paying. <Link href="/how-we-verify-coupons">How we check coupons</Link></p>
  </section>;
}
