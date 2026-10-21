import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronRight, CircleAlert, Lightbulb, ShieldCheck, Sparkles, Star } from "lucide-react";
import { notFound } from "next/navigation";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import ProductDetailClient, { OfferList } from "@/components/storefront/ProductDetailClient";
import ProductCard from "@/components/storefront/ProductCard";
import { getStorefrontProduct, getStorefrontProducts } from "@/lib/products/public";
import { prepareAffiliateContent } from "@/lib/affiliate-content";
import { normalizeSiteUrl, serializeJsonLd } from "@/lib/seo";
import styles from "@/components/storefront/product-detail.module.css";
import storefrontStyles from "@/components/storefront/storefront.module.css";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) return { title: "Product not found" };
  const title = product.metaTitle || `${product.name}: price, offers and verdict`;
  const description = product.metaDescription || product.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, type: "website", images: product.images[0]?.url ? [{ url: product.images[0].url, alt: product.images[0].alt || product.name }] : [] },
    twitter: { card: "summary_large_image", title, description, images: product.images[0]?.url ? [product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();

  const related = (await getStorefrontProducts({ category: product.categorySlug, limit: 6, demoFallback: true })).filter((item) => item.slug !== product.slug).slice(0, 3);
  const siteUrl = normalizeSiteUrl();
  const pageUrl = `${siteUrl}/products/${product.slug}`;
  const benefits = [...new Set([...product.highlights, ...product.pros])].slice(0, 6);
  const painPoints = product.cons.length > 0 ? product.cons.slice(0, 3) : [
    "Specifications can look impressive without improving everyday use.",
    "Price, delivery and return terms vary between retailers.",
    "The compromises often become clear only after the box is open.",
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", "@id": `${pageUrl}#product`, url: pageUrl, name: product.name, description: product.shortDescription, sku: product.sku,
        image: product.images.map((image) => image.url), brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        aggregateRating: product.ratingCount ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.ratingCount, bestRating: 5 } : undefined,
        offers: product.offers.map((offer) => ({ "@type": "Offer", priceCurrency: "USD", price: offer.price, availability: offer.stockStatus === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: offer.storeName } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          ...(product.category ? [{ "@type": "ListItem", position: 2, name: product.category, item: `${siteUrl}/?category=${product.categorySlug || ""}` }] : []),
          { "@type": "ListItem", position: product.category ? 3 : 2, name: product.name, item: pageUrl },
        ],
      },
      ...(product.faq.length > 0 ? [{ "@type": "FAQPage", mainEntity: product.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }] : []),
    ],
  };

  return (
    <div className={styles.page}>
      <StorefrontHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }} />
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link><ChevronRight size={12} />
        {product.categorySlug && <><Link href={`/?category=${product.categorySlug}`}>{product.category}</Link><ChevronRight size={12} /></>}
        <span>{product.name}</span>
      </nav>

      <ProductDetailClient product={product} />

      <main className={styles.content}>
        <section className={styles.decisionGrid} aria-label="Product fit and trade-offs">
          <div className={styles.painPanel} data-motion="fade"><CircleAlert size={24} /><p className={styles.miniLabel}>What to think about</p><h2>Do not buy on specifications alone.</h2><ul>{painPoints.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className={styles.solutionPanel} data-motion="fade"><Lightbulb size={24} /><p className={styles.miniLabel}>Where it fits</p><h2>Who is {product.name} right for?</h2><p>{product.shortDescription}</p></div>
        </section>

        {benefits.length > 0 && <section className={styles.benefitSection} data-motion="fade"><div><p className={styles.miniLabel}>Core benefits</p><h2>What you actually get</h2></div><div className={styles.benefitGrid}>{benefits.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}</div></section>}

        {(product.ratingCount > 0 || product.editorScore) && <section className={styles.socialProof} data-motion="scale">
          <div><Sparkles size={23} /><p className={styles.miniLabel}>Recorded signals</p><h2>Useful data, not invented praise.</h2></div>
          {product.ratingCount > 0 && <div className={styles.proofMetric}><Star size={22} fill="currentColor" /><strong>{product.rating.toFixed(1)}/5</strong><span>From {product.ratingCount.toLocaleString("en-GB")} recorded ratings</span></div>}
          {product.editorScore && <div className={styles.proofMetric}><BadgeCheck size={22} /><strong>{product.editorScore.toFixed(1)}/10</strong><span>GoodPick editor score</span></div>}
        </section>}

        <div className={styles.contentGrid}>
          <div className={styles.mainContent}>
            <section className={styles.section} data-motion="fade"><h2>The quick verdict</h2><div className={styles.richContent} dangerouslySetInnerHTML={{ __html: prepareAffiliateContent(product.description || product.shortDescription, `/api/v1/public/products/redirect?product_id=${product.id}&placement=article_box`).html }} />{(product.pros.length > 0 || product.cons.length > 0) && <div className={styles.prosCons}><div className={styles.pros}><h3>Reasons to consider it</h3><ul>{product.pros.map((item) => <li key={item}>{item}</li>)}</ul></div><div className={styles.cons}><h3>Know before you buy</h3><ul>{product.cons.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}</section>
            {product.offers.length > 0 && <section className={styles.section} data-motion="fade"><h2>Compare retailers</h2><p>Look beyond the headline price. Delivery, returns, warranty and seller status shape the real value.</p><OfferList product={product} /></section>}
            {(product.specs.length > 0 || product.material || product.originCountry || product.warrantyMonths) && <section className={styles.section} data-motion="fade"><h2>Product details</h2>{product.specs.map((group) => <div className={styles.specGroup} key={group.group}><h3>{group.group}</h3>{group.items.map((item) => <div className={styles.specRow} key={`${item.label}-${item.value}`}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>)}{(product.material || product.originCountry || product.warrantyMonths) && <div className={styles.specGroup}><h3>Additional details</h3>{product.material && <div className={styles.specRow}><span>Material</span><strong>{product.material}</strong></div>}{product.originCountry && <div className={styles.specRow}><span>Country of origin</span><strong>{product.originCountry}</strong></div>}{product.warrantyMonths && <div className={styles.specRow}><span>Commercial warranty</span><strong>{product.warrantyMonths} months</strong></div>}</div>}</section>}
            {product.faq.length > 0 && <section className={`${styles.section} ${styles.faq}`} data-motion="fade"><h2>Frequently asked questions</h2>{product.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
          </div>
          <aside><div className={styles.sideNote}><BadgeCheck size={25} /><h3>Why is this a GoodPick?</h3><p>We assess practical use, compare available offers and state the trade-offs before sending you to a retailer.</p></div><p className={styles.disclosure}><ShieldCheck size={13} /> GoodPick may earn a commission from qualifying purchases. This does not change the price you pay or our editorial verdict.</p></aside>
        </div>
      </main>

      {related.length > 0 && <section className={storefrontStyles.sectionAlt}><div className={`${storefrontStyles.section} ${storefrontStyles.sectionInner}`}><div className={storefrontStyles.sectionHeading}><div><p className={storefrontStyles.eyebrow}>Keep comparing</p><h2>More picks in {product.category}</h2></div></div><div className={storefrontStyles.productGrid}>{related.map((item) => <ProductCard product={item} key={item.id} />)}</div></div></section>}
      <StorefrontFooter />
    </div>
  );
}
