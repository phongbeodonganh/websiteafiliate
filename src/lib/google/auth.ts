import { google } from 'googleapis';
import { getGoogleInsightsConfig, getGoogleInsightsStatus, parseServiceAccountJson } from './config';

export async function isGoogleInsightsConfigured(): Promise<boolean> {
  const status = await getGoogleInsightsStatus();
  return status.configured;
}

function parseServiceAccount(raw: string): { client_email: string; private_key: string } {
  const parsed = parseServiceAccountJson(raw);
  if (!parsed || !parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing or invalid (client_email/private_key required).');
  }
  return parsed as { client_email: string; private_key: string };
}

// One JWT client per service-account email so switching credentials in the
// admin settings screen takes effect immediately without a server restart.
let cachedAuth: { email: string; client: InstanceType<typeof google.auth.JWT> } | null = null;

export async function getGoogleAuthClient(): Promise<InstanceType<typeof google.auth.JWT>> {
  const config = await getGoogleInsightsConfig();
  if (!config.serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured (env or Settings).');
  }
  const { client_email, private_key } = parseServiceAccount(config.serviceAccountJson);
  if (cachedAuth && cachedAuth.email === client_email) return cachedAuth.client;

  const client = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });
  cachedAuth = { email: client_email, client };
  return client;
}
