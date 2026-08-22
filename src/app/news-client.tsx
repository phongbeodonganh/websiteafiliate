"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LeadCapture from "@/components/LeadCapture";
import TopPicksWidget from "@/components/TopPicksWidget";
import CategoryArticleSections from "@/components/CategoryArticleSections";
import EditorialHeader from "@/components/EditorialHeader";
import EditorialFooter from "@/components/EditorialFooter";
import EditorialBackdrop from "@/components/EditorialBackdrop";
import PublicArticleImage, { ARTICLE_PLACEHOLDER } from "@/components/PublicArticleImage";
import styles from "./page.module.css";

const fallbackImage = ARTICLE_PLACEHOLDER;

export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  isFeatured: boolean;
  viewCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  categoryName?: string | null;
  authorName?: string | null;
  authorAvatar?: string | null;
};

export type HomepageArticleData = {
  latest: Article[];
  popular: Article[];
  editorial: Article[];
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type ArticleResponse = {
  status: "success" | "error";
  data?: Article[];
  message?: string;
};

const articleHref = (article: Article) => `/article/${article.slug}`;
const imageFor = (article: Article) => article.thumbnailUrl || fallbackImage;

function plainText(value?: string) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function descriptionFor(article: Article) {
  const description = plainText(article.excerpt) || plainText(article.content);
  return description.length > 150 ? `${description.slice(0, 147)}...` : description;
}

function readingTime(article: Article) {
  const words = plainText(article.content).split(" ").filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} MIN READ`;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "RECENTLY";
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes} MIN AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} HOUR${hours > 1 ? "S" : ""} AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAY${days > 1 ? "S" : ""} AGO`;
}

