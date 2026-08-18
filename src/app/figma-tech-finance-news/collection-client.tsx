'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Eye, Loader2, ShieldCheck, Star } from 'lucide-react';
import VerticalAffiliateSidebar from '@/components/VerticalAffiliateSidebar';
import EditorialHeader from '@/components/EditorialHeader';
import EditorialFooter from '@/components/EditorialFooter';
import styles from './page.module.css';

const fallbackImage =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

export type CollectionKind = 'latest' | 'editorial' | 'hottest' | 'affiliates' | 'category';

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
  authorName?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  category: {
    title: 'Category Articles',
    eyebrow: 'Browse by Category',
    description: 'All published stories from this category.',
  },
};

function excerptFor(article: Article) {
  const text = (article.excerpt || article.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 145 ? `${text.slice(0, 142)}...` : text;
}

export default function CollectionClient({ kind, categorySlug }: { kind: CollectionKind; categorySlug?: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 9, totalPages: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const categoryLabel = categorySlug
    ? categorySlug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    : '';
  const config = kind === 'category'
    ? { ...collectionConfig.category, title: categoryLabel || collectionConfig.category.title }
    : collectionConfig[kind];

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: '1', limit: '9' });
    if (kind === 'editorial') params.set('tab', 'hot');
    if (kind === 'hottest') params.set('tab', 'popular');
    if (kind === 'category' && categorySlug) params.set('category_slug', categorySlug);
    if (activeQuery) params.set('q', activeQuery);
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
  }, [activeQuery, categorySlug, kind]);

  function clearSearch() {
    setError('');
    if (activeQuery) setLoading(true);
    setActiveQuery('');
  }

  async function viewMore() {
    if (!pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(pagination.page + 1), limit: String(pagination.limit) });
    if (kind === 'editorial') params.set('tab', 'hot');
    if (kind === 'hottest') params.set('tab', 'popular');
    if (kind === 'category' && categorySlug) params.set('category_slug', categorySlug);
    if (activeQuery) params.set('q', activeQuery);
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
      <EditorialHeader initialSearchQuery={activeQuery} />

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

        {activeQuery && !loading && (
          <div className={styles.resultsBar}>
            Results for “{activeQuery}”
            <button type="button" onClick={clearSearch}>Clear</button>
          </div>
        )}

        <div className={styles.collectionContent}>
          <div className={styles.collectionMain}>
            {error && <p className={styles.collectionError}>{error}</p>}
            {!loading && !error && articles.length === 0 && affiliates.length === 0 && (
              <p className={styles.collectionEmpty}>No items are available yet.</p>
            )}

            {kind !== 'affiliates' && (
              <div className={styles.collectionGrid}>
            {articles.map((article) => (
              <article className={`${styles.collectionCard} clickable-card`} key={article.id}>
                <Link className={styles.collectionImage} href={`/article/${article.slug}`}>
                  <img src={article.thumbnailUrl || fallbackImage} alt={article.title} />
                </Link>
                <div className={styles.collectionCardBody}>
                  <p className={styles.meta}>By {article.authorName || 'Staff'} &middot; {formatDate(article.createdAt)} &middot; {article.categoryName || 'NEWS'} &middot; <Eye size={12} /> {article.viewCount || 0}</p>
                  <h2><Link className="card-stretched-link" href={`/article/${article.slug}`}>{article.title}</Link></h2>
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
              <article className={`${styles.affiliateCard} clickable-card`} key={affiliate.id}>
                <a className="card-stretched-link" href={`/api/v1/public/tracking/redirect?affiliate_link_id=${affiliate.id}`} target="_blank" rel="nofollow sponsored" aria-label={`View affiliate deal for ${affiliate.name}`} />
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

          <VerticalAffiliateSidebar />
        </div>
      </div>

      <EditorialFooter />
    </main>
  );
}
