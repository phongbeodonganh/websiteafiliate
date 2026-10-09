import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, UserModel, ClickLogModel, SubscriberModel, ProductModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { ACTIVE_SUBSCRIBER_FILTER } from '@/lib/insider/subscribers';

interface PopulatedAuthor {
  _id?: { toString(): string };
  name?: string;
  username?: string;
}

interface EditorStats {
  user: {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'editor' | 'author';
    avatar: string;
  };
  views: number;
  clicks: number;
  revenue: number;
  bestArticle: { title: string; revenue: number } | null;
  maxClicks: number;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const filter = user.role === 'admin' ? {} : { author_id: user.userId.toString() };

    const rawArticles = await ArticleModel.find(filter)
      .populate('author_id', 'name username role avatar')
      .sort({ created_at: -1 });

    const allClicks = await ClickLogModel.find();
    const clickMap: Record<string, number> = {};
    allClicks.forEach((log) => {
      if (log.article_id) {
        const artIdStr = log.article_id.toString();
        clickMap[artIdStr] = (clickMap[artIdStr] || 0) + 1;
      }
    });

    const articlesWithClicks = rawArticles.map((art) => {
      const doc = art.toObject();
      const artIdStr = doc._id.toString();
      const clicks = clickMap[artIdStr] ?? 0;
      const author = doc.author_id as unknown as PopulatedAuthor | undefined;
      return {
        id: artIdStr,
        authorId: author?._id?.toString() || doc.author_id?.toString() || null,
        authorName: author?.name || author?.username || 'Unknown',
        title: doc.title,
        slug: doc.slug,
        status: doc.status,
        viewCount: doc.view_count,
        revenue: doc.revenue || 0,
        createdAt: doc.created_at,
        clicks,
      };
    });

    const totalViews = articlesWithClicks.reduce((sum, a) => sum + a.viewCount, 0);
    const totalClicks = articlesWithClicks.reduce((sum, a) => sum + a.clicks, 0);
    const totalRevenue = articlesWithClicks.reduce((sum, a) => sum + a.revenue, 0);
    const conversionRate = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0;

    const topArticles = [...articlesWithClicks]
      .filter((a) => a.status === 'published')
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    let topEditors: EditorStats[] = [];
    if (user.role === 'admin') {
      const allUsers = await UserModel.find();
      const allPublished = await ArticleModel.find({ status: 'published' });

      const userStats: Record<string, EditorStats> = {};

      allPublished.forEach((article) => {
        const artDoc = article.toObject();
        const artIdStr = artDoc._id.toString();
        const clicks = clickMap[artIdStr] ?? 0;
        const authorIdStr = artDoc.author_id ? artDoc.author_id.toString() : 'unknown';

        if (!userStats[authorIdStr]) {
          const authorObj = allUsers.find((u) => u._id.toString() === authorIdStr);
          userStats[authorIdStr] = {
            user: {
              id: authorObj ? authorObj._id.toString() : authorIdStr,
              name: authorObj?.name || authorObj?.username || 'Unknown',
              username: authorObj?.username || 'unknown',
              role: authorObj?.role || 'author',
              avatar: authorObj?.avatar || authorObj?.username?.[0]?.toUpperCase() || 'U',
            },
            views: 0,
            clicks: 0,
            revenue: 0,
            bestArticle: null,
            maxClicks: -1,
          };
        }

        userStats[authorIdStr].views += artDoc.view_count;
        userStats[authorIdStr].clicks += clicks;
        userStats[authorIdStr].revenue += artDoc.revenue || 0;

        if (clicks > userStats[authorIdStr].maxClicks) {
          userStats[authorIdStr].maxClicks = clicks;
          userStats[authorIdStr].bestArticle = {
            title: artDoc.title,
            revenue: artDoc.revenue,
          };
        }
      });

      topEditors = Object.values(userStats)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
    }

    const totalSubscribers = await SubscriberModel.countDocuments(ACTIVE_SUBSCRIBER_FILTER);

