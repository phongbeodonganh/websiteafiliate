import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AffiliateTracker from '@/components/AffiliateTracker';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, Calendar, User, ArrowLeft, ShieldCheck, Tag, ChevronRight } from 'lucide-react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import type { Metadata } from 'next';

export const revalidate = 0;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const article = await ArticleModel.findOne({ slug, status: 'published' });
  const siteSettings = await SettingModel.findOne();

  const siteTitle = siteSettings?.site_title || 'AI AFFILIATE HUB';
  const baseUrl = siteSettings?.canonicalUrl || 'https://aiaffiliatehub.com';

  if (!article) {
    return {
      title: `Article Not Found - ${siteTitle}`,
    };
  }

  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || article.content.replace(/<[^>]*>?/gm, '').substring(0, 150);

  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: {
      canonical: `${baseUrl}/article/${article.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/article/${article.slug}`,
      siteName: siteTitle,
      locale: 'en_US',
      type: 'article',
      publishedTime: article.created_at ? new Date(article.created_at).toISOString() : undefined,
      images: [
        {
          url: article.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
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

  const authorName = (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'AI Specialist';
  const categoryName = (doc.category_id as any)?.name || 'AI Strategy';
  const formattedDate = doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : '';

  // Schema NewsArticle JSON-LD in English
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: doc.title,
    description: doc.meta_description || doc.excerpt || doc.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
    image: [doc.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'],
    datePublished: doc.created_at,
    dateModified: doc.updated_at || doc.created_at,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI AFFILIATE HUB',
      logo: {
        '@type': 'ImageObject',
        url: 'https://aiaffiliatehub.com/logo.png',
      },
    },
  };

  // Schema FAQPage JSON-LD
  const faqSchemaData =
    Array.isArray(doc.faq_schema) && doc.faq_schema.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: doc.faq_schema.map((faq: any) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-700 flex flex-col font-sans selection:bg-[#FF6B6B]/20 selection:text-[#FF6B6B]">
      <AffiliateTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
        />
      )}

      {/* Nav Topbar */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tighter text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0056B3]"></span>
            AI<span className="text-[#0056B3] font-medium">AFFILIATE HUB</span>
          </Link>
          <Link
            href="/"
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-3.5 py-1.5 rounded-full hover:bg-slate-100 transition-colors bg-white font-medium"
          >
            <ArrowLeft size={14} /> Back To Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <article className="relative bg-white border border-slate-100 rounded-3xl p-8 lg:p-14 shadow-xl shadow-slate-200/50">
          {/* Header */}
          <header className="mb-8 text-center relative z-10">
            <div className="text-[#0056B3] text-xs font-bold tracking-widest uppercase mb-3">
              {categoryName} • In-Depth Case Study & Review
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
              {doc.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-6">
              <span className="flex items-center gap-1.5 text-slate-700">
                <User size={14} className="text-[#0056B3]" /> By <strong>{authorName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" /> {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Eye size={14} className="text-[#20C997]" /> {doc.view_count} Views
              </span>
            </div>
          </header>

          {/* Thumbnail */}
          {doc.thumbnail_url && (
            <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden border border-slate-100 mb-8 shadow-md">
              <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* GEO Key Takeaways Box */}
          {Array.isArray(doc.key_takeaways) && doc.key_takeaways.length > 0 && (
            <div className="mb-10 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow">
                  AI
                </div>
                <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wide">
                  Key Takeaways (Generative AI Summary)
                </h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-indigo-900 leading-relaxed list-disc list-inside">
                {doc.key_takeaways.map((point: string, idx: number) => (
                  <li key={idx} className="font-medium">
                    {point.replace(/^[-\s]+/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Entities Badge Bar */}
          {Array.isArray(doc.entities) && doc.entities.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Recognized Entities:</span>
              {doc.entities.map((entity: string, idx: number) => (
                <span
                  key={idx}
                  className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium text-[11px]"
                >
                  {entity}
                </span>
              ))}
            </div>
          )}

          {/* Content HTML in Charcoal text */}
          <div
            className="prose prose-slate prose-lg max-w-none text-slate-700 leading-relaxed font-serif prose-headings:text-slate-900 prose-headings:font-sans prose-a:text-[#0056B3] hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />

          {/* FAQ Accordion Block */}
          {Array.isArray(doc.faq_schema) && doc.faq_schema.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0056B3] flex items-center justify-center font-bold text-xs border border-blue-100">
                  ?
                </span>
                Frequently Asked Questions (FAQ)
              </h3>
              <div className="space-y-4">
                {doc.faq_schema.map((faq: any, idx: number) => (
                  <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-start gap-2">
                      <span className="text-[#0056B3]">Q:</span> {faq.question}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-5">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transparent Partner Disclosure */}
          <div className="mt-12 pt-6 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <ShieldCheck className="w-5 h-5 text-[#0056B3] shrink-0" />
            <p>
              <strong className="text-slate-900">Affiliate Disclosure:</strong> This review contains verified referral links. When you purchase through these partner links, we may receive a commission at no extra cost to you, supporting our research team.
            </p>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#0056B3]" /> Related AI Case Studies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/article/${rel.slug}`}
                  className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-[#0056B3]/40 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm"
                >
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0056B3] transition-colors line-clamp-2 mb-3">
                    {rel.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[#20C997] font-semibold">
                      <Eye size={12} /> {rel.viewCount}
                    </span>
                    <span className="text-[#0056B3] font-semibold flex items-center gap-0.5">
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
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AI AFFILIATE HUB. All Rights Reserved.
      </footer>
    </div>
  );
}
