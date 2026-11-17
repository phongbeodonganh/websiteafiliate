import { connectToDatabase } from '@/lib/db/mongodb';
import { SettingModel } from '@/lib/db/models';

// Google Insights (GA4 Data API + Search Console API) credential resolution.
//
// Precedence: MongoDB `Setting` singleton (edited from the admin Settings >
// "Tích hợp Google" screen) → process.env fallback (GOOGLE_SERVICE_ACCOUNT_JSON,
// GA4_PROPERTY_ID, GSC_SITE_URL). This lets each deployment configure its own
// credentials from the UI without a redeploy, while keeping env-based deploys
// working unchanged.

export interface GoogleInsightsConfig {
  serviceAccountJson: string;
  ga4PropertyId: string;
  gscSiteUrl: string;
  /** Which source each value came from — 'db' | 'env' | 'none'. */
  sources: {
    serviceAccountJson: 'db' | 'env' | 'none';
    ga4PropertyId: 'db' | 'env' | 'none';
    gscSiteUrl: 'db' | 'env' | 'none';
  };
}

const CONFIG_TTL_MS = 60 * 1000;

let configCache: { value: GoogleInsightsConfig; expiresAt: number } | null = null;

function pick(dbValue: string | undefined, envKey: string): { value: string; source: 'db' | 'env' | 'none' } {
  const trimmedDb = typeof dbValue === 'string' ? dbValue.trim() : '';
  if (trimmedDb) return { value: trimmedDb, source: 'db' };
  const envValue = process.env[envKey];
  if (envValue && envValue.trim()) return { value: envValue.trim(), source: 'env' };
  return { value: '', source: 'none' };
}

export async function getGoogleInsightsConfig(): Promise<GoogleInsightsConfig> {
  if (configCache && Date.now() < configCache.expiresAt) return configCache.value;

  await connectToDatabase();
  const setting = await SettingModel.findOne().select('google_service_account_json ga4_property_id gsc_site_url').lean();

  const serviceAccount = pick(setting?.google_service_account_json, 'GOOGLE_SERVICE_ACCOUNT_JSON');
  const ga4Property = pick(setting?.ga4_property_id, 'GA4_PROPERTY_ID');
  const gscSite = pick(setting?.gsc_site_url, 'GSC_SITE_URL');

  const value: GoogleInsightsConfig = {
    serviceAccountJson: serviceAccount.value,
    ga4PropertyId: ga4Property.value,
    gscSiteUrl: gscSite.value,
    sources: {
      serviceAccountJson: serviceAccount.source,
      ga4PropertyId: ga4Property.source,
      gscSiteUrl: gscSite.source,
    },
  };

  configCache = { value, expiresAt: Date.now() + CONFIG_TTL_MS };
  return value;
}

export function invalidateGoogleInsightsConfigCache(): void {
  configCache = null;
}

export interface GoogleInsightsStatus {
  configured: boolean;
  /** Missing credential keys, reported with env-var names for familiarity. */
  missing: string[];
}

const MISSING_KEY_LABEL: Record<string, string> = {
  serviceAccountJson: 'GOOGLE_SERVICE_ACCOUNT_JSON',
  ga4PropertyId: 'GA4_PROPERTY_ID',
  gscSiteUrl: 'GSC_SITE_URL',
};

export async function getGoogleInsightsStatus(): Promise<GoogleInsightsStatus> {
  const config = await getGoogleInsightsConfig();
  const missing: string[] = [];
  if (!config.serviceAccountJson) missing.push(MISSING_KEY_LABEL.serviceAccountJson);
  if (!config.ga4PropertyId) missing.push(MISSING_KEY_LABEL.ga4PropertyId);
  if (!config.gscSiteUrl) missing.push(MISSING_KEY_LABEL.gscSiteUrl);
  return { configured: missing.length === 0, missing };
}

/**
 * Parse the stored service-account credential. Accepts either raw JSON or
 * base64-encoded JSON (base64 avoids newline-mangling when copied between
 * systems). Returns the parsed object or null when unusable.
 */
export function parseServiceAccountJson(raw: string): { client_email?: string; private_key?: string } | null {
  if (!raw) return null;
  try {
    const jsonText = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonText);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}