    // Physical-product operating metrics. Authors/editors only see products
    // created by their own account, matching the CMS product ownership rules.
    const productFilter = user.role === 'admin' ? {} : { author_id: user.userId.toString() };
    const rawProducts = await ProductModel.find(productFilter)
      .populate('category_id', 'name slug')
      .sort({ updated_at: -1 });
    const visibleProductIds = new Set(rawProducts.map((product) => product._id.toString()));
    const productClickMap: Record<string, number> = {};
    const marketplaceClicks: Record<string, number> = {};
    allClicks.forEach((log) => {
      if (!log.product_id) return;
      const productId = log.product_id.toString();
      if (!visibleProductIds.has(productId)) return;
      productClickMap[productId] = (productClickMap[productId] || 0) + 1;
      if (log.marketplace) marketplaceClicks[log.marketplace] = (marketplaceClicks[log.marketplace] || 0) + 1;
    });

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const productRows = rawProducts.map((product) => {
      const doc = product.toObject();
      const id = doc._id.toString();
      const activeOffers = (doc.offers || []).filter((offer) => offer.status === 'active');
      const primaryOffer = activeOffers.find((offer) => offer.is_primary) || activeOffers[0];
      const lastChecked = primaryOffer?.last_checked_at || doc.price_checked_at;
      const issues: string[] = [];
      if (!doc.images?.length) issues.push('Thiếu ảnh sản phẩm');
      if (!activeOffers.length) issues.push('Chưa có link mua đang hoạt động');
      if (!doc.category_id) issues.push('Chưa chọn danh mục');
      if (doc.status === 'draft') issues.push('Sản phẩm còn ở bản nháp');
      if (primaryOffer?.stock_status === 'out_of_stock') issues.push('Sản phẩm đang hết hàng');
      if (!lastChecked || new Date(lastChecked).getTime() < sevenDaysAgo) issues.push('Giá chưa được kiểm tra trong 7 ngày');
      const clicks = productClickMap[id] ?? Number(doc.click_count || 0);
      const views = Number(doc.view_count || 0);
      return {
        id,
        name: doc.name,
        slug: doc.slug,
        sku: doc.sku,
        status: doc.status,
        image: doc.images?.[0]?.url || '',
        categoryName: typeof doc.category_id === 'object' && doc.category_id && 'name' in doc.category_id
          ? String((doc.category_id as unknown as { name?: string }).name || '')
          : '',
        price: Number(doc.price_min || doc.price || primaryOffer?.price || 0),
        originalPrice: Number(primaryOffer?.original_price || doc.original_price || 0),
        discountPercent: Number(doc.discount_percent || 0),
        views,
        clicks,
        ctr: views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0,
        offers: activeOffers.length,
        marketplace: primaryOffer?.marketplace || '',
        lastCheckedAt: lastChecked || null,
        updatedAt: doc.updated_at,
        issues,
      };
    });

    const publishedProducts = productRows.filter((product) => product.status === 'published');
    const totalProductViews = productRows.reduce((sum, product) => sum + product.views, 0);
    const totalProductClicks = productRows.reduce((sum, product) => sum + product.clicks, 0);
    const productCtr = totalProductViews > 0
      ? Number(((totalProductClicks / totalProductViews) * 100).toFixed(1))
      : 0;
    const topProducts = [...publishedProducts]
      .sort((a, b) => b.clicks - a.clicks || b.views - a.views || b.discountPercent - a.discountPercent)
      .slice(0, 6);
    const allProductsNeedingAttention = productRows
      .filter((product) => product.status !== 'archived' && product.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
    const productsNeedingAttention = allProductsNeedingAttention.slice(0, 8);
    const marketplaceBreakdown = Object.entries(marketplaceClicks)
      .map(([marketplace, clicks]) => ({ marketplace, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6);

    return NextResponse.json({
      status: 'success',
      data: {
        totalViews,
        totalClicks,
        totalRevenue,
        conversionRate,
        totalSubscribers,
        topArticles,
        topEditors,
        products: {
          total: productRows.length,
          published: publishedProducts.length,
          drafts: productRows.filter((product) => product.status === 'draft').length,
          archived: productRows.filter((product) => product.status === 'archived').length,
          totalViews: totalProductViews,
          totalClicks: totalProductClicks,
          ctr: productCtr,
          averageDiscount: publishedProducts.length
            ? Number((publishedProducts.reduce((sum, product) => sum + product.discountPercent, 0) / publishedProducts.length).toFixed(1))
            : 0,
          healthy: productRows.filter((product) => product.status !== 'archived' && product.issues.length === 0).length,
          needAttention: allProductsNeedingAttention.length,
          topProducts,
          productsNeedingAttention,
          marketplaceBreakdown,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ status: 'error', message: 'Không thể tải dữ liệu tổng quan.' }, { status: 500 });
  }
}
