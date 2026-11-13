import { clampTrafficMonths, DEFAULT_TRAFFIC_MONTHS } from "@/lib/traffic/config";

export interface TrafficSettingsInput {
  traffic_tabapi_key?: string | null;
  traffic_serpapi_key?: string | null;
  traffic_whois_api_key?: string | null;
  traffic_seranking_api_key?: string | null;
  traffic_trustpilot_scraper_url?: string | null;
  traffic_months?: number | null;
}

export interface ResolvedCredential {
  value: string | null;
  source: "db" | "env" | null;
}

export interface TrafficCredentialSet {
  tabapi: ResolvedCredential;
  serpapi: ResolvedCredential;
  whois: ResolvedCredential;
  seranking: ResolvedCredential;
  trustpilotScraperUrl: ResolvedCredential;
  months: number;
}

function resolve(dbValue: string | null | undefined, envName: string): ResolvedCredential {
  const db = typeof dbValue === "string" && dbValue.trim() ? dbValue.trim() : null;
  if (db) return { value: db, source: "db" };

  const env = process.env[envName];
  const fromEnv = typeof env === "string" && env.trim() ? env.trim() : null;
  if (fromEnv) return { value: fromEnv, source: "env" };

  return { value: null, source: null };
}

export function resolveTrafficCredentials(
  settings: TrafficSettingsInput | null | undefined,
): TrafficCredentialSet {
  return {
    tabapi: resolve(settings?.traffic_tabapi_key, "TABAPI_KEY"),
    serpapi: resolve(settings?.traffic_serpapi_key, "SERPAPI_KEY"),
    whois: resolve(settings?.traffic_whois_api_key, "WHOIS_API_KEY"),
    seranking: resolve(settings?.traffic_seranking_api_key, "SE_RANKING_API_KEY"),
    trustpilotScraperUrl: resolve(settings?.traffic_trustpilot_scraper_url, "TRUSTPILOT_SCRAPER_URL"),
    months: resolveMonths(settings),
  };
}

function resolveMonths(settings: TrafficSettingsInput | null | undefined): number {
  const dbMonths = settings?.traffic_months;
  if (dbMonths != null) return clampTrafficMonths(dbMonths);
  const envMonths = resolveEnvMonths();
  if (envMonths != null) return clampTrafficMonths(envMonths);
  return DEFAULT_TRAFFIC_MONTHS;
}

function resolveEnvMonths(): number | null {
  const raw = process.env.TRAFFIC_MONTHS;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function maskKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return "••••••";
  return `••••••${value.slice(-4)}`;
}

export function missingEnvNames(resolved: TrafficCredentialSet): string[] {
  const missing: string[] = [];
  if (!resolved.tabapi.value) missing.push("TABAPI_KEY");
  if (!resolved.serpapi.value) missing.push("SERPAPI_KEY");
  if (!resolved.whois.value) missing.push("WHOIS_API_KEY");
  if (!resolved.seranking.value) missing.push("SE_RANKING_API_KEY");
  if (!resolved.trustpilotScraperUrl.value) missing.push("TRUSTPILOT_SCRAPER_URL");
  return missing;
}
