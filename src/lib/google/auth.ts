import { google } from 'googleapis';

export function isGoogleInsightsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON &&
    process.env.GA4_PROPERTY_ID &&
    process.env.GSC_SITE_URL
  );
}

function parseServiceAccountJson(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set.');
  }
  // Accept either raw JSON or base64-encoded JSON (base64 avoids env-var newline issues).
  const jsonText = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(jsonText);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email/private_key.');
  }
  return parsed;
}

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;

export function getGoogleAuthClient(): InstanceType<typeof google.auth.JWT> {
  if (cachedAuth) return cachedAuth;
  const { client_email, private_key } = parseServiceAccountJson();
  cachedAuth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });
  return cachedAuth;
}
