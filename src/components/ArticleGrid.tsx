'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, ArrowUpRight, Star, Loader2, ChevronDown } from 'lucide-react';

export interface ArticleItem {
  id: string | number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  thumbnailUrl?: string | null;
  viewCount: number;
  isFeatured: boolean;
  createdAt?: string | null;
  authorName?: string | null;
  categoryName?: string | null;
}

interface ArticleGridProps {
  initialArticles: ArticleItem[];
  initialPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  currentParams: {
    tab?: string;
    category?: string;
    sub_category?: string;
    q?: string;
  };
}

export default function ArticleGrid({ initialArticles, initialPagination, currentParams }: ArticleGridProps) {
  const [articlesList, setArticlesList] = useState<ArticleItem[]>(initialArticles);
  const [pagination, setPagination] = useState(initialPagination);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!pagination.hasMore || loadingMore) return;
    setLoadingMore(true);

    const nextPage = pagination.page + 1;
    const params = new URLSearchParams();
    params.set('page', nextPage.toString());
    params.set('limit', pagination.limit.toString());

    if (currentParams.tab) params.set('tab', currentParams.tab);
    if (currentParams.category) params.set('category_slug', currentParams.category);
    if (currentParams.sub_category) params.set('sub_category_slug', currentParams.sub_category);
    if (currentParams.q) params.set('search', currentParams.q);

    try {
      const res = await fetch(`/api/v1/public/articles?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setArticlesList((prev) => [...prev, ...data.data]);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load more articles:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (articlesList.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
        <p className="text-lg font-bold text-white mb-2">No Articles Found</p>
        <p className="text-xs text-slate-400 mb-6">No published articles match your current search query or filter selection.</p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-[#0056B3] text-white font-bold text-xs hover:bg-blue-700 transition-colors inline-block"
        >
          Reset All Filters
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* 3-Column Expanded Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articlesList.map((article) => (
          <article
            key={article.id}
            className="clickable-card group relative cursor-pointer bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 flex flex-col justify-between shadow-sm"
          >
            {/* 16:9 Aspect Ratio Thumbnail */}
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <Image
                src={
                  article.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'
                }
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-60"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/90 backdrop-blur-md text-[#0056B3] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200/80 shadow-sm">
                  {article.categoryName || 'AI Strategy'}
                </span>
                {article.isFeatured && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-0.5 font-bold shadow-sm">
                    <Star size={10} fill="currentColor" /> HOT
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 right-3 text-slate-700 text-xs flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-slate-200 font-medium shadow-sm">
                <Eye size={12} className="text-[#20C997]" /> {article.viewCount?.toLocaleString()}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>{article.createdAt?.split(' ')[0]}</span>
                  <span className="text-slate-500 font-medium">{article.authorName}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug group-hover:text-[#0056B3] transition-colors line-clamp-2">
                  <Link className="card-stretched-link" href={`/article/${article.slug}`}>{article.title}</Link>
                </h3>

                <p className="text-sm text-slate-600 line-clamp-2 mb-6 leading-relaxed">
                  {article.excerpt || article.content.replace(/<[^>]*>?/gm, '').substring(0, 120)}
                </p>
              </div>

              <Link
                href={`/article/${article.slug}`}
                className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0056B3] group-hover:text-blue-800"
              >
                <span>Read Full Story</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Interactive Load More Button */}
      {pagination.hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-8 py-3.5 rounded-full bg-white border border-slate-200 hover:border-[#0056B3] text-slate-700 hover:text-[#0056B3] text-xs font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#0056B3]" /> Loading More Insights...
              </>
            ) : (
              <>
                <span>Load More Articles ({pagination.total - articlesList.length} Remaining)</span>
                <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
