import Link from "next/link";
import { Compass, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./storefront.module.css";

export const STOREFRONT_CATEGORIES = [
  { label: "Home & Kitchen", slug: "home-kitchen", description: "Cook, clean and live well" },
  { label: "Fashion", slug: "fashion", description: "Wearable everyday essentials" },
  { label: "Technology", slug: "tech", description: "Devices that solve a real job" },
  { label: "Mobility", slug: "mobility", description: "Commute, drive and travel" },
  { label: "Family & Wellness", slug: "wellness", description: "Care for people and routines" },
  { label: "Outdoors", slug: "outdoor", description: "Gear for time outside" },
];

const categoryLinks = STOREFRONT_CATEGORIES.map((category) => (
  <Link key={category.slug} href={`/?category=${category.slug}#products`}>{category.label}</Link>
));

export default function StorefrontHeader({ query = "" }: { query?: string }) {
  return (
    <>
      <div className={styles.utilityBar}>
        <div className={styles.utilityInner}>
          <span><ShieldCheck size={14} /> Independent picks, practical trade-offs.</span>
          <span>Retailer offers checked · Affiliate links disclosed</span>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link href="/" className={styles.logo} aria-label="GoodPick home">
            <span className={styles.logoMark}><Sparkles size={18} /></span>
            <span>GOOD<span>PICK</span></span>
          </Link>
          <form action="/" className={styles.searchForm} role="search">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={query} aria-label="Search products and buying guides" placeholder="Search a product, brand or daily need" />
            <button type="submit">Find</button>
          </form>
          <div className={styles.headerActions}>
            <Link href="/#products"><Compass size={17} /> <span>Explore picks</span></Link>
            <details className={styles.mobileMenu}>
              <summary aria-label="Open product menu"><Menu size={22} /></summary>
              <nav aria-label="Mobile product navigation">
                <Link href="/#products">All good picks</Link>
                {categoryLinks}
                <Link href="/#guides">Buying guides</Link>
                <Link href="/#how-we-pick">How we choose</Link>
              </nav>
            </details>
          </div>
        </div>
        <nav className={styles.categoryNav} aria-label="Product navigation">
          <Link href="/#products">All picks</Link>
          {categoryLinks}
          <Link href="/#guides" className={styles.navMethod}>Buying guides</Link>
        </nav>
      </header>
    </>
  );
}
