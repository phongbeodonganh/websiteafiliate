"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
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

function featuredDescriptionFor(article: Article) {
  return plainText(article.excerpt) || descriptionFor(article);
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
  const [requestNonce, setRequestNonce] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredPaused, setFeaturedPaused] = useState(false);
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
    const latestParams = new URLSearchParams({ limit: "10" });
    const popularParams = new URLSearchParams({ tab: "popular", limit: "6" });
    const editorialParams = new URLSearchParams({ tab: "editorial", limit: "6" });
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
  }, [activeQuery, requestNonce]);

  // Each lane keeps one clear meaning: latest by publication time, popular by
  // views, and editorial by the explicit isFeatured choice in the CMS.
  const featuredArticles = latest.slice(0, 5);
  const activeFeaturedIndex = featuredArticles.length
    ? featuredIndex % featuredArticles.length
    : 0;
  const featured = featuredArticles[activeFeaturedIndex];

  useEffect(() => {
    if (featuredPaused || featuredArticles.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredArticles.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [featuredArticles.length, featuredPaused]);

  function clearSearch() {
    setError("");
    if (activeQuery) {
      setLoading(true);
      router.push('/');
    }
  }

  function retryArticles() {
    setError("");
    setLoading(true);
    setRequestNonce((current) => current + 1);
  }

  const secondaryArticles = popular
    .map((article, index) => ({ article, rank: index + 1 }))
    .filter(({ article }) => article.id !== featured?.id)
    .slice(0, 2);
  const displayEditorial = editorial.filter((article) => article.id !== featured?.id).slice(0, 3);

  return (
    <main className={styles.page}>
      <EditorialBackdrop section="NEWSROOM" />
      <EditorialHeader initialSearchQuery={activeQuery} />

      {!activeQuery && (
        <section className={styles.heroIntro} aria-labelledby="homepage-hero-title" data-motion="fade">
          <div className={styles.heroSignal} aria-hidden="true" />
          <div className={styles.heroScan} aria-hidden="true"><span /></div>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Independent intelligence for the AI economy</p>
            <h1 id="homepage-hero-title">
              <span className={styles.heroTitleLine}>Read the signal.</span>
              <span className={styles.heroTitleAccent}>Build what comes next.</span>
            </h1>
            <p className={styles.heroLede}>
              Sharp reporting on artificial intelligence, money, and the tools worth your attention—edited for people making real decisions.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.heroPrimaryAction} href="/latest">
                Read Latest News <ArrowUpRight aria-hidden="true" />
              </Link>
              <Link className={styles.heroSecondaryAction} href="/affiliates">
                Explore AI Tools <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className={styles.signalPanel} aria-label="AIDEALSUK coverage desk">
            <div className={styles.signalPanelHeader}>
              <span>AIDEALSUK / SIGNAL DESK</span>
              <span className={styles.signalStatus}><i aria-hidden="true" /> Current edition</span>
            </div>
            <p className={styles.signalKicker}>What we track</p>
            <div className={styles.signalTopics}>
              <div><span>Reporting</span><strong>AI systems &amp; automation</strong></div>
              <div><span>Markets</span><strong>Capital, policy &amp; finance</strong></div>
              <div><span>Reviews</span><strong>Tools worth paying for</strong></div>
            </div>
            <p className={styles.signalFootnote}>Clarity over volume. Evidence over hype.</p>
          </aside>
        </section>
      )}

      {activeQuery && !loading && (
        <div className={styles.resultsBar}>
          Results for “{activeQuery}”
          <button type="button" onClick={clearSearch}>Clear</button>
        </div>
      )}
      {loading && !featured && (
        <div className={`${styles.shell} ${styles.stateShell}`} role="status" aria-live="polite" aria-label="Loading the latest stories">
          <div className={`${styles.featured} ${styles.featuredSkeleton}`} aria-hidden="true">
            <span className={styles.skeletonEyebrow} />
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonTitleShort} />
            <span className={styles.skeletonCopy} />
            <span className={styles.skeletonCopyShort} />
          </div>
          <div className={`${styles.hottest} ${styles.listSkeleton}`} aria-hidden="true">
            <span className={styles.skeletonHeading} />
            <span className={styles.skeletonRow} />
            <span className={styles.skeletonRow} />
          </div>
          <div className={`${styles.latest} ${styles.listSkeleton}`} aria-hidden="true">
            <span className={styles.skeletonHeading} />
            <span className={styles.skeletonRow} />
            <span className={styles.skeletonRow} />
            <span className={styles.skeletonRow} />
          </div>
          <span className={styles.srOnly}>Loading articles...</span>
        </div>
      )}

      {!loading && !featured && (
        <section className={styles.newsState} aria-live="polite">
          <p className={styles.eyebrow}>{error ? "NEWSROOM UNAVAILABLE" : activeQuery ? "NO MATCHES" : "NEWSROOM"}</p>
          <h1>{error ? "We couldn't load the latest stories." : activeQuery ? `No stories found for “${activeQuery}”.` : "No published stories yet."}</h1>
          <p>
            {error
              ? "The newsroom feed did not respond. Try again to reload the latest reporting."
              : activeQuery
                ? "Try another search, or return to the complete latest-news feed."
                : "New reporting will appear here as soon as it is published."}
          </p>
          <div className={styles.newsStateActions}>
            {error && <button type="button" onClick={retryArticles}>Try again</button>}
            {activeQuery && <button type="button" className={styles.secondaryAction} onClick={clearSearch}>Clear search</button>}
            <Link href="/latest" className={styles.secondaryAction}>Browse latest</Link>
          </div>
          {error && <details><summary>Technical details</summary><p>{error}</p></details>}
        </section>
      )}

      {featured && (
        <section className={styles.storyDesk} aria-labelledby="story-desk-title">
          <div className={styles.storyDeskHeader} data-motion="rise">
            <div>
              <p className={styles.eyebrow}>{activeQuery ? "SEARCH DESK" : "NEWSROOM UPDATE"}</p>
              <h2 id="story-desk-title">{activeQuery ? "MATCHING STORIES" : "LATEST NEWS"}</h2>
            </div>
            <Link href="/latest">All latest news <ArrowUpRight aria-hidden="true" /></Link>
          </div>

          <div className={styles.bentoGrid}>
            <section
              className={`${styles.featured} ${styles.bentoLead}`}
              aria-labelledby="featured-title"
              aria-roledescription="carousel"
              aria-label="Latest published stories"
              data-motion="rise"
              data-paused={featuredPaused ? "true" : undefined}
              onMouseEnter={() => setFeaturedPaused(true)}
              onMouseLeave={() => setFeaturedPaused(false)}
              onFocusCapture={() => setFeaturedPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFeaturedPaused(false);
              }}
            >
              <div className={styles.sectionRule} />
              <div className={styles.featuredAccent} />
              <Link className={styles.featuredMedia} href={articleHref(featured)} aria-label={`Read ${featured.title}`}>
                <PublicArticleImage key={featured.id} src={imageFor(featured)} alt="" loading="eager" fetchPriority="high" />
              </Link>
              <div className={styles.featuredShade} aria-hidden="true" />
              <div className={styles.featuredCopy} key={featured.id} aria-live="polite" aria-atomic="true">
                <p className={styles.eyebrow}>{activeQuery ? "SEARCH RESULT" : "LATEST PUBLISHED"}</p>
                <h1 id="featured-title"><Link className="card-stretched-link" href={articleHref(featured)}>{featured.title}</Link></h1>
                <p className={styles.lede}>{featuredDescriptionFor(featured)}</p>
                <p className={styles.meta}>
                  By {featured.authorName || "AIDEALSUK Team"} &middot; {formatDate(featured.createdAt) || relativeTime(featured.createdAt)} &middot; {readingTime(featured)} &middot; {featured.categoryName || "NEWS"}
                </p>
                <Link className={styles.featuredRead} href={articleHref(featured)}>Read full story <span aria-hidden="true">&rarr;</span></Link>
              </div>
              {featuredArticles.length > 1 && (
                <div className={styles.featuredControls} aria-label="Featured story controls">
                  <button
                    type="button"
                    onClick={() => setFeaturedIndex((current) => (current - 1 + featuredArticles.length) % featuredArticles.length)}
                    aria-label="Previous featured story"
                    title="Previous story"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <div className={styles.featuredDots}>
                    {featuredArticles.map((article, index) => (
                      <button
                        type="button"
                        key={article.id}
                        className={index === activeFeaturedIndex ? styles.featuredDotActive : undefined}
                        onClick={() => setFeaturedIndex(index)}
                        aria-label={`Show featured story ${index + 1}`}
                        aria-current={index === activeFeaturedIndex ? "true" : undefined}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeaturedIndex((current) => (current + 1) % featuredArticles.length)}
                    aria-label="Next featured story"
                    title="Next story"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              )}
            </section>

            {secondaryArticles.map(({ article, rank }, index) => (
              <article
                className={`${styles.bentoCard} ${styles.bentoSecondary} clickable-card`}
                key={article.id}
                data-motion="rise"
                style={{ '--motion-delay': `${70 + index * 60}ms` } as React.CSSProperties}
              >
                <div className={styles.bentoCardMedia}>
                  <PublicArticleImage src={imageFor(article)} alt="" loading="lazy" />
                  <span>{String(rank).padStart(2, "0")}</span>
                </div>
                <div className={styles.bentoCardBody}>
                  <p className={styles.meta}>MOST READ #{rank} &middot; {article.viewCount.toLocaleString("en-US")} VIEWS</p>
                  <h3><Link className="card-stretched-link" href={articleHref(article)}>{article.title}</Link></h3>
                  <p>{descriptionFor(article)}</p>
                  <span className={styles.bentoRead}>Read story <ArrowUpRight aria-hidden="true" /></span>
                </div>
              </article>
            ))}
          </div>

          {displayEditorial.length > 0 && (
            <section className={styles.editorialShelf} aria-labelledby="editorial-picks-title">
              <div className={styles.editorialShelfHeader} data-motion="rise">
                <div>
                  <p className={styles.eyebrow}>SELECTED BY THE EDITORS</p>
                  <h3 id="editorial-picks-title">EDITORIAL PICKS</h3>
                  <p>Stories selected for their depth, usefulness, and lasting relevance.</p>
                </div>
                <Link href="/editorial-picks">View all picks <ArrowUpRight aria-hidden="true" /></Link>
              </div>
              <div className={styles.editorialShelfGrid}>
                {displayEditorial.map((article, index) => (
                  <article
                    className={`${styles.bentoCard} ${styles.bentoEditorialCard} clickable-card`}
                    key={article.id}
                    data-motion="rise"
                    style={{ '--motion-delay': `${190 + index * 55}ms` } as React.CSSProperties}
                  >
                    <div className={styles.bentoCardMedia}>
                      <PublicArticleImage src={imageFor(article)} alt="" loading="lazy" />
                    </div>
                    <div className={styles.bentoCardBody}>
                      <p className={styles.meta}>EDITOR&apos;S PICK &middot; {article.categoryName || "NEWS"} &middot; {readingTime(article)}</p>
                      <h3><Link className="card-stretched-link" href={articleHref(article)}>{article.title}</Link></h3>
                      <p>{descriptionFor(article)}</p>
                      <span className={styles.bentoRead}>Read selected story <ArrowUpRight aria-hidden="true" /></span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className={styles.storyDeskFooter}>
            <Link href="/hottest">View the full most-read ranking</Link>
          </div>
        </section>
      )}

      <div className={styles.categorySections}>
        <CategoryArticleSections />
      </div>

      <section className={styles.conversionZone} aria-labelledby="conversion-title" data-motion="rise">
        <div className={styles.conversionHeading}>
          <p className={styles.heroEyebrow}>Go deeper. Spend smarter.</p>
          <h2 id="conversion-title">THE INSIDER DESK</h2>
          <p>Editor-vetted offers and one useful weekly briefing—built for readers who want an edge without the noise.</p>
        </div>
        <div className={styles.conversionGrid}>
          <div className={styles.affiliateSection}>
            <TopPicksWidget variant="editorial" viewAllHref="/affiliates" />
          </div>
          <div className={styles.leadCapture}>
            <LeadCapture variant="editorial" />
          </div>
        </div>
      </section>

      <EditorialFooter />
    </main>
  );
}
