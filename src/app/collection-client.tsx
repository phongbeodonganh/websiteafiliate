'use client';

import Select from "@/components/ui/Select";
import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Clock3, Eye, Flame, Loader2, Search, SlidersHorizontal, Sparkles, Star, Tag, X } from 'lucide-react';
import PublicArticleImage from '@/components/PublicArticleImage';
import StorefrontFooter from '@/components/storefront/StorefrontFooter';
import styles from './collection.module.css';

export type CollectionKind = 'latest' | 'editorial' | 'hottest' | 'affiliates' | 'category';
type AffiliateSort = 'latest' | 'clicks' | 'commission' | 'cookie';
interface Article {
  id: string; title: string; slug: string; excerpt?: string; content?: string;
  thumbnailUrl?: string; viewCount: number; createdAt: string; categoryName?: string; authorName?: string;
}
interface Affiliate {
  id: string; name: string; commission: string; cookie: string; isTopPick: boolean;
  clickCount?: number; click_count?: number; createdAt?: string;
}
interface Pagination { total: number; page: number; limit: number; totalPages: number; hasMore: boolean; }
const config = {
  latest: { title: 'Latest Buying Guides', eyebrow: 'Fresh from the buying desk', description: 'Practical advice, product explainers and new comparisons for considered purchases.', feature: 'The latest guide', section: 'More from the buying desk', icon: Clock3 },
  hottest: { title: 'Most-Read Guides', eyebrow: 'Reader favourites', description: 'The product questions and comparisons shoppers are reading most right now.', feature: 'The most-read guide', section: 'The most-read list', icon: Flame },
  editorial: { title: 'Editor’s Picks', eyebrow: 'Selected by our editors', description: 'Considered product advice and comparisons worth your time.', feature: 'In the spotlight', section: 'Worth a closer read', icon: Sparkles },
  affiliates: { title: 'Retailer Partners', eyebrow: 'Commercial transparency', description: 'Explore partner programmes and the commercial relationships behind eligible links.', feature: '', section: 'Partner directory', icon: Tag },
  category: { title: 'Buying Guides', eyebrow: 'Explore the category', description: 'Product guidance and comparisons for one part of everyday life.', feature: 'Start here', section: 'More buying guides', icon: BookOpen },
};
const collections = [
  { kind: 'latest', href: '/latest', label: 'Latest guides', icon: Clock3 },
  { kind: 'hottest', href: '/hottest', label: 'Most read', icon: Flame },
  { kind: 'editorial', href: '/editorial-picks', label: 'Editor’s picks', icon: Sparkles },
  { kind: 'affiliates', href: '/affiliates', label: 'Partners', icon: Tag },
];
function formatDate(value?: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}
function plainText(value = '') { return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function categoryTitle(name: string) { return name.replace(/\bai\b/gi, 'AI'); }
function categoryTitleFromSlug(slug: string) {
  return categoryTitle(slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '));
}
function readTime(article: Article) {
  if (!article.content) return null;
  return Math.max(1, Math.ceil(plainText(article.content).split(/\s+/).length / 220));
}
function ArticleMeta({ article, views = false }: { article: Article; views?: boolean }) {
  const minutes = readTime(article);
  return <div className={styles.meta}>
    <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
    {views ? <span><Eye size={13} aria-hidden="true" />{(article.viewCount || 0).toLocaleString('en-GB')} reads</span>
      : minutes && <span><Clock3 size={13} aria-hidden="true" />{minutes} min read</span>}
  </div>;
}
function Story({ article, rank, variant = 'card', label }: { article: Article; rank?: number; variant?: 'lead' | 'compact' | 'card'; label?: string }) {
  return <article className={`${styles.story} ${styles[variant]}`} data-motion="rise">
    <Link href={`/article/${article.slug}`} className={styles.storyLink}>
      <div className={styles.media}>
        <PublicArticleImage src={article.thumbnailUrl} alt="" loading={variant === 'lead' ? 'eager' : 'lazy'} fetchPriority={variant === 'lead' ? 'high' : 'auto'} />
        {label && <span className={styles.featureLabel}>{rank ? <Flame size={13} aria-hidden="true" /> : <BookOpen size={13} aria-hidden="true" />}{label}</span>}
        <span className={styles.imageArrow} aria-hidden="true"><ArrowUpRight size={22} /></span>
      </div>
      <div className={styles.storyBody}>
        <div className={styles.storyCategory}>{rank && <span className={styles.rank} aria-label={`Rank ${rank}`}>{String(rank).padStart(2, '0')}</span>}<span>{article.categoryName || 'Buying guide'}</span></div>
        <h2>{article.title}</h2>
        {variant !== 'compact' && <p className={styles.excerpt}>{plainText(article.excerpt || article.content)}</p>}
        <ArticleMeta article={article} views={Boolean(rank)} />
        {variant === 'lead' && <span className={styles.readStory}>Read the guide <ArrowRight size={17} aria-hidden="true" /></span>}
      </div>
    </Link>
  </article>;
}

export default function CollectionClient({ kind, categorySlug, categoryName, header, catalog }: { kind: CollectionKind; categorySlug?: string; categoryName?: string; header: ReactNode; catalog?: ReactNode }) {
  return <CollectionView key={`${kind}:${categorySlug || ''}`} kind={kind} categorySlug={categorySlug} categoryName={categoryName} header={header} catalog={catalog} />;
}
function CollectionView({ kind, categorySlug, categoryName, header, catalog }: { kind: CollectionKind; categorySlug?: string; categoryName?: string; header: ReactNode; catalog?: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 9, totalPages: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [request, setRequest] = useState({ query: '', sort: 'latest' as AffiliateSort, page: 1, retry: 0 });
  const isDeals = kind === 'affiliates';
  const details = config[kind];
  const Icon = details.icon;
  const title = kind === 'category' && categorySlug
    ? categoryName ? categoryTitle(categoryName) : categoryTitleFromSlug(categorySlug)
    : details.title;
  const loadingInitial = loading && request.page === 1;
  const count = isDeals ? affiliates.length : articles.length;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(request.page), limit: '9' });
    if (kind === 'editorial') params.set('tab', 'editorial');
    if (kind === 'hottest') params.set('tab', 'popular');
    if (kind === 'category' && categorySlug) params.set('category_slug', categorySlug);
    if (isDeals) params.set('sort', request.sort);
    if (request.query) params.set('q', request.query);
    fetch(`/api/v1/public/${isDeals ? 'affiliates' : 'articles'}?${params}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok || payload.status !== 'success') throw new Error('Content is temporarily unavailable. Please try again.');
        return payload;
      })
      .then(payload => {
        if (controller.signal.aborted) return;
        if (isDeals) setAffiliates(current => request.page === 1 ? payload.data : [...current, ...payload.data]);
        else setArticles(current => request.page === 1 ? payload.data : [...current, ...payload.data]);
        setPagination(payload.pagination);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load content. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, kind, categorySlug, isDeals]);

  function updateRequest(change: Partial<typeof request>) {
    setLoading(true);
    setError('');
    if (change.page === 1) {
      setArticles([]);
      setAffiliates([]);
      setPagination({ total: 0, page: 1, limit: 9, totalPages: 0, hasMore: false });
    }
    setRequest(current => ({ ...current, ...change }));
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (search.trim() !== request.query) updateRequest({ query: search.trim(), page: 1 });
  }
  function clearSearch() { setSearch(''); updateRequest({ query: '', page: 1 }); }
  function countClick(id: string) {
    setAffiliates(current => current.map(item => item.id === id ? { ...item, clickCount: (item.clickCount ?? item.click_count ?? 0) + 1 } : item));
  }

  return <div className={styles.page} data-kind={kind}>
    {header}
    <main className={styles.shell} id="collection-content">
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
      <header className={styles.hero} data-motion="rise">
        <div><p className={styles.eyebrow}><Icon size={14} aria-hidden="true" />{details.eyebrow}</p><h1>{title}<span aria-hidden="true">.</span></h1><p className={styles.description}>{details.description}</p></div>
        <div className={styles.heroNote}><span>THEHAVENDEALS BUYING DESK</span><p>{isDeals ? 'Clear relationships. No hidden influence.' : kind === 'hottest' ? 'See what shoppers are reading.' : kind === 'editorial' ? 'Less noise. Better choices.' : 'Your next considered purchase starts here.'}</p><ArrowDown size={24} aria-hidden="true" /></div>
      </header>
      {catalog}
      <nav className={styles.collectionNav} aria-label="Article collections">{collections.map(item => <Link key={item.kind} href={item.href} aria-current={kind === item.kind ? 'page' : undefined}><item.icon size={15} aria-hidden="true" />{item.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>
      {isDeals && <div className={styles.disclosure}><Tag size={18} aria-hidden="true" /><p>Some links are affiliate links. We may earn a commission when you use them. <Link href="/affiliate-disclosure">How affiliate links work <ArrowUpRight size={12} aria-hidden="true" /></Link></p></div>}
      <div className={styles.toolbar}>
        <div className={styles.resultCount} aria-live="polite">{loadingInitial ? (isDeals ? 'Finding partner programmes…' : 'Finding your next read…') : error && count === 0 ? 'Browse the collection' : <><strong>{pagination.total.toLocaleString('en-GB')}</strong> {isDeals ? 'partner programmes' : 'stories'}{request.query && <> for “{request.query}”</>}</>}{request.query && <button type="button" onClick={clearSearch} aria-label="Clear search"><X size={15} /></button>}</div>
        <div className={styles.tools}>
          <form className={styles.search} onSubmit={submitSearch} role="search" aria-label="Search this collection"><Search size={16} aria-hidden="true" /><input aria-label={isDeals ? 'Search partner deals' : 'Search this collection'} value={search} onChange={event => setSearch(event.target.value)} placeholder={isDeals ? 'Find a partner…' : 'Search this collection…'} /><button type="submit" aria-label="Search"><ArrowRight size={16} /></button></form>
          {isDeals && <label className={styles.sort}><SlidersHorizontal size={15} aria-hidden="true" /><Select aria-label="Sort affiliate deals" value={request.sort} onChange={event => updateRequest({ sort: event.target.value as AffiliateSort, page: 1 })}><option value="latest">Latest added</option><option value="clicks">Most clicked</option><option value="commission">Highest commission</option><option value="cookie">Longest cookie window</option></Select></label>}
        </div>
      </div>
      {loadingInitial ? <div className={styles.skeletonGrid} role="status"><span className={styles.srOnly}>Loading {title}</span>{Array.from({ length: 3 }, (_, i) => <div key={i} className={styles.skeleton} aria-hidden="true"><div /><span /><span /><span /></div>)}</div> : <>
        {error && <div className={styles.empty} role="alert"><BookOpen size={28} /><h2>Let’s try that again</h2><p>{error}</p><button type="button" disabled={loading} onClick={() => updateRequest({ retry: request.retry + 1 })}>{loading ? 'Trying again…' : 'Try again'} <ArrowRight size={16} /></button></div>}
        {!error && count === 0 && <div className={styles.empty}><Search size={30} /><h2>{request.query ? 'No matches this time' : isDeals ? 'New opportunities are on the way' : 'The next story is on its way'}</h2><p>{request.query ? 'Try a different keyword or explore the full collection.' : 'Explore the latest stories while we prepare more for this collection.'}</p>{request.query ? <button type="button" onClick={clearSearch}>Clear search <ArrowRight size={16} /></button> : <Link href={kind === 'latest' ? '/' : '/latest'}>Explore more stories <ArrowRight size={16} /></Link>}</div>}
        {!isDeals && articles.length > 0 && <>
          <section className={`${styles.spotlight} ${articles.length === 1 ? styles.singleSpotlight : ''}`} aria-label={details.feature}>
            <Story article={articles[0]} variant="lead" rank={kind === 'hottest' ? 1 : undefined} label={details.feature} />
            {articles.length > 1 && <div className={styles.spotlightSide}><p className={styles.sideLabel}>{kind === 'hottest' ? 'Also on the reading list' : kind === 'editorial' ? 'The editor’s shortlist' : 'Also in this edition'}</p>{articles.slice(1, 3).map((article, i) => <Story key={article.id} article={article} variant="compact" rank={kind === 'hottest' ? i + 2 : undefined} />)}<Link href="#more-stories" className={styles.sideFooter}>Keep exploring <ArrowDown size={15} /></Link></div>}
          </section>
          <div className={styles.contentLayout} id="more-stories">
            <section aria-labelledby="more-heading" className={styles.moreStories}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{kind === 'hottest' ? 'Ranked by total reads' : 'Keep your curiosity going'}</p><h2 id="more-heading">{details.section}</h2></div><BookOpen size={23} aria-hidden="true" /></div>
              {articles.length > 3 ? <div className={`${styles.storyGrid} ${kind === 'hottest' ? styles.rankedList : ''}`}>{articles.slice(3).map((article, i) => <Story key={article.id} article={article} rank={kind === 'hottest' ? i + 4 : undefined} />)}</div> : <p className={styles.endNote}>You’re up to date with this collection. Explore another edition below.</p>}
            </section>
            <aside className={styles.rail} aria-label="Explore TheHavenDeals"><div className={styles.desk}><Sparkles size={22} aria-hidden="true" /><p className={styles.eyebrow}>Choose with context</p><h2>A better shortlist<br />starts here.</h2><p>Explore another category, read an in-depth guide or return to the current product selection.</p>{collections.filter(item => item.kind !== kind).map(item => <Link key={item.kind} href={item.href}>{item.label}<ArrowUpRight size={16} /></Link>)}</div></aside>
          </div>
        </>}
        {isDeals && affiliates.length > 0 && <section aria-label="Partner programmes" className={styles.dealGrid}>{affiliates.map((affiliate, i) => <article key={affiliate.id} className={styles.deal} data-featured={affiliate.isTopPick || undefined} data-motion="rise" style={{ '--motion-delay': `${(i % 3) * 60}ms` } as CSSProperties}>
          <div className={styles.dealTop}><span className={styles.monogram} aria-hidden="true">{affiliate.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase()}</span>{affiliate.isTopPick ? <span className={styles.topPick}><Star size={12} fill="currentColor" aria-hidden="true" />Top pick</span> : <span className={styles.partnerLabel}>Partner programme</span>}</div>
          <h2>{affiliate.name}</h2><p className={styles.dealSubtitle}>Affiliate partner</p>
          <dl className={styles.dealTerms}><div><dt>Commission</dt><dd>{affiliate.commission}</dd></div><div><dt>Cookie window</dt><dd>{affiliate.cookie}</dd></div></dl>
          <div className={styles.dealMeta}><span><Eye size={13} aria-hidden="true" />{(affiliate.clickCount ?? affiliate.click_count ?? 0).toLocaleString('en-GB')} clicks</span>{affiliate.createdAt && <time dateTime={affiliate.createdAt}>Added {formatDate(affiliate.createdAt)}</time>}</div>
          <a className={styles.dealCta} href={`/api/v1/public/tracking/redirect?affiliate_link_id=${affiliate.id}`} target="_blank" rel="noopener noreferrer nofollow sponsored" onClick={() => countClick(affiliate.id)} aria-label={`Explore ${affiliate.name} partner programme (opens in a new tab)`}>Explore programme <ArrowUpRight size={18} aria-hidden="true" /></a>
        </article>)}</section>}
        {count > 0 && <div className={styles.pagination}><p>Showing {count} of {pagination.total} {isDeals ? 'programmes' : 'stories'}</p>{pagination.hasMore && <button type="button" disabled={loading} onClick={() => updateRequest({ page: pagination.page + 1 })}>{loading ? <Loader2 size={17} className={styles.spin} /> : <ArrowDown size={17} />}{loading ? 'Loading more…' : isDeals ? 'Explore more partners' : 'Discover more stories'}</button>}<div className={styles.countTrack} aria-hidden="true"><span style={{ width: `${Math.min(100, count / Math.max(1, pagination.total) * 100)}%` }} /></div></div>}
      </>}
      <div className={styles.closing}><span>Products. Prices. Practical advice.</span><Link href="/#products">Compare the latest picks <ArrowUpRight size={18} /></Link></div>
    </main>
    <StorefrontFooter />
  </div>;
}
