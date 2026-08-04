import Link from 'next/link';
import {
  Eye,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  Globe,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
  Tag,
  Star,
  Flame,
  Layers,
  Cpu,
  Coins,
  Clock,
} from 'lucide-react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SubCategoryModel, SettingModel } from '@/lib/db/models';
import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import TopPicksWidget from '@/components/TopPicksWidget';
import LeadCapture from '@/components/LeadCapture';
import ArticleGrid from '@/components/ArticleGrid';
import BreakingNewsTicker from '@/components/BreakingNewsTicker';
import Footer from '@/components/Footer';

export const revalidate = 0; // Dynamic server-render for real-time views

interface HomePageProps {
  searchParams: Promise<{
    tab?: string;
    category?: string;
    sub_category?: string;
    q?: string;
    page?: string;
  }>;
}

async function getHomePageData(
  tab?: string,
  categorySlug?: string,
  subCategorySlug?: string,
  searchKeyword?: string,
  pageStr: string = '1'
) {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = 6;
    const offset = (page - 1) * limit;

    const rawCategories = await CategoryModel.find();
    const rawSubCategories = await SubCategoryModel.find();

    const formattedCategories = rawCategories.map((cat) => {
      const catDoc = cat.toObject();
      const catIdStr = catDoc._id.toString();
      const subs = rawSubCategories
        .filter((sub) => sub.category_id.toString() === catIdStr)
        .map((sub) => ({
          id: sub._id.toString(),
          categoryId: catIdStr,
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          metaTitle: sub.meta_title,
          metaDescription: sub.meta_description,
          createdAt: sub.created_at,
        }));
      return {
        id: catIdStr,
        name: catDoc.name,
        slug: catDoc.slug,
        description: catDoc.description,
        metaTitle: catDoc.meta_title,
        metaDescription: catDoc.meta_description,
        createdAt: catDoc.created_at,
        subCategories: subs,
      };
    });

    const filter: Record<string, any> = { status: 'published' };

    if (tab === 'hot') {
      filter.is_featured = true;
    }

    if (categorySlug) {
      const catObj = rawCategories.find((c) => c.slug === categorySlug);
      if (catObj) filter.category_id = catObj._id;
    }

    if (subCategorySlug) {
      const subCatObj = rawSubCategories.find((s) => s.slug === subCategorySlug);
      if (subCatObj) filter.sub_category_id = subCatObj._id;
    }

    if (searchKeyword && searchKeyword.trim()) {
      const regex = new RegExp(searchKeyword.trim(), 'i');
      filter.$or = [{ title: regex }, { excerpt: regex }, { content: regex }];
    }

    const sortOption: Record<string, 1 | -1> = tab === 'popular' ? { view_count: -1 } : { created_at: -1 };

    const total = await ArticleModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const rawArticles = await ArticleModel.find(filter)
      .populate('author_id', 'name avatar username')
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug')
      .sort(sortOption)
      .skip(offset)
      .limit(limit);

    const publishedArticles = rawArticles.map((art) => {
      const doc = art.toObject();
      return {
        id: doc._id.toString(),
        title: doc.title,
        slug: doc.slug,
        excerpt: doc.excerpt,
        content: doc.content,
        metaDescription: doc.meta_description,
        thumbnailUrl: doc.thumbnail_url,
        viewCount: doc.view_count,
        isFeatured: doc.is_featured,
        revenue: doc.revenue,
        createdAt: doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : '',
        authorName: (doc.author_id as any)?.name || (doc.author_id as any)?.username || 'Global Analyst',
        authorAvatar: (doc.author_id as any)?.avatar || 'A',
        categoryName: (doc.category_id as any)?.name || null,
        categorySlug: (doc.category_id as any)?.slug || null,
        subCategoryName: (doc.sub_category_id as any)?.name || null,
        subCategorySlug: (doc.sub_category_id as any)?.slug || null,
      };
    });

    // Niche Row 1: Finance & Crypto Articles
    const catFinanceObj = rawCategories.find((c) => c.slug === 'finance-crypto');
    const rawFinanceArticles = catFinanceObj
      ? await ArticleModel.find({ status: 'published', category_id: catFinanceObj._id }).limit(3)
      : [];
    const financeArticles = rawFinanceArticles.map((art) => ({
      id: art._id.toString(),
      title: art.title,
      slug: art.slug,
      excerpt: art.excerpt,
      thumbnailUrl: art.thumbnail_url,
      viewCount: art.view_count,
      createdAt: art.created_at ? new Date(art.created_at).toISOString().split('T')[0] : '',
    }));

    // Niche Row 2: Cloud & Tech Articles
    const catTechObj = rawCategories.find((c) => c.slug === 'cloud-tech-tools');
    const rawTechArticles = catTechObj
      ? await ArticleModel.find({ status: 'published', category_id: catTechObj._id }).limit(3)
      : [];
    const techArticles = rawTechArticles.map((art) => ({
      id: art._id.toString(),
      title: art.title,
      slug: art.slug,
      excerpt: art.excerpt,
      thumbnailUrl: art.thumbnail_url,
      viewCount: art.view_count,
      createdAt: art.created_at ? new Date(art.created_at).toISOString().split('T')[0] : '',
    }));

    const rawSettings = await SettingModel.findOne();
    const currentSettings = rawSettings
      ? {
          id: rawSettings._id.toString(),
          siteTitle: rawSettings.site_title,
          metaDescription: rawSettings.metaDescription,
          focusKeywords: rawSettings.focusKeywords,
          canonicalUrl: rawSettings.canonicalUrl,
          hreflang: rawSettings.hreflang,
          geoTarget: rawSettings.geoTarget,
          businessName: rawSettings.businessName,
          businessAddress: rawSettings.businessAddress,
          businessPhone: rawSettings.businessPhone,
          ogImageUrl: rawSettings.ogImageUrl,
          schemaJsonld: rawSettings.schemaJsonld,
          headScripts: rawSettings.headScripts,
          primaryColor: rawSettings.primary_color,
          accentColor: rawSettings.accent_color,
          themeMode: rawSettings.theme_mode,
          fontFamily: rawSettings.font_family,
          logoUrl: rawSettings.logo_url,
          faviconUrl: rawSettings.favicon_url,
          bannerText: rawSettings.banner_text,
          footerText: rawSettings.footer_text,
          customCss: rawSettings.custom_css,
          geoLatitude: rawSettings.geo_latitude,
          geoLongitude: rawSettings.geo_longitude,
          geoRegionName: rawSettings.geo_region_name,
          geoPlacename: rawSettings.geo_placename,
          updatedAt: rawSettings.updated_at,
        }
      : null;

    return {
      publishedArticles,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      categories: formattedCategories,
      financeArticles,
      techArticles,
      settings: currentSettings,
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      publishedArticles: [],
      pagination: { total: 0, page: 1, limit: 6, totalPages: 0, hasMore: false },
      categories: [],
      financeArticles: [],
      techArticles: [],
      settings: null,
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { settings: siteSettings } = await getHomePageData();

  const title = siteSettings?.siteTitle || 'AI AFFILIATE HUB - Leading AI Tool Reviews & Affiliate Insights';
  const description =
    siteSettings?.metaDescription ||
    'Discover high-paying AI affiliate programs, comprehensive AI tool reviews, and expert strategies for AI content monetization.';

  return {
    title,
    description,
    keywords: siteSettings?.focusKeywords?.split(',') || ['ai affiliate programs', 'ai tool reviews', 'jasper ai', 'elevenlabs'],
    alternates: { canonical: siteSettings?.canonicalUrl || 'https://aiaffiliatehub.com' },
    openGraph: {
      title,
      description,
      url: siteSettings?.canonicalUrl || 'https://aiaffiliatehub.com',
      images: [
        {
          url: siteSettings?.ogImageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { tab = 'latest', category = '', sub_category = '', q = '', page = '1' } = await searchParams;

  await connectToDatabase();

  // Load site settings
  const siteSettingsDoc = await SettingModel.findOne();
  const siteSettings = siteSettingsDoc ? JSON.parse(JSON.stringify(siteSettingsDoc)) : null;

  // Build filter query
  const filterQuery: any = { status: 'published' };

  if (q) {
    filterQuery.$or = [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { excerpt: { $regex: q, $options: 'i' } },
    ];
  }

  if (category) {
    const catDoc = await CategoryModel.findOne({ slug: category });
    if (catDoc) filterQuery.category_id = catDoc._id;
  }

  if (sub_category) {
    const subCatDoc = await SubCategoryModel.findOne({ slug: sub_category });
    if (subCatDoc) filterQuery.sub_category_id = subCatDoc._id;
  }

  // Sorting logic
  let sortOption: any = { created_at: -1 };
  if (tab === 'hot' || tab === 'popular') {
    sortOption = { view_count: -1, created_at: -1 };
  }

  const pageNum = parseInt(page, 10) || 1;
  const limit = 6;
  const skip = (pageNum - 1) * limit;

  const [articles, totalCount] = await Promise.all([
    ArticleModel.find(filterQuery)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('author_id', 'name username avatar')
      .populate('category_id', 'name slug')
      .populate('sub_category_id', 'name slug'),
    ArticleModel.countDocuments(filterQuery),
  ]);

  // Load all categories & subcategories for navigation
  const categoriesRaw = await CategoryModel.find().sort({ position: 1 });
  const subCategoriesRaw = await SubCategoryModel.find();

  const categoryList = categoriesRaw.map((cat) => ({
    id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
    subCategories: subCategoriesRaw
      .filter((sub) => sub.category_id.toString() === cat._id.toString())
      .map((sub) => ({ id: sub._id.toString(), name: sub.name, slug: sub.slug })),
  }));

  const publishedArticles = articles.map((art) => ({
    id: art._id.toString(),
    title: art.title,
    slug: art.slug,
    excerpt: art.excerpt,
    content: art.content,
    thumbnailUrl: art.thumbnail_url,
    viewCount: art.view_count,
    isFeatured: art.is_featured,
    categoryName: (art.category_id as any)?.name || '',
    categorySlug: (art.category_id as any)?.slug || '',
    subCategoryName: (art.sub_category_id as any)?.name || '',
    authorName: (art.author_id as any)?.name || (art.author_id as any)?.username || 'AI Specialist',
    authorAvatar: (art.author_id as any)?.avatar || '',
    createdAt: art.created_at ? new Date(art.created_at).toISOString().split('T')[0] : '',
  }));

  const featuredArticle = publishedArticles.find((a) => a.isFeatured) || publishedArticles[0];
  const bentoSub1 = publishedArticles[1] || publishedArticles[0];
  const bentoSub2 = publishedArticles[2] || publishedArticles[0];

  // Specific niche query articles
  const financeArticles = publishedArticles.slice(0, 3);
  const techArticles = publishedArticles.slice(3, 6).length > 0 ? publishedArticles.slice(3, 6) : publishedArticles.slice(0, 3);

  const pagination = {
    page: pageNum,
    limit,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit),
    hasMore: pageNum * limit < totalCount,
  };

  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteSettings?.site_title || 'AI AFFILIATE HUB',
    url: siteSettings?.canonicalUrl || 'https://aiaffiliatehub.com',
    description: siteSettings?.metaDescription || 'AI Tool Reviews & Revenue Automation Platform',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteSettings?.canonicalUrl || 'https://aiaffiliatehub.com'}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans selection:bg-[#FF6B6B]/20 selection:text-[#FF6B6B] text-slate-700 overflow-y-auto relative custom-scrollbar flex flex-col justify-between">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }} />

      <h1 className="sr-only">{siteSettings?.site_title || 'AI AFFILIATE HUB'} - AI Tool Reviews & Affiliate Monetization Platform</h1>

      {/* Soft Background Decorators */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-100/40 blur-[140px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-100/30 blur-[150px]"></div>
      </div>

      {/* Public Navigation */}
      <PublicNav categoriesList={categoryList as any} siteSettings={siteSettings} />

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-16 w-full flex-1">
        {/* Breaking News Ticker from demogiaodien.html */}
        {!q && !category && (
          <BreakingNewsTicker
            newsText={featuredArticle ? `Nổi Bật: ${featuredArticle.title}` : undefined}
            newsLink={featuredArticle ? `/article/${featuredArticle.slug}` : undefined}
          />
        )}

        {/* Hero Bento Grid Section (Span 7 + Span 5) from demogiaodien.html */}
        {featuredArticle && !q && !category && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#0056B3]" />
                <h2 className="text-[#0056B3] text-sm font-bold tracking-widest uppercase">Hero Bento Spotlight</h2>
              </div>
              <span className="text-xs text-[#0056B3] font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Bento Edition
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Bento Box (Span 7) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition relative overflow-hidden group min-h-[460px] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="absolute inset-0 z-0 opacity-90 group-hover:scale-105 transition duration-700">
                  <img
                    src={featuredArticle.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-[#0056B3] text-white text-xs font-bold px-3.5 py-1 rounded-xl shadow-md">
                    {featuredArticle.categoryName || 'AI Intelligence'}
                  </span>
                  <span className="text-xs text-slate-300 font-medium flex items-center bg-black/40 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10">
                    <Clock size={12} className="text-cyan-400 mr-1.5" /> {featuredArticle.createdAt}
                  </span>
                </div>

                <div className="relative z-10 mt-auto pt-16">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 group-hover:text-cyan-300 transition leading-tight">
                    <Link href={`/article/${featuredArticle.slug}`}>{featuredArticle.title}</Link>
                  </h1>
                  <p className="text-slate-200 text-xs sm:text-sm line-clamp-2 mb-6 font-normal leading-relaxed">
                    {featuredArticle.excerpt || featuredArticle.content.replace(/<[^>]*>?/gm, '').substring(0, 140)}...
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/15">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#0056B3] text-white flex items-center justify-center font-bold text-sm border border-white/20">
                        {featuredArticle.authorAvatar || 'A'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{featuredArticle.authorName || 'AI Specialist'}</p>
                        <p className="text-[10px] text-slate-300">Senior AI Editor</p>
                      </div>
                    </div>

                    <Link
                      href={`/article/${featuredArticle.slug}`}
                      className="px-5 py-2.5 rounded-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-rose-500/20 hover:scale-105 transition-all"
                    >
                      <span>Read Story</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Secondary Bento Cards (Span 5) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Sub Bento Item 1 */}
                {bentoSub1 && (
                  <div className="bg-white rounded-3xl p-6 transition flex flex-col justify-between flex-grow group cursor-pointer border border-slate-100 shadow-md hover:shadow-xl hover:border-slate-200 duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1 rounded-xl">
                          {bentoSub1.categoryName || 'Security & AI'}
                        </span>
                        <span className="text-xs text-slate-400">{bentoSub1.createdAt}</span>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-900 group-hover:text-[#0056B3] transition line-clamp-2">
                        <Link href={`/article/${bentoSub1.slug}`}>{bentoSub1.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {bentoSub1.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Bởi {bentoSub1.authorName}</span>
                      <span className="flex items-center text-[#20C997] font-semibold">
                        <Eye size={12} className="mr-1" /> {bentoSub1.viewCount} Views
                      </span>
                    </div>
                  </div>
                )}

                {/* Sub Bento Item 2 */}
                {bentoSub2 && (
                  <div className="bg-white rounded-3xl p-6 transition flex flex-col justify-between flex-grow group cursor-pointer border border-slate-100 shadow-md hover:shadow-xl hover:border-slate-200 duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-blue-50 text-[#0056B3] border border-blue-200 text-xs font-bold px-2.5 py-1 rounded-xl">
                          {bentoSub2.categoryName || 'AI Tools'}
                        </span>
                        <span className="text-xs text-slate-400">{bentoSub2.createdAt}</span>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mb-2 text-slate-900 group-hover:text-[#0056B3] transition line-clamp-2">
                        <Link href={`/article/${bentoSub2.slug}`}>{bentoSub2.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {bentoSub2.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Bởi {bentoSub2.authorName}</span>
                      <span className="flex items-center text-[#20C997] font-semibold">
                        <Eye size={12} className="mr-1" /> {bentoSub2.viewCount} Views
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Khối 2: Top Recommended Deals (Editor's Choice / Top Affiliate Picks) */}
        {!q && <TopPicksWidget />}

        {/* Khối 3: Niche Section Rows (Dải Ngách Từng Chuyên Mục) */}
        {!q && !category && (
          <div className="space-y-16">
            {/* Niche Row 1: AI Use Cases */}
            {financeArticles.length > 0 && (
              <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#0056B3]" />
                    <h2 className="text-xl font-bold text-slate-900">AI Use Cases & Real-World Deployments</h2>
                  </div>
                  <Link href="/?category=ai-use-cases" className="text-xs text-[#0056B3] hover:underline font-bold flex items-center gap-1">
                    Explore Use Cases <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {financeArticles.map((art) => (
                    <div key={art.id} className="bg-slate-50/60 border border-slate-200/60 rounded-2xl overflow-hidden hover:border-[#0056B3]/40 hover:bg-white transition-all flex flex-col justify-between group p-5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#0056B3] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                          AI Use Cases
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-3 mb-2 group-hover:text-[#0056B3] transition-colors line-clamp-2">
                          <Link href={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">{art.excerpt}</p>
                      </div>
                      <Link href={`/article/${art.slug}`} className="text-xs font-semibold text-[#0056B3] flex items-center justify-between pt-3 border-t border-slate-200/80">
                        <span>Read Case Study</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Niche Row 2: AI Content & Tools */}
            {techArticles.length > 0 && (
              <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-xl font-bold text-slate-900">AI Content & Developer Tools</h2>
                  </div>
                  <Link href="/?category=ai-content-copywriting" className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1">
                    Explore Tools <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {techArticles.map((art) => (
                    <div key={art.id} className="bg-slate-50/60 border border-slate-200/60 rounded-2xl overflow-hidden hover:border-indigo-400 hover:bg-white transition-all flex flex-col justify-between group p-5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                          AI Tools & Reviews
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-3 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          <Link href={`/article/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">{art.excerpt}</p>
                      </div>
                      <Link href={`/article/${art.slug}`} className="text-xs font-semibold text-indigo-600 flex items-center justify-between pt-3 border-t border-slate-200/80">
                        <span>Read Review</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Khối 1: Expanded Article Grid + Nút Load More */}
        <section id="articles-grid">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0056B3]" /> Expanded AI Research Grid
              </h2>
              <p className="text-xs text-slate-500 mt-1">Explore AI tool reviews, deployment case studies, and automation guides.</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {categoryList.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/?category=${cat.slug}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${category === cat.slug ? 'bg-blue-50 border-blue-200 text-[#0056B3] font-bold' : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white'
                    }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <ArticleGrid
            initialArticles={publishedArticles}
            initialPagination={pagination}
            currentParams={{ tab, category, sub_category, q }}
          />
        </section>

        {/* Khối 4: Lead Capture Newsletter Box */}
        {!q && <LeadCapture />}
      </main>

      {/* Footer */}
      <Footer bioText={siteSettings?.footer_text} />
    </div>
  );
}
