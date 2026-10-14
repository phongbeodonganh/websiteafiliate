import Link from "next/link";
import { BadgeCheck, Mail, Sparkles } from "lucide-react";
import styles from "./storefront.module.css";

export default function StorefrontFooter() {
  return (
    <footer className={styles.footer} data-motion="fade">
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.logo} aria-label="GoodPick home">
            <span className={styles.logoMark}><Sparkles size={18} /></span>
            <span>GOOD<span>PICK</span></span>
          </Link>
          <p>Independent product picks, useful trade-offs and retailer comparisons for the things people use every day.</p>
          <span className={styles.footerPromise}><BadgeCheck size={15} /> Every pick shows what was checked and when</span>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/#products">All good picks</Link>
          <Link href="/stores">Stores & coupons</Link>
          <Link href="/?category=home-kitchen#products">Home &amp; Kitchen</Link>
          <Link href="/?category=tech#products">Technology</Link>
          <Link href="/?category=mobility#products">Mobility</Link>
        </div>
        <div>
          <strong>About GoodPick</strong>
          <Link href="/#how-we-pick">How we choose</Link>
          <Link href="/about-us">About us</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/disclosure">Affiliate disclosure</Link>
        </div>
        <div className={styles.footerNewsletter}>
          <Mail size={20} />
          <strong>One useful buying email.</strong>
          <p>New picks, meaningful price drops and no inbox clutter.</p>
          <Link href="/#newsletter">Join the weekly shortlist</Link>
        </div>
      </div>
      <div className={styles.footerDisclosure}>
        <strong>Affiliate disclosure:</strong> GoodPick may earn a commission when you use selected retailer links. You pay no extra, and a commercial relationship never changes our editorial verdict.
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} GoodPick. All rights reserved.</span>
        <span><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · Prices and availability can change after checking.</span>
      </div>
    </footer>
  );
}
