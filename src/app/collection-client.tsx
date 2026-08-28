'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock, Eye, Loader2, MousePointerClick, ShieldCheck, Star } from 'lucide-react';
import VerticalAffiliateSidebar from '@/components/VerticalAffiliateSidebar';
import EditorialBackdrop from '@/components/EditorialBackdrop';
import PublicArticleImage, { ARTICLE_PLACEHOLDER } from '@/components/PublicArticleImage';
import EditorialHeader from '@/components/EditorialHeader';
import EditorialFooter from '@/components/EditorialFooter';
import styles from './page.module.css';

const fallbackImage = ARTICLE_PLACEHOLDER;

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

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Affiliate {
  id: string;
  name: string;
  commission: string;
  cookie: string;
  isTopPick: boolean;
  clickCount?: number;
  click_count?: number;
  createdAt?: string;
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
  const [affiliateSort, setAffiliateSort] = useState<'latest' | 'clicks' | 'commission' | 'cookie'>('latest');

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
    if (kind === 'affiliates') params.set('sort', affiliateSort);
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
  }, [activeQuery, categorySlug, kind, affiliateSort]);

  function clearSearch() {
    setError('');
    if (activeQuery) setLoading(true);
    setActiveQuery('');
  }

  const handleSortChange = (newSort: 'latest' | 'clicks' | 'commission' | 'cookie') => {
    if (newSort === affiliateSort) return;
    setLoading(true);
    setAffiliateSort(newSort);
  };

  const handleAffiliateClick = (id: string) => {
    setAffiliates((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              clickCount: (item.clickCount || item.click_count || 0) + 1,
              click_count: (item.clickCount || item.click_count || 0) + 1,
            }
          : item
      )
    );
  };

  async function viewMore() {
    if (!pagination.hasMore || loadingMore) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ page: String(pagination.page + 1), limit: String(pagination.limit) });
    if (kind === 'editorial') params.set('tab', 'hot');
    if (kind === 'hottest') params.set('tab', 'popular');
    if (kind === 'category' && categorySlug) params.set('category_slug', categorySlug);
    if (kind === 'affiliates') params.set('sort', affiliateSort);
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
      <EditorialBackdrop section={config.title} />
      <EditorialHeader initialSearchQuery={activeQuery} />

      {loading && (
        <div className={styles.loadingScreen} role="status">
          <span className={styles.loadingSpinner} aria-hidden="true" />
          <p>Loading {config.title}...</p>
        </div>
      )}

      <div className={styles.collectionShell}>
        <header className={styles.collectionHero} data-motion="rise">
          <p className={styles.eyebrow}>{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          {kind === 'affiliates' && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-neutral-500">Sort by:</span>
              <select
                aria-label="Sort affiliate deals"
                value={affiliateSort}
                onChange={(e) => handleSortChange(e.target.value as 'latest' | 'clicks' | 'commission' | 'cookie')}
                className="h-8 border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold uppercase text-black outline-none cursor-pointer rounded"
              >
                <option value="latest">Latest Uploaded</option>
                <option value="clicks">Most Clicked</option>
                <option value="commission">Highest Commission (% Sale)</option>
                <option value="cookie">Longest Cookie Window</option>
              </select>
            </div>
          )}
        </header>

        {activeQuery && !loading && (
          <div className={styles.resultsBar}>
            Results for “{activeQuery}”
            <button type="button" onClick={clearSearch}>Clear</button>
          </div>
        )}

        <div className={`${styles.collectionContent} ${kind === 'affiliates' ? styles.affiliateCollectionContent : ''}`}>
          <div className={styles.collectionMain}>
            {error && <p className={styles.collectionError}>{error}</p>}
            {!loading && !error && articles.length === 0 && affiliates.length === 0 && (
              <p className={styles.collectionEmpty}>No items are available yet.</p>
            )}

            {kind !== 'affiliates' && (
              <div className={styles.collectionGrid}>
                {articles.map((article, index) => (
                  <article className={`${styles.collectionCard} clickable-card`} key={article.id} data-motion="rise" style={{ '--motion-delay': `${(index % 4) * 55}ms` } as React.CSSProperties}>
                    <Link className={styles.collectionImage} href={`/article/${article.slug}`}>
                      <PublicArticleImage src={article.thumbnailUrl || fallbackImage} alt={article.title} loading="lazy" />
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
              <div className={`${styles.collectionGrid} ${styles.affiliateCollectionGrid}`}>
                {affiliates.map((affiliate, index) => (
                  <article className={`${styles.affiliateCard} clickable-card`} key={affiliate.id} data-motion="scale" style={{ '--motion-delay': `${(index % 4) * 55}ms` } as React.CSSProperties}>
                    <a className="card-stretched-link" href={`/api/v1/public/tracking/redirect?affiliate_link_id=${affiliate.id}`} target="_blank" rel="nofollow sponsored" aria-label={`View affiliate deal for ${affiliate.name}`} onClick={() => handleAffiliateClick(affiliate.id)} />
                    {affiliate.isTopPick && (
                      <div className={styles.affiliateRank}><Star size={12} fill="currentColor" /> TOP PICK</div>
                    )}
                    <h2>{affiliate.name}</h2>
                    <p><ShieldCheck size={15} /> Commission: <strong>{affiliate.commission}</strong></p>
                    <p><Clock size={15} /> Cookie window: <strong>{affiliate.cookie}</strong></p>
                    <p><MousePointerClick size={15} /> Total clicks: <strong>{(affiliate.clickCount || affiliate.click_count || 0).toLocaleString()}</strong></p>
                    <p><CalendarDays size={15} /> Uploaded: <strong>{formatDateTime(affiliate.createdAt) || 'Unknown'}</strong></p>
                    <a href={`/api/v1/public/tracking/redirect?affiliate_link_id=${affiliate.id}`} target="_blank" rel="nofollow sponsored" onClick={() => handleAffiliateClick(affiliate.id)}>View deal <ArrowRight size={15} /></a>
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

          {kind !== 'affiliates' && <VerticalAffiliateSidebar />}
        </div>
      </div>

      <EditorialFooter />
    </main>
  );
}
