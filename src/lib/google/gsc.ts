import { google } from 'googleapis';
import { getGoogleAuthClient } from './auth';

export interface GscPagePerformance {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQuickWinQuery {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  position: number;
}

export interface GscDailyMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscContentDecayRow {
  page: string;
  clicksBefore: number;
  clicksAfter: number;
  changePercent: number;
}

interface RawGscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function querySearchAnalytics(params: {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}): Promise<RawGscRow[]> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error('GSC_SITE_URL is not set.');

  const auth = getGoogleAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit ?? 1000,
    },
  });

  return (res.data.rows || []).map((row) => ({
    keys: row.keys || [],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

// GSC data thường trễ ~2 ngày so với hiện tại nên trừ lùi mốc kết thúc.
function getReportWindowEnd(): Date {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  return end;
}

export async function getOrganicOverview(days = 28): Promise<GscDailyMetric[]> {
  const end = getReportWindowEnd();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const rows = await querySearchAnalytics({
    startDate: toDateStr(start),
    endDate: toDateStr(end),
    dimensions: ['date'],
  });

  return rows
    .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getQuickWinQueries(days = 28, limit = 15): Promise<GscQuickWinQuery[]> {
  const end = getReportWindowEnd();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const rows = await querySearchAnalytics({
    startDate: toDateStr(start),
    endDate: toDateStr(end),
    dimensions: ['query', 'page'],
    rowLimit: 5000,
  });

  return rows
    .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit)
    .map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Math.round(r.position * 10) / 10,
    }));
}

export async function getPagePerformance(startDate: string, endDate: string): Promise<GscPagePerformance[]> {
  const rows = await querySearchAnalytics({ startDate, endDate, dimensions: ['page'], rowLimit: 5000 });
  return rows.map((r) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

export async function getContentDecay(days = 28, dropThreshold = 0.2, limit = 15): Promise<GscContentDecayRow[]> {
  const end = getReportWindowEnd();
  const currentStart = new Date(end);
  currentStart.setDate(currentStart.getDate() - (days - 1));
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  const [current, previous] = await Promise.all([
    getPagePerformance(toDateStr(currentStart), toDateStr(end)),
    getPagePerformance(toDateStr(previousStart), toDateStr(previousEnd)),
  ]);

  const prevMap = new Map(previous.map((r) => [r.page, r]));

  return current
    .map((cur) => {
      const prev = prevMap.get(cur.page);
      if (!prev || prev.clicks < 5) return null;
      const change = (cur.clicks - prev.clicks) / prev.clicks;
      if (change > -dropThreshold) return null;
      return {
        page: cur.page,
        clicksBefore: prev.clicks,
        clicksAfter: cur.clicks,
        changePercent: Math.round(change * 1000) / 10,
      };
    })
    .filter((row): row is GscContentDecayRow => row !== null)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, limit);
}
