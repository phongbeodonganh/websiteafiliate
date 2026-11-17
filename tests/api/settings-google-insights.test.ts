import { describe, expect, it } from 'vitest';
import { connectToDatabase } from '@/lib/db/mongodb';
import { UserModel, SettingModel } from '@/lib/db/models';
import { hashPassword, signToken } from '@/lib/auth';
import { GET as settingsGetHandler, PUT as settingsPutHandler } from '@/app/api/v1/cms/settings/route';

// Google Insights credentials — admin-editable via Settings > "Tích hợp
// Google". Mirrors tests/api/settings-color-validation.test.ts: seed users via
// UserModel + hashPassword, call route handlers directly with a Request.
//
// Contract (matches gemini_api_key):
// - invalid values rejected with 400 naming the field, DB untouched
// - valid values persist; service-account JSON never echoed raw
// - GET returns only a masked hint (client_email) and only to admins
// - an empty string explicitly clears the stored secret

const SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  client_email: 'insights-sa@test-project.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
});

async function seedUserAndGetToken(role: 'admin' | 'editor') {
  await connectToDatabase();
  const user = await UserModel.create({
    username: `google-insights-${role}-${Math.random().toString(36).slice(2, 8)}`,
    password_hash: await hashPassword('password-123'),
    role,
    status: 'active',
  });
  return signToken({
    userId: String(user._id),
    username: user.username,
    role,
  });
}

function settingsRequest(method: 'GET' | 'PUT', token: string, body?: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/cms/settings', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('PUT /api/v1/cms/settings — Google Insights credential validation', () => {
  it('rejects a non-numeric ga4PropertyId with 400 and leaves the DB unchanged', async () => {
    const token = await seedUserAndGetToken('admin');
    await SettingModel.findOneAndUpdate({}, { $set: { ga4_property_id: '111222333' } }, { upsert: true });

    const res = await settingsPutHandler(settingsRequest('PUT', token, { ga4PropertyId: 'G-ABC123' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.status).toBe('error');
    expect(String(json.message)).toMatch(/GA4/i);
    const after = await SettingModel.findOne({});
    expect(after?.ga4_property_id).toBe('111222333');
  });

  it('rejects a gscSiteUrl without https:// or sc-domain: prefix', async () => {
    const token = await seedUserAndGetToken('admin');
    await SettingModel.findOneAndUpdate({}, { $set: { gsc_site_url: 'https://example.com/' } }, { upsert: true });

    const res = await settingsPutHandler(settingsRequest('PUT', token, { gscSiteUrl: 'javascript:alert(1)' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(String(json.message)).toMatch(/GSC|Search Console/i);
    const after = await SettingModel.findOne({});
    expect(after?.gsc_site_url).toBe('https://example.com/');
  });

  it('rejects a service-account JSON missing client_email/private_key', async () => {
    const token = await seedUserAndGetToken('admin');
    await SettingModel.findOneAndUpdate({}, { $set: { google_service_account_json: SERVICE_ACCOUNT_JSON } }, { upsert: true });

    const res = await settingsPutHandler(
      settingsRequest('PUT', token, { googleServiceAccountJson: '{"type":"service_account"}' })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(String(json.message)).toMatch(/Service Account/i);
    const after = await SettingModel.findOne({});
    expect(after?.google_service_account_json).toBe(SERVICE_ACCOUNT_JSON);
  });

  it('rejects malformed (unparsable) service-account JSON', async () => {
    const token = await seedUserAndGetToken('admin');

    const res = await settingsPutHandler(
      settingsRequest('PUT', token, { googleServiceAccountJson: 'not json at all' })
    );

    expect(res.status).toBe(400);
  });

  it('persists valid credentials and returns masked hint only (never the raw JSON)', async () => {
    const token = await seedUserAndGetToken('admin');

    const putRes = await settingsPutHandler(
      settingsRequest('PUT', token, {
        ga4PropertyId: '123456789',
        gscSiteUrl: 'https://thehavendeals.com/',
        googleServiceAccountJson: SERVICE_ACCOUNT_JSON,
      })
    );
    const putJson = await putRes.json();
    expect(putRes.status).toBe(200);
    expect(putJson.status).toBe('success');
    expect(putJson.data.ga4PropertyId).toBe('123456789');
    expect(putJson.data.gscSiteUrl).toBe('https://thehavendeals.com/');
    expect(putJson.data.serviceAccountConfigured).toBe(true);
    expect(putJson.data.serviceAccountHint).toBe('insights-sa@test-project.iam.gserviceaccount.com');

    // The raw secret must never appear anywhere in the response body.
    expect(JSON.stringify(putJson)).not.toContain('-----BEGIN PRIVATE KEY-----');

    const getRes = await settingsGetHandler(settingsRequest('GET', token));
    const getJson = await getRes.json();
    expect(getJson.status).toBe('success');
    expect(getJson.data.ga4PropertyId).toBe('123456789');
    expect(getJson.data.gscSiteUrl).toBe('https://thehavendeals.com/');
    expect(getJson.data.serviceAccountConfigured).toBe(true);
    expect(getJson.data.serviceAccountHint).toBe('insights-sa@test-project.iam.gserviceaccount.com');
    expect(JSON.stringify(getJson)).not.toContain('private_key');
  });

  it('keeps the stored secret when googleServiceAccountJson is omitted from the payload', async () => {
    const token = await seedUserAndGetToken('admin');
    await SettingModel.findOneAndUpdate(
      {},
      { $set: { google_service_account_json: SERVICE_ACCOUNT_JSON, ga4_property_id: '1' } },
      { upsert: true }
    );

    const res = await settingsPutHandler(settingsRequest('PUT', token, { siteTitle: 'New Title' }));
    expect(res.status).toBe(200);

    const after = await SettingModel.findOne({});
    expect(after?.google_service_account_json).toBe(SERVICE_ACCOUNT_JSON);
    expect(after?.site_title).toBe('New Title');
  });

  it('clears the stored secret when googleServiceAccountJson is an empty string', async () => {
    const token = await seedUserAndGetToken('admin');
    await SettingModel.findOneAndUpdate({}, { $set: { google_service_account_json: SERVICE_ACCOUNT_JSON } }, { upsert: true });

    const res = await settingsPutHandler(settingsRequest('PUT', token, { googleServiceAccountJson: '   ' }));
    expect(res.status).toBe(200);

    const after = await SettingModel.findOne({});
    expect(after?.google_service_account_json).toBe('');
  });

  it('accepts a base64-encoded service-account JSON', async () => {
    const token = await seedUserAndGetToken('admin');
    const encoded = Buffer.from(SERVICE_ACCOUNT_JSON, 'utf8').toString('base64');

    const res = await settingsPutHandler(settingsRequest('PUT', token, { googleServiceAccountJson: encoded }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.serviceAccountHint).toBe('insights-sa@test-project.iam.gserviceaccount.com');
  });
});

describe('GET /api/v1/cms/settings — Google Insights fields are admin-gated', () => {
  it('omits serviceAccountConfigured/serviceAccountHint for non-admin users', async () => {
    const token = await seedUserAndGetToken('editor');
    await SettingModel.findOneAndUpdate({}, { $set: { google_service_account_json: SERVICE_ACCOUNT_JSON } }, { upsert: true });

    const res = await settingsGetHandler(settingsRequest('GET', token));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(json.data.serviceAccountConfigured).toBeUndefined();
    expect(json.data.serviceAccountHint).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('private_key');
  });
});
