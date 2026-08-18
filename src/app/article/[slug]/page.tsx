import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Types } from 'mongoose';
import AffiliateCtaBlock from '@/components/AffiliateCtaBlock';
import SocialShare from '@/components/SocialShare';
import VerticalAffiliateSidebar from '@/components/VerticalAffiliateSidebar';
import EditorialHeader from '@/components/EditorialHeader';
import EditorialFooter from '@/components/EditorialFooter';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import { sanitizeArticleContent } from '@/lib/sanitize';
import styles from './article.module.css';

export const revalidate = 0;

interface ArticlePageProps { params: Promise<{ slug: string }>; }

interface PopulatedAuthor { _id: Types.ObjectId; name?: string; username?: string; }
interface PopulatedCategory { _id: Types.ObjectId; name?: string; slug?: string; }
interface PopulatedPlacement {
  position_label: string;
  affiliate_link_id?: { _id: Types.ObjectId; name: string; commission?: string; cookie?: string };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  await connectToDatabase();
  const [article, settings] = await Promise.all([
    ArticleModel.findOne({ slug, status: 'published' }),
    SettingModel.findOne(),
  ]);
  const siteTitle = settings?.site_title || 'AIDEALSUK';
  if (!article) return { title: `Article Not Found | ${siteTitle}` };
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || article.content.replace(/<[^>]*>?/gm, '').substring(0, 150);
  const baseUrl = settings?.canonicalUrl || 'https://aidealsuk.com';
  return {
    title: `${title} | ${siteTitle}`,
    description,
    alternates: { canonical: `${baseUrl}/article/${article.slug}` },
    openGraph: {
      title, description, url: `${baseUrl}/article/${article.slug}`, siteName: siteTitle,
      locale: 'en_US', type: 'article',
      publishedTime: article.created_at ? new Date(article.created_at).toISOString() : undefined,
      images: article.thumbnail_url ? [{ url: article.thumbnail_url, width: 1200, height: 630, alt: title }] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  await connectToDatabase();
  const [article, settings] = await Promise.all([
    ArticleModel.findOne({ slug, status: 'published' })
      .populate('author_id', 'name username avatar')
      .populate('category_id', 'name slug')
      .populate('affiliate_placements.affiliate_link_id', 'name commission cookie'),
    SettingModel.findOne(),
  ]);
  if (!article) notFound();

  article.view_count += 1;
  await article.save();
  const doc = article.toObject();
  const articleId = doc._id.toString();
  const populatedAuthor = doc.author_id as unknown as PopulatedAuthor | undefined;
  const populatedCategory = doc.category_id as unknown as PopulatedCategory | undefined;
  const authorId = populatedAuthor?._id;
  const categoryId = populatedCategory?._id;
  const categoryName = populatedCategory?.name;
  const categorySlug = populatedCategory?.slug;
  const authorName = populatedAuthor?.name || populatedAuthor?.username;
  const keyTakeaways = Array.isArray(doc.key_takeaways) ? doc.key_takeaways.map((item) => item.trim()).filter(Boolean) : [];
  const populatedPlacements = (Array.isArray(doc.affiliate_placements) ? doc.affiliate_placements : []) as unknown as PopulatedPlacement[];
  const placements = populatedPlacements
    .filter((placement) => placement.affiliate_link_id?._id)
    .map((placement) => ({
      positionLabel: placement.position_label as string,
      link: {
        id: placement.affiliate_link_id!._id.toString(), name: placement.affiliate_link_id!.name,
        commission: placement.affiliate_link_id!.commission, cookie: placement.affiliate_link_id!.cookie,
      },
    }));

  const relationFilters = [
    ...(authorId ? [{ author_id: authorId }] : []),
    ...(categoryId ? [{ category_id: categoryId }] : []),
  ];
  const [rawRelated, latestArticles] = await Promise.all([
    relationFilters.length
      ? ArticleModel.find({ status: 'published', _id: { $ne: doc._id }, $or: relationFilters })
          .populate('author_id', 'name username').populate('category_id', 'name slug')
          .sort({ created_at: -1 }).limit(8)
      : Promise.resolve([]),
    ArticleModel.find({ status: 'published', _id: { $ne: doc._id } })
      .select('title slug created_at view_count').sort({ created_at: -1 }).limit(5),
  ]);

  const relatedArticles = rawRelated.map((related) => {
    const relatedAuthor = related.author_id as unknown as PopulatedAuthor | undefined;
    const relatedCategory = related.category_id as unknown as PopulatedCategory | undefined;
    const sameAuthor = Boolean(authorId && relatedAuthor?._id?.toString() === authorId.toString());
    const sameCategory = Boolean(categoryId && relatedCategory?._id?.toString() === categoryId.toString());
    return { id: related._id.toString(), title: related.title, slug: related.slug, viewCount: related.view_count, sameAuthor, sameCategory, score: Number(sameAuthor) + Number(sameCategory) };
  }).sort((a, b) => b.score - a.score).slice(0, 4);

  const articleSchema = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: doc.title,
    description: doc.meta_description || doc.excerpt || doc.content.replace(/<[^>]*>?/gm, '').substring(0, 150),
    ...(doc.thumbnail_url ? { image: [doc.thumbnail_url] } : {}), datePublished: doc.created_at,
    dateModified: doc.updated_at || doc.created_at,
    ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}),
    publisher: { '@type': 'Organization', name: 'AIDEALSUK' },
  };
  const faqSchemaData = Array.isArray(doc.faq_schema) && doc.faq_schema.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: doc.faq_schema.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
  } : null;

  // SEO-04: BreadcrumbList — Home > Category (nếu bài có category) > Bài viết.
  // Trang bài viết hiện chỉ populate category_id (không có sub_category), nên
  // breadcrumb chỉ đi tới đúng cấp dữ liệu thực sự có sẵn.
  const baseUrl = (settings?.canonicalUrl || 'https://aidealsuk.com').replace(/\/$/, '');
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    ...(categoryName && categorySlug
      ? [{ name: categoryName, url: `${baseUrl}/figma-tech-finance-news/category/${categorySlug}` }]
      : []),
    { name: doc.title, url: `${baseUrl}/article/${doc.slug}` },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchemaData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }} />}
      <EditorialHeader />

      <main className={styles.layout}>
        <article className={styles.articleBox}>
          {categoryName && (categorySlug
            ? <Link className={styles.category} href={`/figma-tech-finance-news/category/${categorySlug}`}>{categoryName}</Link>
            : <p className={styles.category}>{categoryName}</p>)}
          <h1>{doc.title}</h1>
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 text-sm text-slate-600">
            <div className="w-9 h-9 rounded-full bg-black text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {((doc.author_id as any)?.name || (doc.author_id as any)?.username || 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-slate-900 m-0 leading-tight">
                By {(doc.author_id as any)?.name || (doc.author_id as any)?.username || 'AIDEALSUK Editorial'}
              </p>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Published on {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; {doc.view_count || 0} views
              </p>
            </div>
          </div>
          {doc.thumbnail_url && <div className={styles.heroImage}><Image src={doc.thumbnail_url} alt={doc.title} fill priority sizes="(max-width: 900px) 100vw, 760px" /></div>}
          {keyTakeaways.length > 0 && <section className={styles.takeaways}><p>Key Takeaways</p><ul>{keyTakeaways.map((item, index) => <li key={`${index}-${item}`}>{item.replace(/^[-\s]+/, '')}</li>)}</ul></section>}
          <div className={styles.articleContent} dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(doc.content) }} />

          {placements.length > 0 && <section className={styles.placements}>
            <h2>Recommended Offers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {placements.map((placement, index) => <AffiliateCtaBlock key={`${placement.link.id}-${index}`} articleId={articleId} link={placement.link} positionLabel={placement.positionLabel} variant="editorial" />)}
            </div>
          </section>}

          {relatedArticles.length > 0 && <section className={styles.related}>
            <div className={styles.relatedHeading}><p>Continue Reading</p><h2>Related Articles</h2></div>
            <div className={styles.relatedGrid}>{relatedArticles.map((related) => <Link key={related.id} href={`/article/${related.slug}`} className={styles.relatedCard}>
              <div className={styles.relationLabels}>{related.sameAuthor && <span>Same author</span>}{related.sameCategory && <span>Same category</span>}</div>
              <h3>{related.title}</h3><p><span><Eye size={13} /> {related.viewCount} views</span><ArrowRight size={14} /></p>
            </Link>)}</div>
          </section>}
          <SocialShare title={doc.title} />
        </article>

        <div className={styles.rightRail}>
          <VerticalAffiliateSidebar hideWhenEmpty sticky={false} />
          {latestArticles.length > 0 && <section className={styles.latestNews}>
            <p>Recently Published</p><h2>Latest News</h2>
            <div>{latestArticles.map((latest) => <Link key={latest._id.toString()} href={`/article/${latest.slug}`}><h3>{latest.title}</h3><span>{new Date(latest.created_at).toLocaleDateString()} · {latest.view_count} views</span></Link>)}</div>
            <Link className={styles.latestAll} href="/figma-tech-finance-news/latest">View all latest <ArrowRight size={14} /></Link>
          </section>}
        </div>
      </main>
      <EditorialFooter />
    </div>
  );
}
