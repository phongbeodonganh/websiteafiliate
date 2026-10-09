import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Cpu,
  House,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  TentTree,
  Wrench,
} from "lucide-react";
import { createPageMetadata, normalizeSiteUrl, serializeJsonLd } from "@/lib/seo";
import { getStorefrontProducts } from "@/lib/products/public";
import { getHomepageArticles, type HomepageArticle } from "@/lib/homepage-articles";
import ProductCard from "@/components/storefront/ProductCard";
import StorefrontHeader, { STOREFRONT_CATEGORIES } from "@/components/storefront/StorefrontHeader";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import StorefrontNewsletter from "@/components/storefront/StorefrontNewsletter";
import styles from "@/components/storefront/storefront.module.css";

interface HomePageProps {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const meta = createPageMetadata({
    title: "So sánh giá & chọn sản phẩm đáng mua",
    description: "GoodPick giúp bạn so sánh giá, xem đánh giá độc lập và chọn đúng đồ công nghệ, gia dụng, làm vườn với ưu đãi được kiểm tra.",
    path: "/",
  });
  return query ? { ...meta, robots: { index: false, follow: true } } : meta;
}

const categoryIcons: Record<string, ReactNode> = {
  tech: <Cpu aria-hidden="true" />,
  "home-kitchen": <House aria-hidden="true" />,
  garden: <Sprout aria-hidden="true" />,
  tools: <Wrench aria-hidden="true" />,
  outdoor: <TentTree aria-hidden="true" />,
  beauty: <Sparkles aria-hidden="true" />,
};

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "USD" }).format(value);

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const category = typeof params.category === "string" ? params.category : "";
  const products = await getStorefrontProducts({ query, category, limit: 12, demoFallback: true });
  const allProducts = query || category
    ? await getStorefrontProducts({ limit: 12, demoFallback: true })
    : products;
  const featured = allProducts.find((product) => product.featured) || allProducts[0];
  const featuredProducts = allProducts.filter((product) => product.featured).slice(0, 4);
  const featuredList = featuredProducts.length >= 3 ? featuredProducts : allProducts.slice(0, 4);
  const socialProofProducts = [...allProducts]
    .filter((product) => product.ratingCount > 0)
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 3);
  const highestDiscount = Math.max(...allProducts.map((product) => product.discountPercent), 0);

  let guides: HomepageArticle[] = [];
  try {
    guides = (await getHomepageArticles()).latest.slice(0, 3);
  } catch { /* The product storefront remains available when editorial content is unavailable. */ }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sản phẩm được GoodPick đề xuất",
    itemListElement: allProducts.slice(0, 12).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: `${normalizeSiteUrl()}/products/${product.slug}`,
    })),
  };

  return (
    <div className={styles.page}>
      <StorefrontHeader query={query} />
      {!query && !category && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />}

      {!query && !category && featured && (
        <section className={styles.hero} aria-labelledby="home-title" data-motion="fade">
          <div className={styles.heroMain}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Chọn kỹ trước khi mua</p>
              <h1 id="home-title">Mua đúng ngay từ lần đầu.</h1>
              <p>GoodPick lọc bớt quảng cáo, so sánh điểm đáng tiền và giúp bạn đi thẳng tới lựa chọn phù hợp.</p>
              <div className={styles.heroButtons}>
                <Link href="#featured" className={styles.primaryButton}>Xem sản phẩm nổi bật <ArrowRight size={17} /></Link>
                <Link href="#how-we-pick" className={styles.secondaryButton}>Cách chúng tôi đánh giá</Link>
              </div>
              <p className={styles.heroFootnote}><ShieldCheck size={15} /> Giá và ưu đãi được ghi rõ thời điểm kiểm tra.</p>
            </div>
            <Link href={`/products/${featured.slug}`} className={styles.heroVisual} aria-label={`Xem ${featured.name}`}>
              {featured.images[0]?.url && (
                // Product images may be served by admin-configured retailer CDNs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.images[0].url}
                  alt={featured.images[0].alt || featured.name}
                  width="800"
                  height="800"
                  fetchPriority="high"
                  decoding="async"
                />
              )}
              <span className={styles.heroImageShade} />
              <span className={styles.floatingPrice}><span>GoodPick hôm nay</span><strong>{money(featured.price)}</strong></span>
            </Link>
          </div>
          <div className={styles.heroSide}>
            <Link href="#deals" className={styles.sideCard}>
              <span>Radar giảm giá <ArrowRight size={17} /></span>
              <div><strong>Ưu đãi đáng để mở.</strong><p>Sản phẩm hữu ích, mức giảm rõ ràng và được kiểm tra thường xuyên.</p></div>
              {highestDiscount > 0 && <b className={styles.sideCardBadge}>-{highestDiscount}%</b>}
            </Link>
            <Link href="#guides" className={styles.sideCard}>
              <span>Hướng dẫn chọn mua <ArrowRight size={17} /></span>
              <div><strong>Hiểu đủ trước khi chốt.</strong><p>Giải thích thông số bằng ngôn ngữ dễ hiểu và chỉ rõ ai nên mua.</p></div>
            </Link>
          </div>
        </section>
      )}

      <section className={styles.trustStrip} aria-label="Cam kết của GoodPick" data-motion="fade">
        <div className={styles.trustItem}><BadgeCheck size={21} /><div><strong>Biên tập viên kiểm tra</strong><span>Danh sách do con người chọn lọc</span></div></div>
        <div className={styles.trustItem}><SearchCheck size={21} /><div><strong>So sánh nhiều nơi bán</strong><span>Đặt ưu đãi cạnh nhau</span></div></div>
        <div className={styles.trustItem}><RefreshCw size={21} /><div><strong>Hiển thị ngày kiểm tra</strong><span>Biết dữ liệu được cập nhật khi nào</span></div></div>
        <div className={styles.trustItem}><ShieldCheck size={21} /><div><strong>Hoa hồng minh bạch</strong><span>Bạn không phải trả thêm phí</span></div></div>
      </section>

      {!query && !category && featuredList.length > 0 && (
        <section className={`${styles.sectionAlt} ${styles.featuredSection}`} id="featured">
          <div className={`${styles.section} ${styles.sectionInner}`}>
            <div className={styles.sectionHeading} data-motion="fade">
              <div><p className={styles.eyebrow}>Được chọn kỹ</p><h2>Sản phẩm nổi bật tuần này</h2><p className={styles.sectionLead}>Những lựa chọn cân bằng tốt giữa chất lượng, tính thực dụng và mức giá hiện tại.</p></div>
              <Link href="#deals">Xem tất cả <ArrowRight size={15} /></Link>
            </div>
            <div className={styles.productGrid}>{featuredList.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </div>
        </section>
      )}

      {!query && !category && (
        <section className={styles.section} data-motion="fade">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Bắt đầu từ nhu cầu</p><h2>Khám phá theo danh mục</h2></div>
          </div>
          <div className={styles.categoryGrid}>
            {STOREFRONT_CATEGORIES.map((item) => (
              <Link className={styles.categoryCard} href={`/?category=${item.slug}#deals`} key={item.slug}>
                <span className={styles.categoryIcon}>{categoryIcons[item.slug]}</span>
                <strong>{item.label}</strong>
                <span>Xem sản phẩm đề xuất <ArrowRight size={12} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section} id="deals">
        <div className={styles.sectionHeading} data-motion="fade">
          <div>
            <p className={styles.eyebrow}>{query ? "Kết quả tìm kiếm" : category ? "Theo danh mục" : "Mới kiểm tra"}</p>
            <h2>{query ? `Kết quả cho “${query}”` : category ? STOREFRONT_CATEGORIES.find((item) => item.slug === category)?.label || "Sản phẩm" : "Ưu đãi đáng giới thiệu cho bạn bè"}</h2>
          </div>
          {(query || category) && <Link href="/">Xóa bộ lọc <ArrowRight size={15} /></Link>}
        </div>
        {products.length ? (
          <div className={styles.productGrid}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        ) : (
          <div className={styles.emptyState}><h3>Chưa có kết quả phù hợp</h3><p>Hãy thử tên sản phẩm ngắn hơn hoặc xem toàn bộ đề xuất của GoodPick.</p></div>
        )}
      </section>

      {!query && !category && (
        <>
          {socialProofProducts.length > 0 && (
            <section className={styles.proofSection} aria-labelledby="proof-heading">
              <div className={styles.proofIntro} data-motion="fade">
                <p className={styles.eyebrow}>Tín hiệu từ người mua</p>
                <h2 id="proof-heading">Được cộng đồng quan tâm.</h2>
                <p>Chúng tôi dùng số lượt và điểm đánh giá có trong dữ liệu sản phẩm, không dựng lời nhận xét ẩn danh.</p>
              </div>
              <div className={styles.proofGrid}>
                {socialProofProducts.map((product) => (
                  <Link href={`/products/${product.slug}`} className={styles.proofCard} key={product.id} data-motion="scale">
                    <div className={styles.proofStars}><Star size={16} fill="currentColor" /> {product.rating.toFixed(1)}</div>
                    <strong>{product.name}</strong>
                    <p>{product.shortDescription}</p>
                    <span>{product.ratingCount.toLocaleString("vi-VN")} lượt đánh giá <ArrowRight size={14} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section} id="how-we-pick" data-motion="fade">
            <div className={styles.method}>
              <div><p className={styles.eyebrow}>Quy trình GoodPick</p><h2>Ít quảng cáo.<br />Nhiều thông tin hữu ích.</h2><p>Mỗi sản phẩm phải hợp lý về chất lượng, giá và những chi tiết thực tế bạn sẽ nhận ra sau khi mở hộp.</p></div>
              <div className={styles.methodSteps}>
                <div className={styles.methodStep}><span>1</span><strong>Lập danh sách rút gọn</strong><p>So sánh thông số, phản hồi người dùng và nhu cầu sử dụng thực tế.</p></div>
                <div className={styles.methodStep}><span>2</span><strong>Kiểm tra ưu đãi</strong><p>Hiển thị nơi bán, mã giảm giá, vận chuyển và ngày kiểm tra.</p></div>
                <div className={styles.methodStep}><span>3</span><strong>Nói rõ ai phù hợp</strong><p>Nêu cả ưu, nhược điểm; không tuyên bố “hoàn hảo cho mọi người”.</p></div>
              </div>
            </div>
          </section>

          {guides.length > 0 && (
            <section className={styles.sectionAlt} id="guides">
              <div className={`${styles.section} ${styles.sectionInner}`}>
                <div className={styles.sectionHeading} data-motion="fade"><div><p className={styles.eyebrow}>Biết trước khi mua</p><h2>Hướng dẫn chọn mua thực tế</h2></div><Link href="/latest">Xem tất cả <ArrowRight size={15} /></Link></div>
                <div className={styles.guideGrid}>
                  {guides.map((guide) => (
                    <Link href={`/bai-viet/${guide.slug}`} className={styles.guideCard} key={guide.id} data-motion="scale">
                      <div className={styles.guideImage}>{guide.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={guide.thumbnailUrl} alt="" width="720" height="440" loading="lazy" decoding="async" />
                      )}</div>
                      <span>{guide.categoryName || "Hướng dẫn chọn mua"}</span><h3>{guide.title}</h3><p>{guide.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className={styles.newsletter} id="newsletter" data-motion="scale">
            <div><h2>Bản tin ưu đãi hữu ích.</h2><p>Một bản tổng hợp có chọn lọc: giá giảm, sản phẩm đáng mua và không có nội dung thừa.</p></div>
            <StorefrontNewsletter />
          </section>
        </>
      )}
      <StorefrontFooter />
    </div>
  );
}
