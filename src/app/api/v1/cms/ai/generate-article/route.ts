import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel, ArticleModel, CategoryModel, SettingModel, UserModel } from '@/lib/db/models';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';
import { scrapeLandingPageWithJina } from '@/lib/scraper';
import { generateSeoGeoArticleWithGemini } from '@/lib/gemini';
import { sanitizeGeneratedHtmlContent } from '@/lib/sanitizer';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'affiliate_secret_key_v3_super_secure';

async function verifyAdminAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// POST /api/v1/cms/ai/generate-article
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized. Yêu cầu quyền Admin/Editor.' }, { status: 401 });
    }

    const body = await req.json();
    const { campaignId, customTopic, customProductUrl, customBaseUrl, customName, language = 'vi-VN', userApiKey } = body;

    await connectToDatabase();

    let campaignName = customName || '';
    let baseUrl = customBaseUrl || '';
    let productUrl = customProductUrl || '';

    // If campaignId is supplied, load campaign from DB
    if (campaignId) {
      const campaign = await AffiliateLinkModel.findById(campaignId);
      if (campaign) {
        campaignName = campaign.name;
        baseUrl = campaign.base_url;
        productUrl = campaign.product_url || campaign.base_url;
      }
    }

    // Fallback logic if baseUrl is not explicitly provided
    if (!baseUrl) {
      if (customProductUrl && customProductUrl.startsWith('http')) {
        baseUrl = customProductUrl;
      } else if (customTopic && (customTopic.startsWith('http://') || customTopic.startsWith('https://'))) {
        baseUrl = customTopic;
        if (!productUrl) productUrl = customTopic;
      }
    }

    if (!baseUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Vui lòng chọn một Chiến dịch Affiliate có sẵn hoặc nhập Link Affiliate / Website URL.' },
        { status: 400 }
      );
    }

    // Step 1: Real-time Blacklist Interceptor Check
    const blacklistCheck = await checkUrlAgainstBlacklist(baseUrl);
    if (blacklistCheck.isBlacklisted) {
      return NextResponse.json(
        {
          status: 'error',
          message: `🛑 URL ${baseUrl} đã bị chặn bởi Blacklist! Lý do: ${blacklistCheck.reason || 'Không an toàn'}`,
          isBlacklisted: true,
        },
        { status: 422 }
      );
    }

    // Determine Topic
    const topic = customTopic || `Đánh Giá Chi Tiết ${campaignName} - Tính Năng & Ưu Đãi Mới Nhất 2026`;
    const targetScrapeUrl = productUrl || baseUrl;

    // Step 2: Jina AI Landing Page Scraper
    console.log(`[AI Workflow] Scrape landing page via Jina AI for: ${targetScrapeUrl}`);
    const landingPageContext = await scrapeLandingPageWithJina(targetScrapeUrl);

    // Step 3: Fetch Gemini API Key (from request, env, or settings)
    let geminiApiKey = userApiKey || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6LfIjKqSrL5Ax8dYKyuMyapxXiVpsfSI2OoFDJuBB-kZQ';
    if (!geminiApiKey) {
      const dbSetting = await SettingModel.findOne({});
      if (dbSetting && (dbSetting as any).geminiApiKey) {
        geminiApiKey = (dbSetting as any).geminiApiKey;
      }
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Vui lòng cung cấp Gemini API Key trong Cài Đặt Hệ Thống hoặc ô nhập API Key.',
        },
        { status: 400 }
      );
    }

    // Step 4: Gemini AI Generation with JSON Schema Enforcement
    console.log(`[AI Workflow] Generating article via Gemini for topic: ${topic}`);
    const generatedData = await generateSeoGeoArticleWithGemini({
      topic,
      landingPageContext,
      campaignName,
      trackingUrl: baseUrl,
      apiKey: geminiApiKey,
      language,
    });

    // Step 5: Post-Processing Sanitization Link Checker
    const sanitizedHtml = sanitizeGeneratedHtmlContent(generatedData.content_html, [baseUrl]);

    // Create Slug
    const rawTitle = generatedData.seo_meta?.h1 || topic;
    const cleanSlug = rawTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .concat('-', Date.now().toString().slice(-4));

    // Get default category
    const defaultCat = await CategoryModel.findOne({});
    const categoryId = defaultCat ? defaultCat._id : undefined;

    // Resolve author_id safely from JWT or DB fallback
    let authorId = user?.userId || user?.id || user?._id;
    if (!authorId) {
      const adminUser = await UserModel.findOne({ role: 'admin' });
      if (adminUser) authorId = adminUser._id;
    }

    if (!authorId) {
      return NextResponse.json({ status: 'error', message: 'Không thể xác định Tác giả (author_id) bài viết.' }, { status: 400 });
    }

    // Convert FAQ into structured array
    const faqArray = [];
    if (Array.isArray(generatedData.geo_data?.faq_list) && generatedData.geo_data.faq_list.length > 0) {
      for (const item of generatedData.geo_data.faq_list) {
        if (item.question && item.answer) {
          faqArray.push({ question: item.question, answer: item.answer });
        }
      }
    }

    if (faqArray.length === 0 && generatedData.geo_data?.faq_schema_jsonld) {
      try {
        const parsedJsonLd = JSON.parse(generatedData.geo_data.faq_schema_jsonld);
        if (parsedJsonLd.mainEntity && Array.isArray(parsedJsonLd.mainEntity)) {
          for (const item of parsedJsonLd.mainEntity) {
            faqArray.push({
              question: item.name || '',
              answer: item.acceptedAnswer?.text || '',
            });
          }
        }
      } catch {
        // Ignored if raw string
      }
    }

    // Step 6: Auto-Save Article as 'draft' in MongoDB
    const newArticle = await ArticleModel.create({
      title: rawTitle,
      slug: cleanSlug,
      content: sanitizedHtml,
      excerpt: generatedData.seo_meta?.meta_description || `${rawTitle} - Đánh giá chi tiết và hướng dẫn sử dụng tốt nhất 2026.`,
      category_id: categoryId,
      author_id: authorId,
      status: 'draft',
      is_featured: false,
      focus_keyword: generatedData.seo_meta?.focus_keywords?.[0] || campaignName,
      meta_title: generatedData.seo_meta?.meta_title || rawTitle,
      meta_description: generatedData.seo_meta?.meta_description || '',
      key_takeaways: generatedData.geo_data?.key_takeaways || [],
      entities: generatedData.geo_data?.entities || [],
      faq_schema: faqArray,
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
      view_count: 0,
      revenue: 0,
    });

    return NextResponse.json({
      status: 'success',
      message: '✨ Đã sinh bài viết tự động chuẩn SEO & GEO V5.3 thành công!',
      data: {
        articleId: (newArticle as any)._id.toString(),
        title: rawTitle,
        slug: cleanSlug,
        content: sanitizedHtml,
        excerpt: (newArticle as any).excerpt,
        seo_meta: generatedData.seo_meta,
        geo_data: {
          ...generatedData.geo_data,
          faq_list: faqArray,
        },
        faqSchema: faqArray,
        sanitizedHtml,
      },
    });
  } catch (error: any) {
    console.error('Error in AI Article Generator API:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
