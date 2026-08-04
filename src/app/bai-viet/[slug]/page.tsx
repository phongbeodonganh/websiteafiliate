import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AffiliateTracker from '@/components/AffiliateTracker';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, Calendar, User, ArrowLeft, Share2, ShieldCheck, Tag, Globe, ChevronRight } from 'lucide-react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel } from '@/lib/db/models';
import type { Metadata } from 'next';

export const revalidate = 0;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const article = await ArticleModel.findOne({ slug, status: 'published' });

  if (!article) {
    return {
      title: 'Article Not Found - NEXUS FINANCE GLOBAL',
    };
  }

  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || article.content.replace(/<[^>]*>?/gm, '').substring(0, 150);

  return {
    title: `${title} | NEXUS FINANCE GLOBAL`,
    description,
    alternates: {
      canonical: `https://nexusfinance.global/bai-viet/${article.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://nexusfinance.global/bai-viet/${article.slug}`,
      siteName: 'NEXUS FINANCE GLOBAL',
      locale: 'en_US',
      type: 'article',
      publishedTime: article.created_at ? new Date(article.created_at).toISOString() : undefined,
      images: [
        {
          url: article.thumbnail_url || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  await connectToDatabase();

  const article = await ArticleModel.findOne({ slug, status: 'published' })
    .populate('author_id', 'name username avatar')
    .populate('category_id', 'name slug');

  if (!article) {
    notFound();
  }

  // Increment view count
  article.view_count += 1;
  await article.save();

  const doc = article.toObject();

  // Related articles
  const rawRelated = await ArticleModel.find({
    status: 'published',
    _id: { $ne: doc._id },
  }).limit(3);

  const relatedArticles = rawRelated.map((rel) => ({
    id: rel._id.toString(),
    title: rel.title,
    slug: rel.slug,
    thumbnailUrl: rel.thumbnail_url,
    viewCount: rel.view_count,
  }));

  const authorName = (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Global Analyst';
  const categoryName = (doc.category_id as any)?.name || 'Global Strategy';
  const formattedDate = doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : '';

  // Schema NewsArticle JSON-LD in English
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: doc.title,
    description: doc.meta_description || doc.excerpt || doc.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
    image: [doc.thumbnail_url || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop'],
    datePublished: doc.created_at,
    dateModified: doc.updated_at || doc.created_at,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NEXUS FINANCE GLOBAL',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nexusfinance.global/logo.png',
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#060608] text-slate-300 flex flex-col font-sans selection:bg-amber-500/30">
      <AffiliateTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Nav Topbar */}
      <nav className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            NEXUS<span className="text-amber-400 font-light">FINANCE</span>
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 border border-slate-700 px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={14} /> Back To Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <article className="relative">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>

          {/* Header */}
          <header className="mb-10 text-center relative z-10">
            <div className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-3">
              {categoryName} • In-Depth Analysis
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {doc.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
              <span className="flex items-center gap-1.5 text-slate-200">
                <User size={14} className="text-amber-400" /> By <strong>{authorName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-slate-500" /> {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <Eye size={14} /> {doc.view_count} Views
              </span>
            </div>
          </header>

          {/* Thumbnail */}
          {doc.thumbnail_url && (
            <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-slate-800 mb-10 shadow-2xl">
              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content HTML */}
          <div
            className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed font-serif prose-headings:text-white prose-headings:font-sans prose-a:text-amber-400 hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />

          {/* Transparent Partner Disclosure */}
          <div className="mt-12 pt-6 border-t border-slate-800 flex items-center gap-3 text-xs text-slate-400 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <p>
              <strong className="text-slate-200">Affiliate Disclosure:</strong> This report contains referral links. When you register or trade through these partner links, we may receive a commission at no additional cost to you, supporting our research infrastructure.
            </p>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t border-slate-800">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-400" /> Related Market Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/bai-viet/${rel.slug}`}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
                >
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors line-clamp-2 mb-3">
                    {rel.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Eye size={12} /> {rel.viewCount}
                    </span>
                    <span className="text-amber-400 font-medium flex items-center gap-0.5">
                      Read Story <ChevronRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-[#0a0a0c]/80 py-8 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NEXUS FINANCE GLOBAL. All Rights Reserved.
      </footer>
    </div>
  );
}
