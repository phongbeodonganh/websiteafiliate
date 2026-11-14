import { connectToDatabase } from '@/lib/db/mongodb';
import { ArticleModel, ClickLogModel } from '@/lib/db/models';
import { getGa4PageMetrics } from './ga4';
import { getOrganicOverview, getQuickWinQueries, getContentDecay } from './gsc';

export interface FunnelRow {
  articleTitle: string;
  articleSlug: string;
  pageviews: number;
  affiliateClicks: number;
  clickThroughRate: number;
}

export interface InsightsPayload {
  organicOverview: Awaited<ReturnType<typeof getOrganicOverview>>;
  quickWinQueries: Awaited<ReturnType<typeof getQuickWinQueries>>;
  contentDecay: Awaited<ReturnType<typeof getContentDecay>>;
  funnel: FunnelRow[];
}

// GA4 pagePath cho bài viết có dạng "/article/<slug>" (xem src/app/article/[slug]/page.tsx).
function slugFromPagePath(pagePath: string): string | null {
  const match = pagePath.match(/^\/article\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function buildFunnel(days: number): Promise<FunnelRow[]> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const [ga4Rows] = await Promise.all([getGa4PageMetrics(toDateStr(start), toDateStr(end))]);

  const pageviewsBySlug = new Map<string, number>();
  for (const row of ga4Rows) {
    const slug = slugFromPagePath(row.pagePath);
    if (!slug) continue;
    pageviewsBySlug.set(slug, (pageviewsBySlug.get(slug) || 0) + row.pageviews);
  }

  await connectToDatabase();
  const clickCounts = await ClickLogModel.aggregate([
    { $match: { clicked_at: { $gte: start, $lte: end }, article_id: { $ne: null } } },
    { $group: { _id: '$article_id', clicks: { $sum: 1 } } },
  ]);

  const articleIds = clickCounts.map((c) => c._id);
  const slugs = Array.from(pageviewsBySlug.keys());
  const articles = await ArticleModel.find({
    $or: [{ _id: { $in: articleIds } }, { slug: { $in: slugs } }],
  })
    .select('_id title slug')
    .lean();

  const clicksByArticleId = new Map(clickCounts.map((c) => [String(c._id), c.clicks as number]));
  const rows: FunnelRow[] = articles.map((article) => {
    const pageviews = pageviewsBySlug.get(article.slug) || 0;
    const affiliateClicks = clicksByArticleId.get(String(article._id)) || 0;
    return {
      articleTitle: article.title,
      articleSlug: article.slug,
      pageviews,
      affiliateClicks,
      clickThroughRate: pageviews > 0 ? Math.round((affiliateClicks / pageviews) * 1000) / 10 : 0,
    };
  });

  return rows.filter((r) => r.pageviews > 0 || r.affiliateClicks > 0).sort((a, b) => b.pageviews - a.pageviews).slice(0, 20);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function buildInsightsPayload(days = 28): Promise<InsightsPayload> {
  const [organicOverview, quickWinQueries, contentDecay, funnel] = await Promise.all([
    getOrganicOverview(days),
    getQuickWinQueries(days),
    getContentDecay(days),
    buildFunnel(days),
  ]);

  return { organicOverview, quickWinQueries, contentDecay, funnel };
}
