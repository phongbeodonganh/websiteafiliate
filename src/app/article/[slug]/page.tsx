import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Clock3, Eye } from 'lucide-react';
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
import ArticleReadingTools from '@/components/ArticleReadingTools';
import ArticleTableOfContents from '@/components/ArticleTableOfContents';
import AuthorAvatar from '@/components/AuthorAvatar';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, SettingModel } from '@/lib/db/models';
import { buildFaqPageSchema } from '@/lib/faq-jsonld';
import { sortPlacementsByPosition } from '@/lib/placement-order';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { DEFAULT_OG_IMAGE, normalizeHttpUrl, normalizeLocale, normalizeSiteUrl, serializeJsonLd } from '@/lib/seo';
import styles from './article.module.css';

export const revalidate = 0;

interface ArticlePageProps { params: Promise<{ slug: string }>; }

interface PopulatedAuthor { _id: Types.ObjectId; name?: string; username?: string; avatar?: string; }
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
  const authorAvatar = populatedAuthor?.avatar;
  const keyTakeaways = Array.isArray(doc.key_takeaways) ? doc.key_takeaways.map((item) => item.trim()).filter(Boolean) : [];
  const populatedPlacements = (Array.isArray(doc.affiliate_placements) ? doc.affiliate_placements : []) as unknown as PopulatedPlacement[];
  const placements = sortPlacementsByPosition(
    populatedPlacements
      .filter((placement) => placement.affiliate_link_id?._id)
      .map((placement) => ({
        positionLabel: placement.position_label as string,
        link: {
          id: placement.affiliate_link_id!._id.toString(), name: placement.affiliate_link_id!.name,
          commission: placement.affiliate_link_id!.commission, cookie: placement.affiliate_link_id!.cookie,
        },
      }))
  );

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
    return {
      id: related._id.toString(),
      title: related.title,
      slug: related.slug,
      viewCount: related.view_count,
      thumbnailUrl: related.thumbnail_url,
      categoryName: relatedCategory?.name,
      createdAt: related.created_at,
      sameAuthor,
      sameCategory,
      score: Number(sameAuthor) + Number(sameCategory),
    };
  }).sort((a, b) => b.score - a.score).slice(0, 4);

  const sanitizedContent = sanitizeArticleContent(doc.content);
  const articleWords = doc.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(articleWords / 220));
  const publishedDate = new Date(doc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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

  // C-1: FAQPage JSON-LD dựng từ faq_schema; null khi không có cặp hoàn chỉnh.
  const faqPageSchema = buildFaqPageSchema(doc.faq_schema);

  return (
    <div className={styles.page}>
      <EditorialBackdrop section={categoryName || 'ARTICLE'} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
      {faqPageSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqPageSchema) }} />
      )}
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

      <main className={styles.articleMain}>
        <article className={styles.articleBox}>
          <header className={styles.articleHeader} data-motion="rise">
            {categoryName && (categorySlug
              ? <Link className={styles.category} href={`/category/${categorySlug}`}>{categoryName}</Link>
              : <p className={styles.category}>{categoryName}</p>)}
            <h1>{doc.title}</h1>
            {doc.excerpt && <p className={styles.articleDek}>{doc.excerpt}</p>}

            <div className={styles.mastheadFooter}>
              <div className={styles.authorMeta}>
                <AuthorAvatar className={styles.authorAvatar} name={authorName || 'AIDEALSUK Editorial'} src={authorAvatar} />
                <div className={styles.authorMetaText}>
                  <p>By {authorName || 'AIDEALSUK Editorial'}</p>
                  <div className={styles.metadata}>
                    <span><CalendarDays aria-hidden="true" /> {publishedDate}</span>
                    <span><Clock3 aria-hidden="true" /> {readingMinutes} min read</span>
                    <span><Eye aria-hidden="true" /> {doc.view_count || 0} views</span>
                  </div>
                </div>
              </div>
              <SocialShare title={doc.title} variant="compact" />
            </div>
          </header>

          <figure className={`${styles.heroImage} public-article-image-frame`} data-motion="fade">
            <PublicArticleImage src={doc.thumbnail_url} alt={doc.title} loading="eager" fetchPriority="high" />
          </figure>

          <div className={styles.layout}>
            <aside className={styles.leftRail} aria-label="Article contents" data-motion="rise">
              <div className={styles.leftSticky} data-toc-rail="true">
                <ArticleTableOfContents key={`desktop-${articleId}`} contentId="article-content" />
                <VerticalAffiliateSidebar sticky={false} variant="article" />
              </div>
            </aside>

            <div className={styles.readingColumn}>
              <ArticleReadingTools key={articleId} contentId="article-content" slug={doc.slug} />
              <details className={styles.mobileContents}>
                <summary>In this article <BookOpen size={16} aria-hidden="true" /></summary>
                <ArticleTableOfContents key={`mobile-${articleId}`} contentId="article-content" />
              </details>
              {keyTakeaways.length > 0 && (
                <section className={styles.takeaways} data-motion="rise">
                  <p>Key Takeaways</p>
                  <ul>{keyTakeaways.map((item, index) => <li key={`${index}-${item}`}>{item.replace(/^[-\s]+/, '')}</li>)}</ul>
                </section>
              )}

              <ArticleContent id="article-content" className={styles.articleContent} html={sanitizedContent} />

              <div className={styles.articleEnd}>
                <span aria-hidden="true">◆</span>
                <p>A fresh perspective is worth sharing.</p>
                <SocialShare title={doc.title} variant="compact" />
              </div>

              {verdictPlacement && (
                <EditorVerdict
                  articleId={articleId}
                  toolName={verdictPlacement.link.name}
                  affiliateLinkId={verdictPlacement.link.id}
                  commission={verdictPlacement.link.commission}
                />
              )}

              {remainingPlacements.length > 0 && (
                <aside className={styles.placements} aria-label="Affiliate recommendations" data-motion="rise">
                  <p className={styles.sectionEyebrow}>Selected partner offers</p>
                  <h2>Tools worth a closer look</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {remainingPlacements.map((placement, index) => <AffiliateCtaBlock key={`${placement.link.id}-${index}`} articleId={articleId} link={placement.link} positionLabel={placement.positionLabel} variant="editorial" />)}
                  </div>
                </aside>
              )}

              <section className={styles.authorBio} aria-labelledby="author-bio-title" data-motion="rise">
                <AuthorAvatar className={styles.authorBioAvatar} name={authorName || 'AIDEALSUK Editorial'} src={authorAvatar} />
                <div>
                  <p className={styles.sectionEyebrow}>About the author</p>
                  <h2 id="author-bio-title">{authorName || 'AIDEALSUK Editorial'}</h2>
                  <p>
                    {authorName
                      ? `${authorName} contributes reporting and analysis to AIDEALSUK across artificial intelligence, finance, and the tools shaping modern work.`
                      : 'The AIDEALSUK editorial desk reports on artificial intelligence, finance, and the tools shaping modern work—with clarity over hype.'}
                  </p>
                </div>
              </section>
            </div>

            <aside className={styles.rightRail} role="complementary" aria-label="Latest news" data-motion="rise" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
              <div className={styles.rightSticky} tabIndex={0} role="region" aria-label="Latest news">
                {latestArticles.length > 0 && <section className={styles.latestNews}>
                  <p>Recently Published</p><h2>Latest News</h2>
                  <div>{latestArticles.map((latest) => <Link key={latest._id.toString()} href={`/article/${latest.slug}`}><h3>{latest.title}</h3><span>{new Date(latest.created_at).toLocaleDateString()} · {latest.view_count} views</span></Link>)}</div>
                  <Link className={styles.latestAll} href="/latest">View all latest <ArrowRight size={14} /></Link>
                </section>}
              </div>
            </aside>
          </div>
        </article>
      </main>

      {relatedArticles.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title" data-motion="rise">
          <div className={styles.relatedHeading}>
            <div><p>Continue Reading</p><h2 id="related-title">Read Next</h2></div>
            <Link href="/latest">All latest stories <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className={styles.relatedGrid}>
            {relatedArticles.map((related) => (
              <Link key={related.id} href={`/article/${related.slug}`} className={`${styles.relatedCard} clickable-card`}>
                <div className={`${styles.relatedMedia} public-article-image-frame`}>
                  <PublicArticleImage src={related.thumbnailUrl} alt="" loading="lazy" />
                </div>
                <div className={styles.relatedCardBody}>
                  <div className={styles.relationLabels}>
                    <span>{related.categoryName || 'Analysis'}</span>
                    {related.sameAuthor && <span>Same author</span>}
                  </div>
                  <h3>{related.title}</h3>
                  <p><span><Eye size={13} /> {related.viewCount} views</span><ArrowRight size={14} /></p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
