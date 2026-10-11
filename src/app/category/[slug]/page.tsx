import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollectionClient from "../../collection-client";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import CouponDealCard from "@/components/marketplace/CouponDealCard";
import { COUPON_GUIDES, MARKETPLACE_STORES, getCategory, getDealsForCategory } from "@/lib/marketplace";
import { connectToDatabase } from "@/lib/db/mongodb";
import { CategoryModel } from "@/lib/db/models";
import { createPageMetadata } from "@/lib/seo";
import styles from "../../marketplace-pages.module.css";

interface CategoryPageProps { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const marketplaceCategory = getCategory(slug);
  if (marketplaceCategory) return createPageMetadata({ title: `${marketplaceCategory.name} coupons and deals`, description: marketplaceCategory.description, path: `/category/${slug}` });
  try {
    await connectToDatabase();
    const category = await CategoryModel.findOne({ slug }).select("name description meta_title meta_description").lean();
    if (category) return createPageMetadata({ title: category.meta_title || `${category.name} guides`, description: category.meta_description || category.description || `Browse ${category.name} guides.`, path: `/category/${slug}` });
  } catch { }
  return { title: "Category Not Found", robots: { index: false, follow: false } };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (category) {
    const deals = getDealsForCategory(slug);
    const stores = MARKETPLACE_STORES.filter((store) => store.categorySlug === slug);
    const guides = COUPON_GUIDES.filter((guide) => guide.categorySlug === slug);
    return <div className={styles.page}><StorefrontHeader /><main className={styles.main}>
      <nav className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><Link href="/stores">Categories</Link><span>/</span><span>{category.name}</span></nav>
      <header className={styles.hero}><div><p className={styles.eyebrow}>Deal category</p><h1>{category.name} deals worth checking.</h1><p>{category.description} Every listed offer includes a visible published or re-test date.</p></div><div className={styles.heroStat}><strong>{deals.length}</strong><span>recently checked {category.shortName.toLowerCase()} offers</span></div></header>
      <section className={styles.section}><div className={styles.sectionHead}><h2>Current deals</h2><p>We keep expired codes out of the active list and explain automatic discounts clearly.</p></div>{deals.length?<div className={styles.dealGrid}>{deals.map((deal)=><CouponDealCard key={deal.id} deal={deal}/>)}</div>:<div className={styles.empty}><h2>No active offers right now.</h2><p>We are checking this category again. Browse the stores below in the meantime.</p></div>}</section>
      {stores.length>0&&<section className={styles.section}><div className={styles.sectionHead}><h2>Stores in {category.name}</h2></div><div className={styles.storeGrid}>{stores.map((store)=><Link href={`/store/${store.slug}`} className={styles.storeCard} key={store.slug}><span className={styles.storeMark} style={{"--store-accent":store.accent} as React.CSSProperties}>{store.initials}</span><div><h2>{store.name}</h2><p>{store.description}</p><small>{store.offerCount} current offers</small></div></Link>)}</div></section>}
      {guides.length>0&&<section className={styles.section}><div className={styles.sectionHead}><h2>Related coupon guides</h2></div><div className={styles.guideGrid}>{guides.map((guide)=><Link href={`/guide/${guide.slug}`} className={styles.guideCard} key={guide.slug}><small>Updated {guide.updatedAt} · {guide.readTime}</small><h3>{guide.title}</h3><p>{guide.excerpt}</p></Link>)}</div></section>}
    </main><StorefrontFooter /></div>;
  }

  let databaseCategory: { name: string } | null = null;
  try {
    await connectToDatabase();
    databaseCategory = await CategoryModel.findOne({ slug }).select("name -_id").lean() as { name: string } | null;
  } catch { }
  if (databaseCategory) return <CollectionClient kind="category" categorySlug={slug} categoryName={databaseCategory.name} header={<StorefrontHeader />} />;
  notFound();
}
