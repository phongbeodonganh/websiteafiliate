import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { COUPON_GUIDES, getCategory } from "@/lib/marketplace";
import { createPageMetadata } from "@/lib/seo";
import styles from "../../marketplace-pages.module.css";

interface GuidePageProps{params:Promise<{slug:string}>}
export function generateStaticParams(){return COUPON_GUIDES.map((guide)=>({slug:guide.slug}));}
export async function generateMetadata({params}:GuidePageProps):Promise<Metadata>{const {slug}=await params;const guide=COUPON_GUIDES.find(item=>item.slug===slug);if(!guide)return{title:"Guide Not Found",robots:{index:false,follow:false}};return createPageMetadata({title:guide.title,description:guide.excerpt,path:`/guide/${slug}`});}

export default async function GuidePage({params}:GuidePageProps){const {slug}=await params;const guide=COUPON_GUIDES.find(item=>item.slug===slug);if(!guide)notFound();const category=getCategory(guide.categorySlug);const finance=guide.categorySlug==="finance";const beaver=guide.slug.includes("beavercraft");return <div className={styles.page}><StorefrontHeader/><main className={styles.main}><nav className={styles.breadcrumb}><Link href="/">Home</Link><span>/</span><Link href="/#guides">Guides</Link><span>/</span><span>{category?.name}</span></nav><article className={styles.article}><header className={styles.articleHeader}><p className={styles.eyebrow}>{category?.name} / Coupon guide</p><h1>{guide.title}</h1><p>{guide.excerpt}</p><div className={styles.articleMeta}>Updated {guide.updatedAt} · {guide.readTime} read · TheHavenDeals verification desk</div></header><div className={styles.articleBody}>
  <h2>Start with evidence, not the headline</h2><p>A coupon is useful only when it changes the final amount for the basket you actually want. We check the retailer&apos;s own terms, build an eligible basket and test the code at the point where a shopper would apply it.</p>
  {beaver&&<><div className={styles.articleCallout}><strong>The reliable BeaverCraft route</strong><p>The brand&apos;s own welcome or newsletter offer is generally more dependable than codes copied across third-party coupon pages. Treat any undated “exclusive” code as unverified.</p></div><h2>Why repeated codes can still be fake</h2><p>Coupon aggregators often copy one another. The same code appearing on ten pages may have come from one expired source. We publish a re-test date only after seeing a real price change at checkout.</p></>}
  {finance&&<><div className={styles.warning}><strong>Risk comes before promotion</strong><p>CFDs and leveraged trading can cause rapid losses. A bonus does not reduce market risk, make a provider suitable for you or replace checking the regulated entity in your country.</p></div><h2>Review the account, not only the offer</h2><p>Compare spreads, overnight fees, withdrawal rules, negative-balance protection and investor protections. Marketing language must never be the main reason to open a trading account.</p></>}
  {!finance&&!beaver&&<><h2>Check the exclusions that change the value</h2><p>Look for minimum spend, first-order restrictions, product exclusions, delivery charges and subscription renewal pricing. The strongest-looking percentage is not always the lowest final cost.</p></>}
  <h2>A checkout checklist</h2><ol><li>Open the retailer through the deal page and choose an eligible item.</li><li>Record the basket total before applying the code.</li><li>Paste the code exactly, including any capital letters or numbers.</li><li>Confirm the final total changes before entering payment details.</li><li>If it fails, report the code so we can prioritise a re-test.</li></ol>
  <div className={styles.articleCallout}><strong>Transparent funding</strong><p>TheHavenDeals may earn a commission from selected retailer links. This does not increase the price you pay or turn a failed checkout test into a verified offer.</p></div>
  <p><Link href={`/category/${guide.categorySlug}`}>Browse current {category?.name} deals</Link> or <Link href="/contact">report an outdated code</Link>.</p>
  </div></article></main><StorefrontFooter/></div>}
