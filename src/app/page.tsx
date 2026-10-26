import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  HeartPulse,
  Laptop,
  RefreshCw,
  Search,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  TicketPercent,
  ShoppingBag,
  Headphones,
  Coffee,
  Watch,
  Store,
  TentTree,
  UtensilsCrossed,
} from "lucide-react";
import ProductDecor from "@/components/storefront/ProductDecor";
import ProductCard from "@/components/storefront/ProductCard";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/components/storefront/StorefrontHeader";
import StorefrontNewsletter from "@/components/storefront/StorefrontNewsletter";
import HeroOfferCarousel from "@/components/storefront/HeroOfferCarousel";
import HomepageDeals from "@/components/storefront/HomepageDeals";
import discoveryStyles from "@/components/storefront/homepage-discovery.module.css";
import { collectHomepageDeals, filterHomepageDeals } from "@/lib/homepage/deals";
import { getCategory } from "@/lib/marketplace";
import StoreCarousel from "@/components/storefront/StoreCarousel";
import StoreCard from "@/components/storefront/StoreCard";
import storeStyles from "@/components/storefront/stores.module.css";
import { getDiscoverableStores } from "@/lib/stores/public";
import { filterStoreDirectory } from "@/lib/stores/discovery";
import { getHomepageArticles, type HomepageArticle } from "@/lib/homepage-articles";
import { getStorefrontProducts } from "@/lib/products/public";
import { getStorefrontCategories } from "@/lib/storefront-categories";
import { createPageMetadata, normalizeSiteUrl, serializeJsonLd } from "@/lib/seo";
import styles from "@/components/storefront/storefront.module.css";

