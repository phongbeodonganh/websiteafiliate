import { google } from 'googleapis';
import { getGoogleAuthClient } from './auth';

export interface Ga4PageMetric {
  pagePath: string;
  pageviews: number;
  sessions: number;
  activeUsers: number;
}

export async function getGa4PageMetrics(startDate: string, endDate: string): Promise<Ga4PageMetric[]> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error('GA4_PROPERTY_ID is not set.');

  const auth = getGoogleAuthClient();
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const res = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'activeUsers' }],
      limit: '5000',
    },
  });

  const rows = res.data.rows || [];
  return rows.map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value || '',
    pageviews: Number(row.metricValues?.[0]?.value || 0),
    sessions: Number(row.metricValues?.[1]?.value || 0),
    activeUsers: Number(row.metricValues?.[2]?.value || 0),
  }));
}
