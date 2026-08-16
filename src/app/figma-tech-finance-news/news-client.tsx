"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import LeadCapture from "@/components/LeadCapture";
import TopPicksWidget from "@/components/TopPicksWidget";
import CategoryArticleSections from "@/components/CategoryArticleSections";
import styles from "./page.module.css";

const fallbackImage =
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";

type Article = {
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
};

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
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as ArticleResponse;
  if (!response.ok || payload.status !== "success") {
    throw new Error(payload.message || "Could not load articles");
  }
  return payload.data || [];
}

export default function TechFinanceNewsClient() {
  const [latest, setLatest] = useState<Article[]>([]);
  const [popular, setPopular] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const latestParams = new URLSearchParams({ limit: "8" });
    const popularParams = new URLSearchParams({ tab: "popular", limit: "2" });
    if (activeQuery) {
      latestParams.set("q", activeQuery);
      popularParams.set("q", activeQuery);
    }

    Promise.all([
      fetchArticles(latestParams, controller.signal),
      fetchArticles(popularParams, controller.signal),
    ])
      .then(([latestArticles, popularArticles]) => {
        setLatest(latestArticles);
        setPopular(popularArticles);
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setActiveQuery(query.trim());
  }

  function clearSearch() {
    setQuery("");
    setError("");
    if (activeQuery) setLoading(true);
    setActiveQuery("");
  }

  const featured = latest.find((article) => article.isFeatured) || latest[0];
  const latestArticles = latest.filter((article) => article.id !== featured?.id).slice(0, 5);
  const editorialArticles = latest.filter(
    (article) => article.id !== featured?.id && !popular.some((item) => item.id === article.id),
  );
  const editorialLead = editorialArticles[0] || latestArticles[0];
  const miniArticles = editorialArticles.slice(1, 3);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/">AIDEALSUK</Link>
        <form className={styles.searchBox} role="search" onSubmit={handleSearch}>
          <Search aria-hidden="true" className={styles.searchIcon} size={32} strokeWidth={1.7} />
          <input aria-label="Search articles" onChange={(event) => setQuery(event.target.value)} placeholder="Search articles" type="search" value={query} />
          <button type="submit">Search</button>
        </form>
        <nav className={styles.actions} aria-label="Account links">
          <Link href="/admin/login">Sign up</Link>
          <Link href="/admin/login">Sign in</Link>
        </nav>
      </header>

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
        <div className={styles.shell}>
          <section className={styles.featured} aria-labelledby="featured-title">
            <div className={styles.sectionRule} />
            <div className={styles.featuredCopy}>
              <p className={styles.eyebrow}>{activeQuery ? "SEARCH RESULT" : "FEATURED STORY"}</p>
              <h1 id="featured-title"><Link href={articleHref(featured)}>{featured.title}</Link></h1>
              <p className={styles.lede}>{descriptionFor(featured)}</p>
              <p className={styles.meta}>{readingTime(featured)} &middot; {featured.categoryName || "NEWS"}</p>
            </div>
            <Link className={styles.featuredMedia} href={articleHref(featured)}>
              <img src={imageFor(featured)} alt={featured.title} />
            </Link>
          </section>

          <aside className={styles.latest} aria-labelledby="latest-title">
            <div className={styles.sectionRule} />
            <h2 id="latest-title">LATEST ARTICLES</h2>
            <div className={styles.latestList}>
              {latestArticles.map((article) => (
                <article className={styles.latestItem} key={article.id}>
                  <Link href={articleHref(article)}><img src={imageFor(article)} alt="" /></Link>
                  <div>
                    <p className={styles.meta}>{relativeTime(article.createdAt)} &middot; {article.categoryName || "NEWS"}</p>
                    <h3><Link href={articleHref(article)}>{article.title}</Link></h3>
                  </div>
                </article>
              ))}
            </div>
            <Link className={styles.blackButton} href={activeQuery ? `/?q=${encodeURIComponent(activeQuery)}` : "/"}>VIEW ALL LATEST ARTICLES</Link>
          </aside>

          <section className={styles.hottest} aria-labelledby="hottest-title">
            <div className={styles.sectionRule} />
            <h2 id="hottest-title">HOTTEST ARTICLES</h2>
            <p className={styles.meta}>MOST READ TODAY</p>
            {popular.map((article, index) => (
              <article className={styles.hotItem} key={article.id}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <p className={styles.meta}>{article.categoryName || "NEWS"} &middot; {readingTime(article)} &middot; {article.viewCount} VIEWS</p>
                  <h3><Link href={articleHref(article)}>{article.title}</Link></h3>
                </div>
                <Link href={articleHref(article)}><img src={imageFor(article)} alt="" /></Link>
              </article>
            ))}
          </section>

          <section className={styles.editorial} aria-labelledby="editorial-title">
            <div className={styles.sectionRule} />
            <p className={styles.eyebrow}>CURATED BY OUR EDITORS</p>
            <h2 id="editorial-title">EDITORIAL PICKS</h2>
            {editorialLead && (
              <article className={styles.editorialLead}>
                <Link href={articleHref(editorialLead)}><img src={imageFor(editorialLead)} alt={editorialLead.title} /></Link>
                <div>
                  <p className={styles.meta}>EDITOR&apos;S PICK &middot; {readingTime(editorialLead)}</p>
                  <h3><Link href={articleHref(editorialLead)}>{editorialLead.title}</Link></h3>
                  <p>{descriptionFor(editorialLead)}</p>
                </div>
              </article>
            )}
            {miniArticles.length > 0 && (
              <div className={styles.miniGrid}>
                {miniArticles.map((article) => (
                  <article key={article.id}>
                    <p className={styles.meta}>{article.categoryName || "NEWS"} &middot; {readingTime(article)}</p>
                    <h3><Link href={articleHref(article)}>{article.title}</Link></h3>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <div className={styles.affiliateSection}>
        <TopPicksWidget variant="editorial" />
      </div>

      <div className={styles.leadCapture}>
        <LeadCapture variant="editorial" />
      </div>

      <div className={styles.categorySections}>
        <CategoryArticleSections />
      </div>

      <footer className={styles.footer}>
        <Link className={styles.footerLogo} href="/">AIDEALSUK</Link>
      </footer>
    </main>
  );
}