interface HomePageProps {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const base = createPageMetadata({
    title: "Store coupons, product deals and independent buying guides",
    description: "Find active store coupons and promo codes, explore product savings and compare retailer offers with independent buying guides from GoodPick.",
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const category = typeof params.category === "string" ? params.category : "";
  const storefrontCategories = await getStorefrontCategories();
  const categoryBySlug = new Map(storefrontCategories.map((item) => [item.slug, item]));
  const products = await getStorefrontProducts({ query, category, limit: 60, demoFallback: true });
  const allProducts = query || category
    ? await getStorefrontProducts({ limit: 60, demoFallback: true })
    : products;
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
  const publicStores = await getDiscoverableStores();
  const homepageStores = filterStoreDirectory(publicStores, { q: query, category })
    .filter((store) => category || query || store.showOnHomepage)
    .slice(0, category || query ? 60 : 15);
  const dealStores = publicStores.filter((store) => query || category || store.showOnHomepage);
  // One request-time snapshot is shared with the client to keep hydration consistent.
  // eslint-disable-next-line react-hooks/purity -- Dynamic Server Component; this timestamp belongs to the request.
  const offersReadAt = Date.now();
  const homepageDeals = collectHomepageDeals(dealStores, offersReadAt);
  const featuredDeals = filterHomepageDeals(homepageDeals, { sort: "popular" }, offersReadAt);
  // Show one offer per store first, then cycle through the remaining offers.
  const firstOffers = new Set<string>();
  const heroDeals = [...featuredDeals.filter((deal) => {
    if (firstOffers.has(deal.storeSlug)) return false;
    firstOffers.add(deal.storeSlug);
    return true;
  })];
  const featuredIds = new Set(heroDeals.map((deal) => deal.id));
  heroDeals.push(...featuredDeals.filter((deal) => !featuredIds.has(deal.id)));
  const dealCategories = [...new Set(homepageDeals.map((deal) => deal.categorySlug).filter(Boolean))]
    .map((slug) => ({ slug, name: categoryBySlug.get(slug)?.name || getCategory(slug)?.name || slug.replace(/-/g, " ") }));
  if (category && !dealCategories.some((item) => item.slug === category)) {
    dealCategories.push({ slug: category, name: filteredCategory?.name || category });
  }
  const reducedProducts = allProducts.filter((product) => !product.demo && product.price > 0 && product.originalPrice && product.originalPrice > product.price)
    .sort((a, b) => ((b.originalPrice! - b.price) / b.originalPrice!) - ((a.originalPrice! - a.price) / a.originalPrice!)).slice(0, 4)
    .map((product) => ({ ...product, discountPercent: Math.round((1 - product.price / product.originalPrice!) * 100) }));
  const storeListJsonLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: "GoodPick stores, coupons and promo codes",
    itemListElement: homepageStores.map((store, index) => ({ "@type": "ListItem", position: index + 1, name: store.name, url: `${normalizeSiteUrl()}/store/${store.slug}` })),
  };

  return (
    <div className={`${styles.page} ${discoveryStyles.landing}`}>
      <StorefrontHeader query={query} />
      <main id="main-content">
      {(query || category) && <h1 className={styles.visuallyHidden}>{query ? `Products and stores matching ${query}` : category ? `${filteredCategory?.name || category} products and stores` : "GoodPick products, stores and savings"}</h1>}
      {!query && !category && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      )}

      {!query && !category && (
        <section className={discoveryStyles.hero} aria-labelledby="home-title">
          <div className={discoveryStyles.heroCopy} data-motion="rise">
            <p className={discoveryStyles.eyebrow}><ShoppingBag size={15} aria-hidden="true" /> Everyday products. Thoughtful savings.</p>
            <h1 id="home-title">Your next<br /><span>great find.</span></h1>
            <p>Little upgrades. Better everyday living. Discover store coupons and thoughtful product picks, all in one place.</p>
            <form action="/#deals" className={discoveryStyles.heroSearch} role="search" aria-label="Search deals and products">
              <Search size={19} aria-hidden="true" /><input name="q" aria-label="Search stores, products and coupons" placeholder="Search a store, product or coupon…" /><button type="submit">Find offers <ArrowRight size={16} aria-hidden="true" /></button>
            </form>
            <div className={discoveryStyles.heroLinks}><Link href="#deals">Explore deals <ArrowRight size={15} /></Link><Link href="/stores">Browse all stores <ArrowRight size={15} /></Link></div>
            <div className={discoveryStyles.heroAssurances}><span><ShieldCheck size={15} aria-hidden="true" /> Clear offer conditions</span><span><BadgeCheck size={15} aria-hidden="true" /> Independent buying guides</span></div>
            <p className={discoveryStyles.heroDisclosure}>We may earn a commission from retailer links, at no extra cost to you. <Link href="/disclosure">Learn more</Link></p>
          </div>
          <div className={discoveryStyles.heroShowcase} data-motion="scale">
            <ProductDecor />
            <HeroOfferCarousel deals={heroDeals} storeCount={publicStores.length} initialNow={offersReadAt} />
          </div>
          <div className={discoveryStyles.everydayEdit} aria-hidden="true">
            <span className={discoveryStyles.editCaption}><Sparkles size={16} /> A little inspiration for your everyday</span>
            <span><Headphones size={20} strokeWidth={1.5} /> Work & play</span><span><Coffee size={20} strokeWidth={1.5} /> Make yourself at home</span><span><Watch size={20} strokeWidth={1.5} /> Out & about</span>
          </div>
        </section>
      )}

      <nav className={discoveryStyles.shortcuts} aria-label="Homepage sections"><Link href="#deals"><TicketPercent size={17} /> Coupons & deals</Link>{homepageStores.length > 0 && <Link href="#stores"><Store size={17} /> Store spotlight</Link>}{!query && !category && <><Link href="#categories">Shop by category</Link>{reducedProducts.length > 0 && <Link href="#price-drops">Product savings</Link>}<Link href="#how-to-save">How to save</Link><Link href="#saving-faq">Common questions</Link></>}</nav>

      <HomepageDeals key={`${query}:${category}`} deals={homepageDeals} initialNow={offersReadAt} categories={dealCategories} initialQuery={query} initialCategory={category} />

      <section className={`${styles.trustStrip} ${discoveryStyles.trustBand}`} aria-label="GoodPick standards" data-motion="fade">
        <div className={styles.trustItem}><BadgeCheck size={21} /><div><strong>Independent shortlist</strong><span>Selected for usefulness, not ad spend</span></div></div>
        <div className={styles.trustItem}><Search size={21} /><div><strong>Offers compared</strong><span>Price is only one part of value</span></div></div>
        <div className={styles.trustItem}><RefreshCw size={21} /><div><strong>Fresh timestamps</strong><span>See when details were last checked</span></div></div>
        <div className={styles.trustItem}><ShieldCheck size={21} /><div><strong>Affiliate transparency</strong><span>You never pay extra for our commission</span></div></div>
      </section>

      {homepageStores.length > 0 && (
        <section className={storeStyles.spotlight} id="stores" aria-labelledby="stores-title" data-motion="rise">
          <div className={storeStyles.spotlightHeading}>
            <div>
              <p className={storeStyles.spotlightEyebrow}><Sparkles size={14} aria-hidden="true" /> The store spotlight</p>
              <h2 id="stores-title">{category ? `Stores in ${filteredCategory?.name || category}` : query ? "Stores that match your search." : <>Great stores<span className={storeStyles.spotlightSubtitle}> More ways to save.</span></>}</h2>
              <p>Discover your next favourite store. Explore active coupons and promo codes before you shop.</p>
            </div>
            <Link href="/stores" className={storeStyles.allStoresButton}>Browse all {publicStores.length} stores <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <StoreCarousel count={homepageStores.length}>
            {homepageStores.map((store) => <li key={store.slug}><StoreCard store={store} compact /></li>)}
          </StoreCarousel>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(storeListJsonLd) }} />
        </section>
      )}

      {!query && !category && (
        <section className={`${styles.section} ${styles.categorySection} ${discoveryStyles.categoryCollection}`} id="categories" aria-labelledby="categories-title">
          <div className={styles.sectionHeading} data-motion="fade">
            <div><p className={styles.eyebrow}>Shop by real life</p><h2 id="categories-title">Start with where it fits.</h2><p className={styles.sectionLead}>Find products and store offers for your home, wardrobe, workspace and time outside.</p></div>
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

      {!query && !category && reducedProducts.length > 0 && (
        <section className={discoveryStyles.section} id="price-drops" aria-labelledby="savings-title">
          <div className={discoveryStyles.sectionHeading}><div><p className={discoveryStyles.eyebrow}>More value for everyday life</p><h2 id="savings-title">Products with a lower listed price.</h2><p>Current prices compared with the reference prices in our catalogue. Confirm the retailer’s price before buying.</p></div><Link href="#products">Compare products <ArrowRight size={16} /></Link></div>
          <div className={styles.productGrid}>{reducedProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}

      {!query && !category && featuredList.length > 0 && (
        <section className={`${styles.sectionAlt} ${styles.featuredSection} ${discoveryStyles.editorCollection}`} id="featured">
          <div className={`${styles.section} ${styles.sectionInner}`}>
            <div className={styles.sectionHeading} data-motion="fade">
              <div><p className={styles.eyebrow}>Editor&apos;s shortlist</p><h2>Picks that earn their place.</h2><p className={styles.sectionLead}>Every card answers the practical questions first: who it suits, what it costs and when we checked it.</p></div>
              <Link href="#products">Browse every pick <ArrowRight size={15} /></Link>
            </div>
            <div className={styles.productGrid}>{featuredList.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      )}

      <section className={`${styles.section} ${styles.productSection} ${discoveryStyles.productCollection}`} id="products">
        <div className={styles.sectionHeading} data-motion="fade">
          <div>
            <p className={styles.eyebrow}>{query ? "Search results" : category ? "Filtered collection" : "Recently checked"}</p>
            <h2>{query ? `Good picks for “${query}”` : filteredCategory ? filteredCategory.name : "Useful products, clearly explained."}</h2>
            {!query && !category && <p className={styles.sectionLead}>Compare the fit, the compromise and current retailer offers before you leave GoodPick.</p>}
          </div>
          {(query || category) && <Link href="/">Clear filter <ArrowRight size={15} /></Link>}
        </div>
        {products.length > 0 ? (
          <div className={styles.productGrid}>{products.slice(0, query || category ? 60 : 12).map((product) => <ProductCard key={product.id} product={product} />)}</div>
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

          <section className={discoveryStyles.section} id="how-to-save" aria-labelledby="how-to-save-title">
            <div className={discoveryStyles.sectionHeading}><div><p className={discoveryStyles.eyebrow}>From discovery to checkout</p><h2 id="how-to-save-title">A few steps to a better deal.</h2></div><Link href="/how-we-verify-coupons">Our coupon checking process <ArrowRight size={16} /></Link></div>
            <div className={discoveryStyles.steps}>
              <article><span>01</span><h3>Find your store or product</h3><p>Search by name or browse a category. Filter offers to see promo codes or deals that need no code.</p></article>
              <article><span>02</span><h3>Read the small print</h3><p>Check eligible items, minimum spend and the end date. Copy the code if one is listed.</p></article>
              <article><span>03</span><h3>Confirm the saving</h3><p>Open the store, apply your code at checkout and check the final total, including shipping, before paying.</p></article>
            </div>
          </section>

          <section className={discoveryStyles.section} id="saving-faq" aria-labelledby="faq-title">
            <div className={discoveryStyles.faqLayout}><div><p className={discoveryStyles.eyebrow}>A little clarity</p><h2 id="faq-title">Before you<br />check out.</h2><p>Useful answers for your next purchase.</p><Link href="/contact">Need a hand? Contact us <ArrowRight size={15} /></Link></div>
            <div className={discoveryStyles.faqList}>
              <details><summary>What is the difference between a code and a deal?</summary><p>A promo code needs to be entered at the store checkout. A deal without a code is accessed through the offer link; the retailer’s eligibility rules still apply.</p></details>
              <details><summary>What does the checked date mean?</summary><p>It is the check date recorded for that offer. An offer without a recorded date does not carry a checked label. Availability, eligible products and country restrictions can change. <Link href="/how-we-verify-coupons">Read how we check coupons.</Link></p></details>
              <details><summary>Why is my coupon not working?</summary><p>Check the expiry, minimum order value, eligible products and whether the offer is for new customers only. Some codes cannot be combined. <Link href="/contact">Tell us about a broken code</Link> so we can review it.</p></details>
              <details><summary>Does it cost anything to use GoodPick?</summary><p>Browsing our public deals is free. We may earn a commission when you buy through selected links, at no additional cost to you. <Link href="/disclosure">Read our affiliate disclosure.</Link></p></details>
              <details><summary>Can GoodPick help with an order or return?</summary><p>Your purchase is made with the retailer. Contact the retailer for delivery, payment, cancellations and returns. Always review its policies before ordering.</p></details>
              <details><summary>Are lower listed prices historical price drops?</summary><p>Our product savings compare the current price with the reference price supplied in our catalogue. They are not a price history or a promise of the lowest price. Check the retailer’s current offer and total cost.</p></details>
            </div></div>
          </section>

          <div id="newsletter"><StorefrontNewsletter /></div>
        </>
      )}

      </main>
      <StorefrontFooter />
    </div>
  );
}
