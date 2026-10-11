import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  CheckCircle2,
  HeartPulse,
  Laptop,
  RefreshCw,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  TentTree,
  UtensilsCrossed,
} from "lucide-react";
import ProductCard from "@/components/storefront/ProductCard";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontNewsletter from "@/components/storefront/StorefrontNewsletter";
import { getHomepageArticles, type HomepageArticle } from "@/lib/homepage-articles";
import { getStorefrontProducts } from "@/lib/products/public";
import { getStorefrontCategories } from "@/lib/storefront-categories";
import { createPageMetadata, normalizeSiteUrl, serializeJsonLd } from "@/lib/seo";
import styles from "@/components/storefront/storefront.module.css";

interface HomePageProps {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const base = createPageMetadata({
    title: "Independent product picks and price comparisons",
    description: "Find practical everyday products, understand the trade-offs and compare current retailer offers with GoodPick.",
    path: "/",
  });
  return query ? { ...base, robots: { index: false, follow: true } } : base;
}

const categoryIcons: Record<string, ReactNode> = {
  "home-kitchen": <UtensilsCrossed aria-hidden="true" />,
  fashion: <Shirt aria-hidden="true" />,
  tech: <Laptop aria-hidden="true" />,
  mobility: <Bike aria-hidden="true" />,
  wellness: <HeartPulse aria-hidden="true" />,
  outdoor: <TentTree aria-hidden="true" />,
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const category = typeof params.category === "string" ? params.category : "";
  const storefrontCategories = await getStorefrontCategories();
  const categoryBySlug = new Map(storefrontCategories.map((item) => [item.slug, item]));
  const products = await getStorefrontProducts({ query, category, limit: 12, demoFallback: true });
  const allProducts = query || category
    ? await getStorefrontProducts({ limit: 12, demoFallback: true })
    : products;
  const featured = allProducts.find((product) => product.featured) || allProducts[0];
  const featuredList = [
    ...allProducts.filter((product) => product.featured),
    ...allProducts.filter((product) => !product.featured),
  ].slice(0, 4);
  const socialProofProducts = [...allProducts]
    .filter((product) => product.ratingCount > 0)
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 3);

  let guides: HomepageArticle[] = [];
  try {
    guides = (await getHomepageArticles()).latest.slice(0, 3);
  } catch {
    // Product discovery remains available when editorial content is unavailable.
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GoodPick everyday product recommendations",
    itemListElement: allProducts.slice(0, 12).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${normalizeSiteUrl()}/products/${product.slug}`,
    })),
  };

  const filteredCategory = storefrontCategories.find((item) => item.slug === category);

  return (
    <div className={styles.page}>
      <StorefrontHeader query={query} />
      {!query && !category && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      )}

      {!query && !category && featured && (
        <section className={styles.hero} aria-labelledby="home-title" data-motion="fade">
          <div className={styles.heroStage}>
            <div className={styles.heroCollage} aria-hidden="true">
              <span className={`${styles.collagePhoto} ${styles.collagePhotoOne}`}>
                {/* Decorative editorial collage; the source is intentionally kept as a normal image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {categoryBySlug.get("fashion")?.imageUrl && <img src={categoryBySlug.get("fashion")!.imageUrl} alt="" width="260" height="190" />}
              </span>
              <span className={`${styles.collagePhoto} ${styles.collagePhotoTwo}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {categoryBySlug.get("mobility")?.imageUrl && <img src={categoryBySlug.get("mobility")!.imageUrl} alt="" width="290" height="220" />}
              </span>
              <span className={`${styles.collagePhoto} ${styles.collagePhotoThree}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {categoryBySlug.get("outdoor")?.imageUrl && <img src={categoryBySlug.get("outdoor")!.imageUrl} alt="" width="250" height="190" />}
              </span>
              <span className={styles.collageSun} />
              <span className={styles.collageFlower}>✦</span>
            </div>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><Sparkles size={14} /> Everyday buying guide</p>
              <h1 id="home-title">Choose well.<br /><span>Use it daily.</span></h1>
              <p>From cutlery to computers, GoodPick turns crowded product listings into a short, practical decision.</p>
              <form action="/" className={styles.heroSearch} role="search">
                <Search size={19} aria-hidden="true" />
                <input name="q" aria-label="Search products and buying guides" placeholder="What do you need today?" />
                <button type="submit">Find a good pick</button>
              </form>
              <div className={styles.heroMicrocopy}>
                <span><CheckCircle2 size={14} /> Clear trade-offs</span>
                <span><RefreshCw size={14} /> Recently checked</span>
                <span><ShieldCheck size={14} /> Affiliate links disclosed</span>
              </div>
              <div className={styles.heroStickers} aria-hidden="true">
                <span>Human checked</span>
                <span>{storefrontCategories.length} useful worlds</span>
              </div>
            </div>

            <div className={styles.decisionBoard} aria-label={`Product passport for ${featured.name}`}>
              <div className={styles.boardHeader}>
                <span>Product passport / Editor&apos;s pick</span>
                <span><i /> Checked {new Date(featured.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
              <Link href={`/products/${featured.slug}`} className={styles.heroProduct}>
                <span className={styles.heroProductImage}>
                  {featured.images[0]?.url ? (
                    // Product images can come from admin-configured retailer CDNs.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.images[0].url} alt={featured.images[0].alt || featured.name} width="760" height="760" fetchPriority="high" decoding="async" />
                  ) : <span className={styles.imagePlaceholder}>GP</span>}
                </span>
                <span>
                  <small>Best for {featured.highlights[0] || "everyday use"}</small>
                  <strong>{featured.name}</strong>
                  <span>Read the verdict <ArrowRight size={14} /></span>
                </span>
              </Link>
              <div className={styles.compareRibbon}>
                <div><span>Price from</span><strong>{money(featured.price)}</strong></div>
                <div><span>Editor score</span><strong>{featured.editorScore ? `${featured.editorScore.toFixed(1)}/10` : "Recommended"}</strong></div>
                <div><span>Retailers</span><strong>{featured.offers.length || 1} compared</strong></div>
              </div>
              <div className={styles.decisionStamp}><BadgeCheck size={23} /><span><strong>GOOD</strong><br />PICK</span></div>
            </div>
          </div>
          <div className={styles.heroTicker} aria-hidden="true">
            <div>{[...storefrontCategories, ...storefrontCategories].map((item, index) => <span key={`${item.id}-${index}`}><i>{item.name.toUpperCase()}</i><i>•</i></span>)}</div>
          </div>
        </section>
      )}

      <section className={styles.trustStrip} aria-label="GoodPick standards" data-motion="fade">
        <div className={styles.trustItem}><BadgeCheck size={21} /><div><strong>Independent shortlist</strong><span>Selected for usefulness, not ad spend</span></div></div>
        <div className={styles.trustItem}><Search size={21} /><div><strong>Offers compared</strong><span>Price is only one part of value</span></div></div>
        <div className={styles.trustItem}><RefreshCw size={21} /><div><strong>Fresh timestamps</strong><span>See when details were last checked</span></div></div>
        <div className={styles.trustItem}><ShieldCheck size={21} /><div><strong>Affiliate transparency</strong><span>You never pay extra for our commission</span></div></div>
      </section>

      {!query && !category && (
        <section className={`${styles.section} ${styles.categorySection}`} aria-labelledby="categories-title">
          <div className={styles.sectionHeading} data-motion="fade">
            <div><p className={styles.eyebrow}>Shop by real life</p><h2 id="categories-title">Start with where it fits.</h2><p className={styles.sectionLead}>Six useful worlds keep a broad catalogue understandable, whether you need a spoon, a jacket or a laptop.</p></div>
          </div>
          <div className={styles.categoryGrid}>
            {storefrontCategories.map((item) => (
              <Link className={styles.categoryCard} data-category={item.slug} href={`/?category=${item.slug}#products`} key={item.slug}>
                <span className={styles.categoryVisual}>
                  {/* Category images are decorative; the adjacent label names the destination. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imageUrl && <img src={item.imageUrl} alt="" width="360" height="240" loading="lazy" decoding="async" />}
                  <span className={styles.categoryIcon}>{categoryIcons[item.slug] || <Sparkles aria-hidden="true" />}</span>
                </span>
                <span className={styles.categoryCopy}>
                  <strong>{item.name}</strong>
                  <span>{item.description} <ArrowRight size={12} /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!query && !category && featuredList.length > 0 && (
        <section className={`${styles.sectionAlt} ${styles.featuredSection}`} id="featured">
          <div className={`${styles.section} ${styles.sectionInner}`}>
            <div className={styles.sectionHeading} data-motion="fade">
              <div><p className={styles.eyebrow}>Editor&apos;s shortlist</p><h2>Picks that earn their place.</h2><p className={styles.sectionLead}>Every card answers the practical questions first: who it suits, what it costs and when we checked it.</p></div>
              <Link href="#products">Browse every pick <ArrowRight size={15} /></Link>
            </div>
            <div className={styles.productGrid}>{featuredList.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      )}

      <section className={`${styles.section} ${styles.productSection}`} id="products">
        <div className={styles.sectionHeading} data-motion="fade">
          <div>
            <p className={styles.eyebrow}>{query ? "Search results" : category ? "Filtered collection" : "Recently checked"}</p>
            <h2>{query ? `Good picks for “${query}”` : filteredCategory ? filteredCategory.name : "Useful products, clearly explained."}</h2>
            {!query && !category && <p className={styles.sectionLead}>Compare the fit, the compromise and current retailer offers before you leave GoodPick.</p>}
          </div>
          {(query || category) && <Link href="/">Clear filter <ArrowRight size={15} /></Link>}
        </div>
        {products.length > 0 ? (
          <div className={styles.productGrid}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        ) : (
          <div className={styles.emptyState}><h3>No close match yet.</h3><p>Try a shorter product name or return to all GoodPick recommendations.</p><Link href="/">See every product</Link></div>
        )}
      </section>

      {!query && !category && (
        <>
          <section className={styles.section} id="how-we-pick" data-motion="fade">
            <div className={styles.method}>
              <div><p className={styles.eyebrow}>The GoodPick method</p><h2>Less browsing.<br />More certainty.</h2><p>We translate specifications and seller claims into the details that matter after the product arrives.</p></div>
              <div className={styles.methodSteps}>
                <div className={styles.methodStep}><span>1</span><strong>Define the real job</strong><p>We start with the person, place and daily task—not a product category.</p></div>
                <div className={styles.methodStep}><span>2</span><strong>Compare the compromise</strong><p>Price, durability, returns and practical drawbacks sit side by side.</p></div>
                <div className={styles.methodStep}><span>3</span><strong>Check where to buy</strong><p>We show retailer options, timestamps and affiliate relationships clearly.</p></div>
              </div>
            </div>
          </section>

          {socialProofProducts.length > 0 && (
            <section className={styles.proofSection} aria-labelledby="proof-heading">
              <div className={styles.proofIntro} data-motion="fade">
                <p className={styles.eyebrow}>Recorded signals</p>
                <h2 id="proof-heading">Popular, with context.</h2>
                <p>Ratings help us spot patterns, but they never replace a clear explanation of who a product actually suits.</p>
              </div>
              <div className={styles.proofGrid}>
                {socialProofProducts.map((product) => (
                  <Link href={`/products/${product.slug}`} className={styles.proofCard} key={product.id} data-motion="scale">
                    <div className={styles.proofStars}><Star size={16} fill="currentColor" /> {product.rating.toFixed(1)}</div>
                    <strong>{product.name}</strong>
                    <p>{product.shortDescription}</p>
                    <span>{product.ratingCount.toLocaleString("en-GB")} recorded ratings <ArrowRight size={14} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {guides.length > 0 && (
            <section className={`${styles.sectionAlt} ${styles.guideSection}`} id="guides">
              <div className={`${styles.section} ${styles.sectionInner}`}>
                <div className={styles.sectionHeading} data-motion="fade"><div><p className={styles.eyebrow}>Know before you buy</p><h2>Practical buying guides.</h2></div><Link href="/latest">Read every guide <ArrowRight size={15} /></Link></div>
                <div className={styles.guideGrid}>
                  {guides.map((guide) => (
                    <Link href={`/article/${guide.slug}`} className={styles.guideCard} key={guide.id} data-motion="scale">
                      <div className={styles.guideImage}>{guide.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={guide.thumbnailUrl} alt="" width="720" height="440" loading="lazy" decoding="async" />
                      )}</div>
                      <span>{guide.categoryName || "Buying guide"}</span><h3>{guide.title}</h3><p>{guide.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div id="newsletter"><StorefrontNewsletter /></div>
        </>
      )}

      <StorefrontFooter />
    </div>
  );
}
