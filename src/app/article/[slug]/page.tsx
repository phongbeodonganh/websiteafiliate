import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Types } from 'mongoose';
import AffiliateCtaBlock from '@/components/AffiliateCtaBlock';
import AffiliateRecommendationSheet from '@/components/AffiliateRecommendationSheet';
import EditorVerdict from '@/components/EditorVerdict';
import StickyMobileBar from '@/components/StickyMobileBar';
import SocialShare from '@/components/SocialShare';
import VerticalAffiliateSidebar from '@/components/VerticalAffiliateSidebar';
import EditorialHeader from '@/components/EditorialHeader';
import EditorialFooter from '@/components/EditorialFooter';
import EditorialBackdrop from '@/components/EditorialBackdrop';
import PublicArticleImage from '@/components/PublicArticleImage';
import ArticleContent from '@/components/ArticleContent';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { DEFAULT_OG_IMAGE, normalizeHttpUrl, normalizeLocale, normalizeSiteUrl, serializeJsonLd } from '@/lib/seo';
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
  if (!article) return { title: 'Article Not Found', robots: { index: false, follow: false } };
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || article.content.replace(/<[^>]*>?/gm, '').substring(0, 150);
  const baseUrl = normalizeSiteUrl(settings?.canonicalUrl);
  const canonicalUrl = `${baseUrl}/article/${article.slug}`;
  const socialImage = normalizeHttpUrl(article.thumbnail_url, normalizeHttpUrl(settings?.ogImageUrl, DEFAULT_OG_IMAGE));
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title, description, url: canonicalUrl, siteName: siteTitle,
      locale: normalizeLocale(settings?.hreflang), type: 'article',
      publishedTime: article.created_at ? new Date(article.created_at).toISOString() : undefined,
      modifiedTime: article.updated_at ? new Date(article.updated_at).toISOString() : undefined,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage],
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

  // Separate first placement for Editor's Verdict (mid-article)
  const verdictPlacement = placements[0] || null;
  const remainingPlacements = placements.slice(1);

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
    mainEntityOfPage: `${normalizeSiteUrl(settings?.canonicalUrl)}/article/${doc.slug}`,
    publisher: { '@type': 'Organization', name: settings?.site_title || 'AIDEALSUK' },
  };

  const baseUrl = normalizeSiteUrl(settings?.canonicalUrl);
  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    ...(categoryName && categorySlug
      ? [{ name: categoryName, url: `${baseUrl}/category/${categorySlug}` }]
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
      <EditorialBackdrop section={categoryName || 'ARTICLE'} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
      <EditorialHeader />
      <AffiliateRecommendationSheet key={articleId} articleId={articleId} articleOffers={placements.map((placement) => placement.link)} />

      {/* ── Visible Breadcrumb Navigation (SEO + UX) ── */}
      <div className={styles.breadcrumbBar}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          {categoryName && categorySlug && (
            <>
              <span className={styles.breadcrumbSep} aria-hidden="true">&rsaquo;</span>
              <Link href={`/category/${categorySlug}`}>{categoryName}</Link>
            </>
          )}
          <span className={styles.breadcrumbSep} aria-hidden="true">&rsaquo;</span>
          <span className={styles.breadcrumbCurrent}>{doc.title}</span>
        </nav>
      </div>

      <main className={styles.layout}>
        <article className={styles.articleBox}>
          {categoryName && (categorySlug
            ? <Link className={styles.category} href={`/category/${categorySlug}`}>{categoryName}</Link>
            : <p className={styles.category}>{categoryName}</p>)}
          <h1>{doc.title}</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-3 mb-6 pb-6 border-b border-slate-100 text-sm text-slate-600">
            <div className="w-9 h-9 rounded-full bg-black text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {(authorName || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 m-0 leading-tight">
                By {authorName || 'AIDEALSUK Editorial'}
              </p>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Published on {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; {doc.view_count || 0} views
              </p>
            </div>
          </div>
          <figure className={`${styles.heroImage} public-article-image-frame`} data-motion="fade">
            <PublicArticleImage src={doc.thumbnail_url} alt={doc.title} loading="eager" fetchPriority="high" />
          </figure>
          {keyTakeaways.length > 0 && <section className={styles.takeaways} data-motion="rise"><p>Key Takeaways</p><ul>{keyTakeaways.map((item, index) => <li key={`${index}-${item}`}>{item.replace(/^[-\s]+/, '')}</li>)}</ul></section>}

          <ArticleContent className={styles.articleContent} html={sanitizeArticleContent(doc.content)} />

          {/* ── Editor's Verdict — inline mid-article recommendation ── */}
          {verdictPlacement && (
            <EditorVerdict
              articleId={articleId}
              toolName={verdictPlacement.link.name}
              affiliateLinkId={verdictPlacement.link.id}
              commission={verdictPlacement.link.commission}
            />
          )}

          {/* ── Remaining affiliate offers (as <aside>) ── */}
          {remainingPlacements.length > 0 && (
            <aside className={styles.placements} aria-label="Affiliate recommendations" data-motion="rise">
              <h2>Recommended Offers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {remainingPlacements.map((placement, index) => <AffiliateCtaBlock key={`${placement.link.id}-${index}`} articleId={articleId} link={placement.link} positionLabel={placement.positionLabel} variant="editorial" />)}
              </div>
            </aside>
          )}

          {relatedArticles.length > 0 && <section className={styles.related} data-motion="rise">
            <div className={styles.relatedHeading}><p>Continue Reading</p><h2>Related Articles</h2></div>
            <div className={styles.relatedGrid}>{relatedArticles.map((related) => <Link key={related.id} href={`/article/${related.slug}`} className={`${styles.relatedCard} clickable-card`}>
              <div className={styles.relationLabels}>{related.sameAuthor && <span>Same author</span>}{related.sameCategory && <span>Same category</span>}</div>
              <h3>{related.title}</h3><p><span><Eye size={13} /> {related.viewCount} views</span><ArrowRight size={14} /></p>
            </Link>)}</div>
          </section>}
          <SocialShare title={doc.title} />
        </article>

        <aside className={styles.rightRail} role="complementary" aria-label="Sidebar" data-motion="rise" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
          <VerticalAffiliateSidebar hideWhenEmpty sticky={false} />
          {latestArticles.length > 0 && <section className={styles.latestNews}>
            <p>Recently Published</p><h2>Latest News</h2>
            <div>{latestArticles.map((latest) => <Link key={latest._id.toString()} href={`/article/${latest.slug}`}><h3>{latest.title}</h3><span>{new Date(latest.created_at).toLocaleDateString()} · {latest.view_count} views</span></Link>)}</div>
            <Link className={styles.latestAll} href="/latest">View all latest <ArrowRight size={14} /></Link>
          </section>}
        </aside>
      </main>

      {/* ── Sticky mobile CTA bar (dismissible) ── */}
      {verdictPlacement && (
        <StickyMobileBar
          toolName={verdictPlacement.link.name}
          trackingUrl={`/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${verdictPlacement.link.id}`}
        />
      )}

      <EditorialFooter />
    </div>
  );
}
