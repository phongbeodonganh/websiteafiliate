import Link from "next/link";
import { Heart, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./storefront.module.css";

export const STOREFRONT_CATEGORIES = [
  { label: "Công nghệ", slug: "tech" },
  { label: "Nhà & Bếp", slug: "home-kitchen" },
  { label: "Làm vườn", slug: "garden" },
  { label: "Dụng cụ", slug: "tools" },
  { label: "Ngoài trời", slug: "outdoor" },
  { label: "Làm đẹp", slug: "beauty" },
];

export default function StorefrontHeader({ query = "" }: { query?: string }) {
  return (
    <>
      <div className={styles.utilityBar}>
        <div className={styles.utilityInner}>
          <span><ShieldCheck size={14} /> Ưu đãi được đội ngũ GoodPick kiểm tra</span>
          <span>Đánh giá độc lập · Bạn không phải trả thêm phí</span>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link href="/" className={styles.logo} aria-label="Trang chủ GoodPick">
            <span className={styles.logoMark}><Sparkles size={18} /></span>
            <span>GOOD<span>PICK</span></span>
          </Link>
          <form action="/" className={styles.searchForm} role="search">
            <Search size={18} aria-hidden="true" />
            <input name="q" defaultValue={query} aria-label="Tìm sản phẩm" placeholder="Bạn đang muốn tìm sản phẩm gì?" />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className={styles.headerActions}>
            <Link href="/#featured"><Heart size={18} /> <span>Sản phẩm nổi bật</span></Link>
            <button type="button" aria-label="Mở danh mục"><Menu size={22} /></button>
          </div>
        </div>
        <nav className={styles.categoryNav} aria-label="Danh mục sản phẩm">
          <Link href="/">Tất cả ưu đãi</Link>
          {STOREFRONT_CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/?category=${category.slug}#deals`}>{category.label}</Link>
          ))}
          <Link href="/#guides">Hướng dẫn chọn mua</Link>
        </nav>
      </header>
    </>
  );
}
