'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Eye, Loader2, Search, ShieldCheck, Star } from 'lucide-react';
import styles from './page.module.css';

const fallbackImage =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

export type CollectionKind = 'latest' | 'editorial' | 'hottest' | 'affiliates';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
  categoryName?: string;
}

interface Affiliate {
  id: string;
  name: string;
  commission: string;
  cookie: string;
  isTopPick: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

const collectionConfig: Record<CollectionKind, { title: string; eyebrow: string; description: string }> = {
  latest: {
    title: 'Latest Articles',
    eyebrow: 'Recently Published',
    description: 'The newest technology, finance and AI stories from our editorial desk.',
  },
  editorial: {
    title: 'Editorial Picks',
    eyebrow: "Editor's Choice",
    description: 'Featured reporting and analysis selected by our editors.',
  },
  hottest: {
    title: 'Hottest Articles',
    eyebrow: 'Most Read',
    description: 'The stories attracting the most readers right now.',
  },
  affiliates: {
    title: 'Affiliate Deals',
    eyebrow: 'Partner Directory',
    description: 'Our current collection of partner tools, offers and commission programs.',
  },
};

function excerptFor(article: Article) {
  const text = (article.excerpt || article.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 145 ? `${text.slice(0, 142)}...` : text;
}

export default function CollectionClient({ kind }: { kind: CollectionKind }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 9, totalPages: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const config = collectionConfig[kind];

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: '1', limit: '9' });
    if (kind === 'editorial') params.set('tab', 'hot');
    if (kind === 'hottest') params.set('tab', 'popular');
    const endpoint = kind === 'affiliates' ? '/api/v1/public/affiliates' : '/api/v1/public/articles';

    fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload.status !== 'success') throw new Error(payload.message || 'Could not load content');
        return payload;
      })
      .then((payload) => {
        if (kind === 'affiliates') setAffiliates(payload.data);
        else setArticles(payload.data);
        setPagination(payload.pagination);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load content');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [kind]);

  async function viewMore() {
    if (!pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(pagination.page + 1), limit: String(pagination.limit) });
    if (kind === 'editorial') params.set('tab', 'hot');
    if (kind === 'hottest') params.set('tab', 'popular');
    const endpoint = kind === 'affiliates' ? '/api/v1/public/affiliates' : '/api/v1/public/articles';

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') throw new Error(payload.message);
      if (kind === 'affiliates') setAffiliates((current) => [...current, ...payload.data]);
      else setArticles((current) => [...current, ...payload.data]);
      setPagination(payload.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load more');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/figma-tech-finance-news">AIDEALSUK</Link>
        <div className={styles.collectionNavLabel}><Search size={18} /> Explore our coverage</div>
        <nav className={styles.actions} aria-label="News collections">
          <Link href="/figma-tech-finance-news/latest">Latest</Link>
          <Link href="/figma-tech-finance-news/hottest">Hottest</Link>
        </nav>
      </header>

      {loading && (
        <div className={styles.loadingScreen} role="status">
          <span className={styles.loadingSpinner} aria-hidden="true" />
          <p>Loading {config.title}...</p>
        </div>
      )}

      <div className={styles.collectionShell}>
        <header className={styles.collectionHero}>
          <p className={styles.eyebrow}>{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </header>

        {error && <p className={styles.collectionError}>{error}</p>}
        {!loading && !error && articles.length === 0 && affiliates.length === 0 && (
          <p className={styles.collectionEmpty}>No items are available yet.</p>
        )}

        {kind !== 'affiliates' && (
          <div className={styles.collectionGrid}>
            {articles.map((article) => (
              <article className={styles.collectionCard} key={article.id}>
                <Link className={styles.collectionImage} href={`/article/${article.slug}`}>
                  <img src={article.thumbnailUrl || fallbackImage} alt={article.title} />
                </Link>
                <div className={styles.collectionCardBody}>
                  <p className={styles.meta}>{article.categoryName || 'NEWS'} &middot; <Eye size={12} /> {article.viewCount || 0}</p>
                  <h2><Link href={`/article/${article.slug}`}>{article.title}</Link></h2>
                  <p>{excerptFor(article)}</p>
                  <Link className={styles.collectionCardLink} href={`/article/${article.slug}`}>Read article <ArrowRight size={15} /></Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {kind === 'affiliates' && (
          <div className={styles.collectionGrid}>
            {affiliates.map((affiliate, index) => (
              <article className={styles.affiliateCard} key={affiliate.id}>
                <div className={styles.affiliateRank}><Star size={12} fill="currentColor" /> {affiliate.isTopPick ? 'TOP PICK' : `PARTNER ${index + 1}`}</div>
                <h2>{affiliate.name}</h2>
                <p><ShieldCheck size={15} /> Commission: <strong>{affiliate.commission}</strong></p>
                <p><Clock size={15} /> Cookie window: <strong>{affiliate.cookie}</strong></p>
                <a href={`/api/v1/public/tracking/redirect?affiliate_link_id=${affiliate.id}`} target="_blank" rel="nofollow sponsored">View deal <ArrowRight size={15} /></a>
              </article>
            ))}
          </div>
        )}

        {pagination.hasMore && (
          <button className={styles.collectionMore} type="button" disabled={loadingMore} onClick={() => void viewMore()}>
            {loadingMore && <Loader2 size={16} className={styles.spin} />}
            {loadingMore ? 'Loading' : 'View more'}
          </button>
        )}
      </div>

      <footer className={styles.footer}><Link className={styles.footerLogo} href="/figma-tech-finance-news">AIDEALSUK</Link></footer>
    </main>
  );
}
