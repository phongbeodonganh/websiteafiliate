'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, Loader2 } from 'lucide-react';

const fallbackImage =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

interface CategoryArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  thumbnailUrl?: string;
  viewCount: number;
  createdAt: string;
}

interface CategorySection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  articles: CategoryArticle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

function excerptFor(article: CategoryArticle) {
  const value = (article.excerpt || article.content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > 125 ? `${value.slice(0, 122)}...` : value;
}

export default function CategoryArticleSections() {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategorySection[]>([]);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const target = triggerRef.current;
    if (!target || started) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const controller = new AbortController();
    fetch('/api/v1/public/articles/by-category?limit=3', { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload.status !== 'success') {
          throw new Error(payload.message || 'Could not load categories');
        }
        return payload.data as CategorySection[];
      })
      .then(setCategories)
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load categories');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });

    return () => controller.abort();
  }, [started]);

  async function viewMore(category: CategorySection) {
    if (!category.pagination.hasMore || loadingMore[category.slug]) return;
    setLoadingMore((current) => ({ ...current, [category.slug]: true }));

    try {
      const params = new URLSearchParams({
        category_slug: category.slug,
        page: String(category.pagination.page + 1),
        limit: String(category.pagination.limit),
      });
      const response = await fetch(`/api/v1/public/articles?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') throw new Error(payload.message);

      setCategories((current) =>
        current.map((item) =>
          item.slug === category.slug
            ? { ...item, articles: [...item.articles, ...payload.data], pagination: payload.pagination }
            : item,
        ),
      );
    } catch {
      setError(`Could not load more articles in ${category.name}.`);
    } finally {
      setLoadingMore((current) => ({ ...current, [category.slug]: false }));
    }
  }

  return (
    <div ref={triggerRef} className="min-h-24">
      {!started && <div className="h-24" aria-hidden="true" />}
      {started && !loaded && (
        <div className="flex items-center justify-center gap-3 border border-[#d7d7d7] bg-white py-12 text-xs font-bold uppercase tracking-widest">
          <Loader2 size={18} className="animate-spin" /> Loading categories
        </div>
      )}
      {error && <p className="mb-6 border border-black bg-white p-4 text-sm font-semibold text-black">{error}</p>}

      <div className="space-y-9">
        {categories.map((category) => (
          <section key={category.id} className="border border-[#d7d7d7] border-t-4 border-t-black bg-white p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d7d7d7] pb-5">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Category</p>
                <h2 className="text-2xl font-bold uppercase text-black md:text-3xl">{category.name}</h2>
                {category.description && <p className="mt-2 max-w-2xl text-sm text-neutral-600">{category.description}</p>}
              </div>
              <span className="text-xs font-semibold text-neutral-500">{category.pagination.total} ARTICLES</span>
            </div>

            {category.articles.length === 0 ? (
              <p className="py-8 text-sm text-neutral-500">No published articles in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {category.articles.map((article) => (
                  <article key={article.id} className="group flex flex-col border border-[#d7d7d7] bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]">
                    <Link href={`/article/${article.slug}`} className="block aspect-video overflow-hidden bg-neutral-100">
                      <img src={article.thumbnailUrl || fallbackImage} alt={article.title} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase text-neutral-500">
                        <span>{article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Recent'}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {article.viewCount || 0}</span>
                      </div>
                      <h3 className="mb-3 text-lg font-bold leading-tight text-black">
                        <Link href={`/article/${article.slug}`} className="hover:underline">{article.title}</Link>
                      </h3>
                      <p className="mb-5 text-sm leading-relaxed text-neutral-600">{excerptFor(article)}</p>
                      <Link href={`/article/${article.slug}`} className="mt-auto flex items-center justify-between border-t border-[#d7d7d7] pt-4 text-xs font-bold uppercase text-black">
                        Read article <ArrowRight size={15} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {category.pagination.hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore[category.slug]}
                  onClick={() => void viewMore(category)}
                  className="flex items-center gap-2 border border-black bg-black px-7 py-3 text-xs font-bold uppercase text-white transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50"
                >
                  {loadingMore[category.slug] && <Loader2 size={15} className="animate-spin" />}
                  {loadingMore[category.slug] ? 'Loading' : 'View more'}
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