async function fetchArticles(params: URLSearchParams, signal: AbortSignal) {
  const response = await fetch(`/api/v1/public/articles?${params.toString()}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as ArticleResponse;
  if (!response.ok || payload.status !== "success") {
    throw new Error(payload.message || "Could not load articles");
  }
  return payload.data || [];
}

type TechFinanceNewsClientProps = {
  initialData?: HomepageArticleData;
  initialQuery?: string;
};

export default function TechFinanceNewsClient({
  initialData,
  initialQuery = "",
}: TechFinanceNewsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [latest, setLatest] = useState<Article[]>(initialData?.latest || []);
  const [popular, setPopular] = useState<Article[]>(initialData?.popular || []);
  const [editorial, setEditorial] = useState<Article[]>(initialData?.editorial || []);
  const activeQuery = searchParams.get("q")?.trim() || "";
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const isInitialRequest = useRef(true);
  const hasMatchingInitialData = useRef(Boolean(initialData && activeQuery === initialQuery));

  useEffect(() => {
    if (isInitialRequest.current) {
      isInitialRequest.current = false;
      if (hasMatchingInitialData.current) return;
    }

    setLoading(true);
    setError("");
    const controller = new AbortController();
    const latestParams = new URLSearchParams({ limit: "8" });
    const popularParams = new URLSearchParams({ tab: "popular", limit: "2" });
    const editorialParams = new URLSearchParams({ tab: "hot", limit: "3" });
    if (activeQuery) {
      latestParams.set("q", activeQuery);
      popularParams.set("q", activeQuery);
      editorialParams.set("q", activeQuery);
    }

    Promise.all([
      fetchArticles(latestParams, controller.signal),
      fetchArticles(popularParams, controller.signal),
      fetchArticles(editorialParams, controller.signal),
    ])
      .then(([latestArticles, popularArticles, editorialArticles]) => {
        setLatest(latestArticles);
        setPopular(popularArticles);
        setEditorial(editorialArticles);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Could not load articles");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeQuery]);

  function clearSearch() {
    setError("");
    if (activeQuery) {
      setLoading(true);
      router.push('/');
    }
  }

  const featured = latest.find((article) => article.isFeatured) || latest[0];
  const latestArticles = latest.filter((article) => article.id !== featured?.id).slice(0, 5);
  const editorialFiltered = editorial.filter((article) => article.id !== featured?.id);
  const displayEditorial = editorialFiltered.length >= 3
    ? editorialFiltered.slice(0, 3)
    : latest.filter((article) => article.id !== featured?.id).slice(0, 3);

  return (
    <main className={styles.page}>
      <EditorialBackdrop section="NEWSROOM" />
      <EditorialHeader initialSearchQuery={activeQuery} />

      {activeQuery && !loading && (
        <div className={styles.resultsBar}>
          Results for “{activeQuery}”
          <button type="button" onClick={clearSearch}>Clear</button>
        </div>
      )}
      {error && <p className={styles.statusMessage}>Unable to load articles: {error}</p>}
      {loading && (
        <div className={styles.loadingScreen} role="status" aria-live="polite">
          <span className={styles.loadingSpinner} aria-hidden="true" />
          <p>Loading articles...</p>
        </div>
      )}
      {!loading && !error && !featured && <p className={styles.statusMessage}>No published articles found.</p>}

      {featured && (
        <>
          <div className={styles.shell}>
            <section className={`${styles.featured} clickable-card`} aria-labelledby="featured-title" data-motion="rise">
              <div className={styles.sectionRule} />
              <div className={styles.featuredAccent} />
              <div className={styles.featuredCopy}>
                <p className={styles.eyebrow}>{activeQuery ? "SEARCH RESULT" : "FEATURED STORY"}</p>
                <h1 id="featured-title"><Link className="card-stretched-link" href={articleHref(featured)}>{featured.title}</Link></h1>
                <p className={styles.lede}>{descriptionFor(featured)}</p>
                <p className={styles.meta}>
                  By {featured.authorName || "AIDEALSUK Team"} &middot; {formatDate(featured.createdAt) || relativeTime(featured.createdAt)} &middot; {readingTime(featured)} &middot; {featured.categoryName || "NEWS"}
                </p>
                <Link className={styles.featuredRead} href={articleHref(featured)}>Read full story <span aria-hidden="true">&rarr;</span></Link>
              </div>
              <Link className={styles.featuredMedia} href={articleHref(featured)}>
                <PublicArticleImage src={imageFor(featured)} alt={featured.title} loading="eager" fetchPriority="high" />
              </Link>
            </section>

            <section className={styles.hottest} aria-labelledby="hottest-title" data-motion="rise">
              <div className={styles.sectionRule} />
              <h2 id="hottest-title">HOTTEST ARTICLES</h2>
              <p className={styles.meta}>MOST READ TODAY</p>
              {popular.map((article, index) => (
                <article className={`${styles.hotItem} clickable-card`} key={article.id} data-motion="rise" style={{ '--motion-delay': `${index * 60}ms` } as React.CSSProperties}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <div>
                    <p className={styles.meta}>By {article.authorName || "Staff"} &middot; {formatDate(article.createdAt)} &middot; {article.viewCount} VIEWS</p>
                    <h3><Link className="card-stretched-link" href={articleHref(article)}>{article.title}</Link></h3>
                  </div>
                  <Link href={articleHref(article)}><PublicArticleImage src={imageFor(article)} alt="" loading="lazy" /></Link>
                </article>
              ))}
              <Link className={styles.sectionViewAll} href="/hottest">VIEW ALL HOTTEST ARTICLES</Link>
            </section>

            <aside className={styles.latest} aria-labelledby="latest-title" data-motion="rise" style={{ '--motion-delay': '70ms' } as React.CSSProperties}>
              <div className={styles.sectionRule} />
              <h2 id="latest-title">LATEST ARTICLES</h2>
              <div className={styles.latestList}>
                {latestArticles.map((article) => (
                  <article className={`${styles.latestItem} clickable-card`} key={article.id} data-motion="rise">
                    <Link href={articleHref(article)}><PublicArticleImage src={imageFor(article)} alt="" loading="lazy" /></Link>
                    <div>
                      <p className={styles.meta}>By {article.authorName || "Staff"} &middot; {formatDate(article.createdAt) || relativeTime(article.createdAt)} &middot; {article.categoryName || "NEWS"}</p>
                      <h3><Link className="card-stretched-link" href={articleHref(article)}>{article.title}</Link></h3>
                    </div>
                  </article>
                ))}
              </div>
              <Link className={styles.sectionViewAll} href="/latest">VIEW ALL LATEST ARTICLES</Link>
            </aside>
          </div>

          <div className={styles.editorialSection} data-motion="rise">
            <section className={styles.editorial} aria-labelledby="editorial-title">
              <div className={styles.sectionRule} />
              <p className={styles.eyebrow}>CURATED BY OUR EDITORS</p>
              <h2 id="editorial-title">EDITORIAL PICKS</h2>
              <div className={styles.editorialGrid}>
                {displayEditorial.map((article, idx) => (
                  <article className={`${styles.editorialCard} clickable-card`} key={article.id} data-motion="rise" style={{ '--motion-delay': `${idx * 60}ms` } as React.CSSProperties}>
                    <div className={styles.editorialCardMedia}>
                      <PublicArticleImage src={imageFor(article)} alt={article.title} loading="lazy" />
                    </div>
                    <p className={styles.meta}>
                      {article.categoryName || "NEWS"} &middot; {formatDate(article.createdAt) || relativeTime(article.createdAt)} &middot; {readingTime(article)}
                    </p>
                    <h3>
                      <Link className="card-stretched-link" href={articleHref(article)}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className={styles.editorialExcerpt}>{descriptionFor(article)}</p>
                  </article>
                ))}
              </div>
              <Link className={styles.sectionViewAll} href="/editorial-picks">VIEW ALL EDITORIAL PICKS</Link>
            </section>
          </div>
        </>
      )}

      <div className={styles.affiliateSection} data-motion="rise">
        <TopPicksWidget variant="editorial" viewAllHref="/affiliates" />
      </div>

      <div className={styles.leadCapture} data-motion="fade">
        <LeadCapture variant="editorial" />
      </div>

      <div className={styles.categorySections}>
        <CategoryArticleSections />
      </div>

      <EditorialFooter />
    </main>
  );
}
