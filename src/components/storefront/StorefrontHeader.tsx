import Link from "next/link";
import { Compass, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getStorefrontCategories } from "@/lib/storefront-categories";
import styles from "./storefront.module.css";

export default async function StorefrontHeader({ query = "" }: { query?: string }) {
  const categories = await getStorefrontCategories();
  const categoryLinks = categories.map((category) => (
    <Link key={category.slug} href={`/?category=${category.slug}#products`}>{category.name}</Link>
  ));
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
