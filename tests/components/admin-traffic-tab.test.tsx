/**
 * Phase 06 Plan 02 — Traffic Intelligence admin tab.
 *
 * The repo's vitest suite runs in the `node` environment (no jsdom / DOM render),
 * so the component contracts are pinned with the same source-contract technique
 * as tests/api/admin-edit-user-modal.test.ts (fs read + indexOf), plus direct
 * unit tests of the pure helpers exported by the traffic components.
 *
 * Task 1 — tab wiring + credential settings card (TRF-01):
 *   1. 'traffic' is an admin-only tab id in the admin shell source.
 *   2. A "Traffic Intelligence" NavItem (Globe icon) is wired to navigate.
 *   3. renderContent dispatches /admin?tab=traffic for admins only.
 *   4. A lazy useEffect loads config + domains only on the traffic tab.
 *   5. The missing-TabAPI amber banner copy is present.
 *   6. The settings card PUTs only changed fields and never displays an
 *      unmasked credential (masked •••• values + db/env/missing chips only).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('Task 1 — traffic tab wiring in the admin shell (TRF-01)', () => {
  const source = readSource('src/app/admin/page.tsx');

  it("'traffic' is registered in the ADMIN_ONLY_TABS set", () => {
    const marker = "const ADMIN_ONLY_TABS = new Set([";
    const start = source.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    const end = source.indexOf(']);', start);
    const setBody = source.slice(start, end);
    expect(setBody).toContain("'traffic'");
  });

  it('a Traffic Intelligence NavItem (Globe icon) is wired to navigate({ tab: "traffic" })', () => {
    expect(source.indexOf('id="traffic"')).toBeGreaterThan(-1);
    expect(source.indexOf('label="Traffic Intelligence"')).toBeGreaterThan(-1);
    // The NavItem block for traffic uses the Globe icon and the shared navigate().
    const navIdx = source.indexOf('id="traffic"');
    const navBlock = source.slice(navIdx - 200, navIdx + 260);
    expect(navBlock).toContain('icon={Globe}');
    expect(navBlock).toContain('navigate({ tab: "traffic" })');
    expect(navBlock).toContain('requiredRole="admin"');
  });

  it('the NavItem sits in the admin-only sidebar group (after SEO Insights, before the System label)', () => {
    const insightsNav = source.indexOf('id="insights"');
    const trafficNav = source.indexOf('id="traffic"');
    const systemLabel = source.indexOf('System (Admin)');
    expect(insightsNav).toBeGreaterThan(-1);
    expect(trafficNav).toBeGreaterThan(insightsNav);
    expect(systemLabel).toBeGreaterThan(trafficNav);
  });

  it('renderContent dispatches to renderTrafficView for admins only', () => {
    const branch = source.indexOf("if (activeTab === 'traffic' && currentUser.role === 'admin') return renderTrafficView();");
    expect(branch).toBeGreaterThan(-1);
    // Non-admins hitting ?tab=traffic fall through to the existing D-13
    // access-denied contract keyed on ADMIN_ONLY_TABS.
    expect(source.indexOf('ADMIN_ONLY_TABS.has(activeTab)')).toBeGreaterThan(-1);
  });

  it('a lazy useEffect loads traffic data only when the traffic tab is active for an admin', () => {
    const effect = source.indexOf("if (activeTab === 'traffic' && currentUser?.role === 'admin') {");
    expect(effect).toBeGreaterThan(-1);
    const block = source.slice(effect, effect + 120);
    expect(block).toContain('loadTrafficData()');
    expect(source.indexOf('const loadTrafficData = () => {')).toBeGreaterThan(-1);
  });

  it('loadTrafficData fetches the config and domains routes with the Bearer token', () => {
    const fnStart = source.indexOf('const loadTrafficData = () => {');
    const fnEnd = source.indexOf('};', fnStart);
    const fn = source.slice(fnStart, fnEnd);
    expect(fn).toContain("fetch('/api/v1/cms/traffic/config'");
    expect(fn).toContain("fetch('/api/v1/cms/traffic/domains'");
    expect(fn).toContain("Authorization: `Bearer ${token}`");
  });

  it("renders the missing-TabAPI amber banner with the exact Vietnamese copy", () => {
    expect(
      source.indexOf('Chưa cấu hình TabAPI key — nhập trong phần Cấu hình để sử dụng')
    ).toBeGreaterThan(-1);
  });
});

describe('Task 1 — TrafficSettingsCard contract (TRF-01)', () => {
  const source = readSource('src/components/admin/traffic/TrafficSettingsCard.tsx');

  it('saves via PUT /api/v1/cms/traffic/config', () => {
    expect(source.indexOf("'/api/v1/cms/traffic/config'")).toBeGreaterThan(-1);
    expect(source.indexOf("method: 'PUT'")).toBeGreaterThan(-1);
  });

  it('PUTs only changed fields: empty input is omitted, explicit clear sends an empty string', () => {
    const fnStart = source.indexOf('async function handleSave()');
    const fnEnd = source.indexOf('setSaving(true)', fnStart);
    const fn = source.slice(fnStart, fnEnd);
    // Empty + not-cleared => omitted (no else branch assigns ''), only the
    // explicit clear flag assigns ''.
    expect(fn).toContain('cleared[field.key]');
    expect(fn).toContain("payload[field.key] = ''");
    // months is only included when it actually differs from the saved config.
    expect(fn).toContain('parsedMonths !== config.months');
  });

  it('renders masked values and db/env/missing status chips — never a raw credential', () => {
    expect(source.indexOf('{masked}')).toBeGreaterThan(-1);
    expect(source.indexOf('Đã lưu')).toBeGreaterThan(-1);
    expect(source.indexOf('Từ env')).toBeGreaterThan(-1);
    expect(source.indexOf('Chưa có')).toBeGreaterThan(-1);
    // The card only reads masked/source/months/missing from the config — the
    // payload shape has no unmasked field to render.
    expect(source).not.toContain('config.value');
  });

  it('key inputs are password-typed; the scraper URL is a plain text input', () => {
    expect(source.indexOf("type={field.secret ? 'password' : 'text'}")).toBeGreaterThan(-1);
    expect(source.indexOf("secret: true")).toBeGreaterThan(-1);
    expect(source.indexOf("secret: false")).toBeGreaterThan(-1);
  });

  it('every field has an explicit clear button (mirror gemini UX "Để trống nếu không đổi")', () => {
    expect(source.indexOf('Để trống nếu không đổi')).toBeGreaterThan(-1);
    expect(source.indexOf('aria-label={`Xóa ${field.label} đã lưu`}')).toBeGreaterThan(-1);
  });

  it('offers a 3–12 months select and toasts the Vietnamese success message after save', () => {
    expect(source.indexOf('MONTH_OPTIONS')).toBeGreaterThan(-1);
    expect(source.indexOf('Đã lưu cấu hình traffic')).toBeGreaterThan(-1);
  });

  it('re-fetches/updates config via onSaved after a successful save', () => {
    expect(source.indexOf('onSaved(result.data.data)')).toBeGreaterThan(-1);
  });
});
