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
} from 'lucide-react';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, CategoryModel, SubCategoryModel, SettingModel } from '@/lib/db/models';
import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import TopPicksWidget from '@/components/TopPicksWidget';
import LeadCapture from '@/components/LeadCapture';
import ArticleGrid from '@/components/ArticleGrid';

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

  const title = siteSettings?.siteTitle || 'NEXUS FINANCE GLOBAL - Financial Insights & Crypto Research';
  const description =
    siteSettings?.metaDescription ||
    'Empowering global investors with institutional crypto research, financial insights, and exclusive affiliate partner deals.';

  return {
    title,
    description,
    keywords: siteSettings?.focusKeywords?.split(',') || ['crypto research', 'global finance', 'bitcoin analysis'],
    alternates: { canonical: siteSettings?.canonicalUrl || 'https://nexusfinance.global' },
    openGraph: {
      title,
      description,
      url: siteSettings?.canonicalUrl || 'https://nexusfinance.global',
      images: [
        {
          url: siteSettings?.ogImageUrl || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { tab = 'latest', category, sub_category, q, page = '1' } = await searchParams;
  const {
    publishedArticles,
    pagination,
    categories: categoryList,
    financeArticles,
    techArticles,
    settings: siteSettings,
  } = await getHomePageData(tab, category, sub_category, q, page);

  const featuredArticle = publishedArticles.find((a) => a.isFeatured) || publishedArticles[0];

  // Schema JSON-LD
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: siteSettings?.siteTitle || 'NEXUS FINANCE GLOBAL',
    url: siteSettings?.canonicalUrl || 'https://nexusfinance.global',
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteSettings?.businessAddress || '100 Wall Street, Suite 2400',
      addressLocality: 'New York',
      addressRegion: 'NY',
      addressCountry: 'US',
    },
  };

  return (
    <div className="min-h-screen bg-[#060608] font-sans selection:bg-amber-500/30 text-slate-300 overflow-y-auto relative custom-scrollbar flex flex-col justify-between">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }} />

      <h1 className="sr-only">{siteSettings?.siteTitle || 'NEXUS FINANCE GLOBAL'} - Institutional Crypto & Financial Platform</h1>

      {/* Background Decorators */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-900/5 blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-amber-900/10 blur-[150px]"></div>
      </div>

      {/* Public Navigation */}
      <PublicNav categoriesList={categoryList as any} siteSettings={siteSettings} />

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-20 w-full flex-1">
        {/* Hero Featured Article */}
        {featuredArticle && !q && !category && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={16} className="text-amber-400" />
              <h2 className="text-amber-400 text-sm font-semibold tracking-widest uppercase">Featured Global Insight</h2>
            </div>

            <div className="group cursor-pointer relative rounded-[2rem] overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all duration-500 grid grid-cols-1 lg:grid-cols-2 shadow-2xl">
              <div className="h-[300px] lg:h-[480px] relative overflow-hidden bg-slate-800">
                <img
                  src={featuredArticle.thumbnailUrl || 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop'}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent z-10 lg:hidden"></div>
              </div>

              <div className="p-8 lg:p-14 flex flex-col justify-center relative z-20 bg-gradient-to-r from-[#0a0a0c] to-transparent lg:bg-[#0a0a0c]">
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                  <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-semibold">
                    {featuredArticle.categoryName || 'Market Analysis'}
                  </span>
                  <span>{featuredArticle.createdAt?.split(' ')[0]}</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Eye size={14} /> {featuredArticle.viewCount?.toLocaleString()} views
                  </span>
                </div>

                <h3 className="text-2xl lg:text-4xl font-bold text-white mb-4 leading-snug group-hover:text-amber-400 transition-colors">
                  <Link href={`/bai-viet/${featuredArticle.slug}`}>{featuredArticle.title}</Link>
                </h3>

                <p className="text-slate-400 text-sm lg:text-base line-clamp-3 mb-8 leading-relaxed">
                  {featuredArticle.excerpt || featuredArticle.content.replace(/<[^>]*>?/gm, '').substring(0, 160)}...
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-bold">
                      {featuredArticle.authorAvatar || 'A'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{featuredArticle.authorName || 'Global Analyst'}</p>
                      <p className="text-xs text-slate-500">Institutional Strategy</p>
                    </div>
                  </div>

                  <Link
                    href={`/bai-viet/${featuredArticle.slug}`}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
                  >
                    Read Analysis <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Khối 2: Top Recommended Deals (Editor's Choice / Top Affiliate Picks) */}
        {!q && <TopPicksWidget />}

        {/* Khối 3: Niche Section Rows (Dải Ngách Từng Chuyên Mục) */}
        {!q && !category && (
          <div className="space-y-16">
            {/* Niche Row 1: Finance & Crypto */}
            {financeArticles.length > 0 && (
              <section className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-bold text-white">Finance & Crypto Deep Dive</h2>
                  </div>
                  <Link href="/?category=finance-crypto" className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1">
                    Explore Niche <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {financeArticles.map((art) => (
                    <div key={art.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-colors flex flex-col justify-between group p-5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                          Crypto & Web3
                        </span>
                        <h3 className="text-base font-bold text-white mt-3 mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">
                          <Link href={`/bai-viet/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{art.excerpt}</p>
                      </div>
                      <Link href={`/bai-viet/${art.slug}`} className="text-xs font-semibold text-amber-400 flex items-center justify-between pt-3 border-t border-slate-800">
                        <span>Read Full Report</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Niche Row 2: Cloud Infrastructure & Tech Tools */}
            {techArticles.length > 0 && (
              <section className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Cloud Infrastructure & Tech Showcase</h2>
                  </div>
                  <Link href="/?category=cloud-tech-tools" className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1">
                    Explore Tech <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {techArticles.map((art) => (
                    <div key={art.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition-colors flex flex-col justify-between group p-5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                          Cloud VPS & Security
                        </span>
                        <h3 className="text-base font-bold text-white mt-3 mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                          <Link href={`/bai-viet/${art.slug}`}>{art.title}</Link>
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{art.excerpt}</p>
                      </div>
                      <Link href={`/bai-viet/${art.slug}`} className="text-xs font-semibold text-cyan-400 flex items-center justify-between pt-3 border-t border-slate-800">
                        <span>Read Tech Guide</span>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" /> Expanded Market Research Grid
              </h2>
              <p className="text-xs text-slate-400 mt-1">Explore institutional briefings, market trends, and technical analysis.</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {categoryList.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/?category=${cat.slug}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${category === cat.slug ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'border-slate-800 text-slate-400 hover:text-white'
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
        <LeadCapture />

        {/* Khối 5: Trust Signals & Partner Logos Bar */}
        <section className="py-8 border-y border-slate-800/80">
          <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">
            Institutional Research Partner Networks & Platforms
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
            <span className="text-lg font-extrabold tracking-tight text-slate-300">BINANCE</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-300">VULTR</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-300">TREZOR</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-300">ACCESSTRADE</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-300">AWS CLOUD</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-300">DIGITALOCEAN</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-[#0a0a0c]/90 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="text-center md:text-left">
            <div className="text-xl font-bold tracking-tighter text-white flex items-center gap-2 mb-2 justify-center md:justify-start">
              NEXUS<span className="text-amber-400 font-light">FINANCE</span>
            </div>
            <p className="max-w-md text-slate-400 leading-relaxed mb-3">
              {siteSettings?.footerText || 'Institutional-grade financial news and crypto research platform. Empowering global investors with market insights and verified partner deals.'}
            </p>
            {/* Khối 5: Transparency Disclaimer */}
            <p className="max-w-md text-[11px] text-slate-500 italic">
              * Affiliate Transparency Disclosure: We may earn a referral commission from partner links on this platform without affecting the objectivity of our institutional research.
            </p>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p className="font-semibold text-slate-300 flex items-center justify-center md:justify-end gap-1">
              <MapPin size={14} className="text-amber-400" /> {siteSettings?.businessAddress || '100 Wall Street, Suite 2400, New York, NY 10005, USA'}
            </p>
            <p>Hotline: {siteSettings?.businessPhone || '+1 (800) 555-0199'} • Email: contact@nexusfinance.global</p>
            <p>© {new Date().getFullYear()} Nexus Finance Global LLC. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
