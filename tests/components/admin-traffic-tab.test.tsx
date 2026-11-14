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

import {
  derivePanelPhase,
  filterRows,
  formatRelativeTime,
  momTrend,
  sliceMessage,
  sortRows,
  upsertRow,
  type TrafficRow,
} from '../../src/components/admin/traffic/traffic-helpers';

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
      source.indexOf('Chưa cấu hình TabAPI key — nhập trong tab Quản lý cấu hình để sử dụng')
    ).toBeGreaterThan(-1);
  });

  it("splits the view into 'Domains' and 'Quản lý cấu hình' sub-tabs via a segmented control", () => {
    // Sub-tab state drives the two branches inside renderTrafficView.
    expect(source.indexOf("useState<'domains' | 'config'>('domains')")).toBeGreaterThan(-1);
    expect(source.indexOf("label: 'Quản lý cấu hình'")).toBeGreaterThan(-1);
    expect(source.indexOf("label: 'Domains'")).toBeGreaterThan(-1);
    // The switcher is an accessible tablist.
    expect(source.indexOf('role="tablist"')).toBeGreaterThan(-1);
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

describe('Task 2 — traffic list helpers (TRF-02, TRF-04)', () => {
  const row = (
    id: string,
    domain: string,
    overview: Record<string, unknown> | null,
    lastFetchedAt: string | null = null
  ): TrafficRow => ({
    id,
    domain,
    lastFetchedAt,
    lastError: null,
    report:
      overview === null
        ? null
        : ({
            domain,
            title: null,
            description: null,
            overview: overview as never,
            monthly_visits: [],
            traffic_sources: {},
            top_keywords: [],
            top_regions: [],
            ai_traffic: null,
          } as never),
  });

  it('filterRows matches by domain substring, case-insensitively; empty query is a no-op', () => {
    const rows = [row('1', 'example.com', null), row('2', 'vercel.com', null), row('3', 'blog.example.org', null)];
    expect(filterRows(rows, 'EX')).toHaveLength(2);
    expect(filterRows(rows, 'vercel')).toEqual([rows[1]]);
    expect(filterRows(rows, '  ')).toHaveLength(3);
    expect(filterRows(rows, 'nope')).toHaveLength(0);
  });

  it('sortRows orders numeric/date columns asc/desc and always sinks null metrics last', () => {
    const rows = [
      row('a', 'a.com', { visits: 100 }),
      row('b', 'b.com', { visits: 500 }),
      row('c', 'c.com', null),
    ];
    const asc = sortRows(rows, 'visits', 'asc');
    expect(asc.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    const desc = sortRows(rows, 'visits', 'desc');
    expect(desc.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    // Date sorting parses lastFetchedAt.
    const dated = [
      row('old', 'old.com', null, '2026-01-01T00:00:00Z'),
      row('new', 'new.com', null, '2026-06-01T00:00:00Z'),
    ];
    expect(sortRows(dated, 'updated', 'desc')[0].id).toBe('new');
    expect(sortRows(dated, 'updated', 'asc')[0].id).toBe('old');
  });

  it('momTrend computes MoM from the last two monthly points and returns null otherwise', () => {
    expect(momTrend([{ month: '2026-01', visits: 100 }, { month: '2026-02', visits: 125 }])).toBeCloseTo(0.25);
    expect(momTrend([{ month: '2026-01', visits: 100 }, { month: '2026-02', visits: 50 }])).toBeCloseTo(-0.5);
    expect(momTrend([{ month: '2026-01', visits: 100 }])).toBeNull();
    expect(momTrend([])).toBeNull();
    expect(momTrend(null)).toBeNull();
    expect(momTrend([{ month: '2026-01', visits: 0 }, { month: '2026-02', visits: 10 }])).toBeNull();
  });

  it('formatRelativeTime renders Vietnamese relative labels deterministically', () => {
    const now = Date.parse('2026-06-15T12:00:00Z');
    expect(formatRelativeTime('2026-06-15T11:59:40Z', now)).toBe('vừa xong');
    expect(formatRelativeTime('2026-06-15T11:45:00Z', now)).toBe('15 phút trước');
    expect(formatRelativeTime('2026-06-15T09:30:00Z', now)).toBe('2 giờ trước');
    expect(formatRelativeTime('2026-06-13T12:00:00Z', now)).toBe('2 ngày trước');
    expect(formatRelativeTime(null, now)).toBe('—');
    expect(formatRelativeTime('not-a-date', now)).toBe('—');
  });

  it('upsertRow replaces by id or domain (Add & run never duplicates) and prepends new rows', () => {
    const existing = [row('1', 'example.com', null)];
    const updated = upsertRow(existing, row('1', 'example.com', { visits: 1 }));
    expect(updated).toHaveLength(1);
    expect((updated[0].report as { overview: { visits: number } }).overview.visits).toBe(1);
    // Same domain, different id (server upsert) still replaces.
    const byDomain = upsertRow(existing, row('999', 'example.com', null));
    expect(byDomain).toHaveLength(1);
    const added = upsertRow(existing, row('2', 'vercel.com', null));
    expect(added).toHaveLength(2);
    expect(added[0].domain).toBe('vercel.com');
  });

  it('sliceMessage surfaces the Vietnamese slice error and null when clean', () => {
    expect(sliceMessage({ error: { message: 'Chưa cấu hình WHOIS_API_KEY trên máy chủ.' } })).toBe(
      'Chưa cấu hình WHOIS_API_KEY trên máy chủ.'
    );
    expect(sliceMessage({ error: null })).toBeNull();
    expect(sliceMessage(null)).toBeNull();
    expect(sliceMessage({ error: { message: '' } })).toBeNull();
  });

  it('derivePanelPhase drives all panel states without auto-fetching', () => {
    expect(derivePanelPhase({ expanded: false, loading: false, errorMessage: null, missingKey: false, hasData: false })).toBe('collapsed');
    expect(derivePanelPhase({ expanded: true, loading: true, errorMessage: null, missingKey: false, hasData: false })).toBe('loading');
    expect(derivePanelPhase({ expanded: true, loading: false, errorMessage: 'Lỗi', missingKey: false, hasData: false })).toBe('error');
    expect(derivePanelPhase({ expanded: true, loading: false, errorMessage: null, missingKey: true, hasData: false })).toBe('missing');
    expect(derivePanelPhase({ expanded: true, loading: false, errorMessage: null, missingKey: false, hasData: true })).toBe('ready');
    expect(derivePanelPhase({ expanded: true, loading: false, errorMessage: null, missingKey: false, hasData: false })).toBe('empty');
    // Error outranks missing-key once a real response arrived.
    expect(derivePanelPhase({ expanded: true, loading: false, errorMessage: 'Lỗi', missingKey: true, hasData: false })).toBe('error');
  });
});

describe('Task 2 — TrafficDomainsTable contract (TRF-02, TRF-04)', () => {
  const source = readSource('src/components/admin/traffic/TrafficDomainsTable.tsx');

  it('renders all 10 table columns with Vietnamese headers', () => {
    for (const header of [
      'Domain',
      'Lượt truy cập/tháng',
      'Hạng toàn cầu',
      'Hạng quốc gia',
      'Bounce rate',
      'Trang/phiên',
      'Xu hướng',
      'Cập nhật',
      'Hành động',
    ]) {
      expect(source.indexOf(header)).toBeGreaterThan(-1);
    }
    // The Top quốc gia cell renders code + share from the first region.
    expect(source.indexOf('top_regions?.[0]')).toBeGreaterThan(-1);
  });

  it('numbers are vi-VN formatted and null metrics render an em dash', () => {
    expect(source.indexOf('formatCompactNumber')).toBeGreaterThan(-1);
    expect(source.indexOf('formatPercent')).toBeGreaterThan(-1);
    expect(source.match(/'—'/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('search filters client-side and column sort toggles asc/desc', () => {
    expect(source.indexOf('filterRows(rows, searchQuery)')).toBeGreaterThan(-1);
    expect(source.indexOf('sortRows(filterRows(rows, searchQuery), sortKey, sortDir)')).toBeGreaterThan(-1);
    expect(source.indexOf('function toggleSort(key: TrafficSortKey)')).toBeGreaterThan(-1);
    expect(source.indexOf("setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))")).toBeGreaterThan(-1);
    expect(source.indexOf('aria-sort=')).toBeGreaterThan(-1);
  });

  it('Add & run POSTs the domain and surfaces the route Vietnamese error inline + toast on failure', () => {
    const fnStart = source.indexOf('async function handleAdd');
    const fn = source.slice(fnStart, source.indexOf('setAdding(false)', fnStart));
    expect(fn).toContain("trafficFetch<AddRunResponse>('/api/v1/cms/traffic/domains'");
    expect(fn).toContain("method: 'POST'");
    expect(fn).toContain('setAddError(message)');
    expect(fn).toContain("onToast('success', 'Đã thêm domain')");
    // The submit button shows a spinner while running and is disabled.
    expect(source.indexOf('adding ? <Loader2 size={14} className="animate-spin" />')).toBeGreaterThan(-1);
    expect(source.indexOf('disabled={adding || !addValue.trim()}')).toBeGreaterThan(-1);
    // Inline alert is a role="alert" region.
    expect(source.indexOf('role="alert"')).toBeGreaterThan(-1);
  });

  it('refresh POSTs the row route with a row-level spinner; delete requires confirm then DELETEs', () => {
    expect(source.indexOf('/refresh`,')).toBeGreaterThan(-1);
    expect(source.indexOf('refreshingId === row.id ? <Loader2 size={15} className="animate-spin" />')).toBeGreaterThan(-1);
    expect(source.indexOf("dialog.confirm('Bỏ theo dõi domain này?')")).toBeGreaterThan(-1);
    expect(source.indexOf("method: 'DELETE'")).toBeGreaterThan(-1);
    expect(source.indexOf('onDeleted(row.id)')).toBeGreaterThan(-1);
  });

  it('empty and loading states exist; actions reveal on row hover', () => {
    expect(source.indexOf('Chưa theo dõi domain nào')).toBeGreaterThan(-1);
    expect(source.indexOf('SkeletonRow')).toBeGreaterThan(-1);
    expect(source.indexOf('group-hover:opacity-100')).toBeGreaterThan(-1);
  });

  it('the settings card renders in the Quản lý cấu hình branch, the table in the Domains branch', () => {
    const page = readSource('src/app/admin/page.tsx');
    // The config branch (ternary) is listed before the domains branch, so the
    // card appears earlier in the source than the table.
    const card = page.indexOf('<TrafficSettingsCard');
    const table = page.indexOf('<TrafficDomainsTable');
    expect(card).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(card);
    // The banner (Domains branch) references the config sub-tab by name.
    const banner = page.indexOf('Chưa cấu hình TabAPI key — nhập trong tab Quản lý cấu hình để sử dụng');
    expect(banner).toBeGreaterThan(-1);
    expect(banner).toBeGreaterThan(card);
  });
});

describe('Task 3 — TrafficDetailModal core report contract (TRF-05)', () => {
  const source = readSource('src/components/admin/traffic/TrafficDetailModal.tsx');

  it('opens from the table row and loads the stored report from GET /domains/[id] (no refresh on open)', () => {
    const page = readSource('src/app/admin/page.tsx');
    expect(page.indexOf('<TrafficDetailModal')).toBeGreaterThan(-1);
    expect(source.indexOf('`/api/v1/cms/traffic/domains/${row.id}`')).toBeGreaterThan(-1);
    // No refresh call on mount — only the explicit Làm mới handler POSTs.
    const refreshIdx = source.indexOf('/refresh`');
    const loadIdx = source.indexOf('const loadStored');
    expect(refreshIdx).toBeGreaterThan(loadIdx);
  });

  it('renders the 6 core metric cards with Vietnamese labels and em-dash nulls', () => {
    for (const label of [
      'Lượt truy cập/tháng',
      'Hạng toàn cầu',
      'Hạng quốc gia',
      'Bounce rate',
      'Trang/phiên',
      'Thời gian TB/phiên',
    ]) {
      expect(source.indexOf(label)).toBeGreaterThan(-1);
    }
    expect(source.match(/'—'/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it('renders the 5 remaining core sections with Vietnamese titles', () => {
    for (const section of ['Lịch sử theo tháng', 'Nguồn traffic', 'Top quốc gia', 'Từ khóa hàng đầu', 'AI referrals']) {
      expect(source.indexOf(section)).toBeGreaterThan(-1);
    }
    // Monthly history computes MoM client-side.
    expect(source.indexOf('function momChange')).toBeGreaterThan(-1);
    // Sources cover all 13 channels (SOURCE_LABELS length).
    expect(source.match(/\['\w+', '[^']+'\]/g)?.length ?? 0).toBe(13);
  });

  it('the header shows domain + report month + "Dữ liệu ước tính" badge and a working Làm mới button', () => {
    expect(source.indexOf('Dữ liệu ước tính')).toBeGreaterThan(-1);
    expect(source.indexOf('formatMonth(overview?.month ?? null)')).toBeGreaterThan(-1);
    expect(source.indexOf('Làm mới')).toBeGreaterThan(-1);
    const fnStart = source.indexOf('async function handleRefresh');
    const fn = source.slice(fnStart, fnStart + 700);
    expect(fn).toContain('/refresh`');
    expect(fn).toContain("onToast('success', 'Đã làm mới dữ liệu domain')");
    expect(fn).toContain('onRefreshed(');
  });

  it('modal is accessible: dialog role, aria-modal, labelled, ESC + backdrop close', () => {
    expect(source.indexOf('role="dialog"')).toBeGreaterThan(-1);
    expect(source.indexOf('aria-modal="true"')).toBeGreaterThan(-1);
    expect(source.indexOf('aria-labelledby="traffic-detail-title"')).toBeGreaterThan(-1);
    expect(source.indexOf("event.key === 'Escape'")).toBeGreaterThan(-1);
    expect(source.indexOf('onClick={onClose}')).toBeGreaterThan(-1);
  });

  it('never renders raw snake_case labels: display names are Vietnamese', () => {
    // The section titles must be Vietnamese — the snake_case field names appear
    // only inside typed source lookups, never as visible header strings.
    const visibleSnakes = ['monthly_visits', 'traffic_sources', 'top_keywords', 'top_regions', 'ai_traffic'];
    for (const field of visibleSnakes) {
      // Allowed only in typed access like `report?.monthly_visits` — never as a
      // quoted label or title string.
      expect(source).not.toMatch(new RegExp(`["'>]${field}["'<]`));
    }
  });

  it('body scrolls with the admin custom-scrollbar and stacks responsively', () => {
    expect(source.indexOf('custom-scrollbar')).toBeGreaterThan(-1);
    expect(source.indexOf('xl:grid-cols-2')).toBeGreaterThan(-1);
    expect(source.indexOf('grid-cols-2 md:grid-cols-3 xl:grid-cols-6')).toBeGreaterThan(-1);
  });
});

describe('Task 4 — five click-to-load extended panels (TRF-05)', () => {
  const PANELS: Array<[string, string, string]> = [
    ['WhoisPanel', 'src/components/admin/traffic/panels/WhoisPanel.tsx', 'WHOIS_API_KEY'],
    ['TrustpilotPanel', 'src/components/admin/traffic/panels/TrustpilotPanel.tsx', 'TRUSTPILOT_SCRAPER_URL'],
    ['SerankingPanel', 'src/components/admin/traffic/panels/SerankingPanel.tsx', 'SE_RANKING_API_KEY'],
    ['AdsPanel', 'src/components/admin/traffic/panels/AdsPanel.tsx', 'SERPAPI_KEY'],
    ['ReferringSitesPanel', 'src/components/admin/traffic/panels/ReferringSitesPanel.tsx', 'TABAPI_KEY'],
  ];

  const readPanel = (file: string) => readSource(file);

  it("the modal hosts a 'Dữ liệu mở rộng' section with all 5 panels and maps each to its env key", () => {
    const source = readSource('src/components/admin/traffic/TrafficDetailModal.tsx');
    expect(source.indexOf('Dữ liệu mở rộng')).toBeGreaterThan(-1);
    for (const [name] of PANELS) {
      expect(source.indexOf(`<${name}`)).toBeGreaterThan(-1);
    }
    for (const envKey of PANELS.map(([, , key]) => key)) {
      expect(source.indexOf(`'${envKey}'`)).toBeGreaterThan(-1);
    }
  });

  it('panels load only on user click: every panel fetches from a toggle/click handler, never from an effect', () => {
    for (const [name, file] of PANELS) {
      const source = readPanel(file);
      // No useEffect at all in the panel body (click-to-load contract).
      expect(source.indexOf('useEffect'), `${name} must not use useEffect`).toBe(-1);
      // The fetch is triggered from a toggle/click handler.
      expect(
        /(function toggle|async function load|onClick)/.test(source),
        `${name} must load from a user click`
      ).toBe(true);
    }
  });

  it('every soft-slice panel checks .error before rendering success data; the hard-error ads route guards result.ok', () => {
    // Soft-slice HTTP-200 { data, error } convention: whois, trustpilot,
    // referring-sites, seranking (both sub-loads).
    for (const [name, file] of PANELS.filter(([name]) => name !== 'AdsPanel')) {
      const source = readPanel(file);
      expect(source.indexOf('sliceMessage('), `${name} must guard the slice .error`).toBeGreaterThan(-1);
      // The guard happens BEFORE any data render: setErrorMessage on error path.
      expect(source.indexOf('setErrorMessage(error)'), `${name} routes slice errors to the error state`).toBeGreaterThan(-1);
    }
    // Hard-error convention (non-2xx envelope): /ads + /ads/detail via trafficFetch.
    const ads = readPanel('src/components/admin/traffic/panels/AdsPanel.tsx');
    expect(ads.indexOf('if (!result.ok)')).toBeGreaterThan(-1);
    expect(ads.indexOf('setErrorMessage(result.message)')).toBeGreaterThan(-1);
    expect(ads).not.toContain('sliceMessage');
  });

  it('every panel renders the Vietnamese missing-key state with its action disabled', () => {
    for (const [name, file] of PANELS) {
      const source = readPanel(file);
      expect(source.indexOf('missingKey'), `${name} consumes missingKey`).toBeGreaterThan(-1);
      expect(source.indexOf('PanelMissingKey'), `${name} renders PanelMissingKey`).toBeGreaterThan(-1);
    }
  });

  it('each panel has loading, error (role=alert retry) and empty states', () => {
    for (const [name, file] of PANELS) {
      const source = readPanel(file);
      expect(source.indexOf('PanelLoading'), `${name} has a loading state`).toBeGreaterThan(-1);
      expect(source.indexOf('PanelError'), `${name} has an error state`).toBeGreaterThan(-1);
      expect(source.indexOf('PanelEmpty'), `${name} has an empty state`).toBeGreaterThan(-1);
    }
    // Shared shell renders the alert + Vietnamese labels once, pinned here.
    const shell = readSource('src/components/admin/traffic/panels/panel-shell.tsx');
    expect(shell.indexOf('role="alert"')).toBeGreaterThan(-1);
    expect(shell.indexOf('Thử lại')).toBeGreaterThan(-1);
    expect(shell.indexOf('Chưa cấu hình key — vào tab Quản lý cấu hình')).toBeGreaterThan(-1);
  });

  it('WhoisPanel renders registrar/created/expires/age/privacy cards + nameservers and has a history sub-load', () => {
    const source = readPanel('src/components/admin/traffic/panels/WhoisPanel.tsx');
    for (const label of ['Tuổi domain', 'Nhà đăng ký', 'Ngày tạo', 'Ngày hết hạn', 'Quyền riêng tư', 'Name server', 'Trạng thái']) {
      expect(source.indexOf(label)).toBeGreaterThan(-1);
    }
    expect(source.indexOf('/whois/history?domain=')).toBeGreaterThan(-1);
    expect(source.indexOf('Lịch sử thay đổi')).toBeGreaterThan(-1);
  });

  it('TrustpilotPanel renders name, trust score, stars, review count, categories and rating buckets', () => {
    const source = readPanel('src/components/admin/traffic/panels/TrustpilotPanel.tsx');
    for (const marker of ['business.name', 'trust_score', 'review_count', 'categories', 'RatingDistribution']) {
      expect(source.indexOf(marker)).toBeGreaterThan(-1);
    }
  });

  it('AdsPanel paginates via next_page_token ("Tải thêm") and expands creatives via /ads/detail', () => {
    const source = readPanel('src/components/admin/traffic/panels/AdsPanel.tsx');
    expect(source.indexOf('next_page_token')).toBeGreaterThan(-1);
    expect(source.indexOf('Tải thêm creative')).toBeGreaterThan(-1);
    expect(source.indexOf('/api/v1/cms/traffic/ads/detail?advertiser_id=')).toBeGreaterThan(-1);
    expect(source.indexOf('page_token')).toBeGreaterThan(-1);
    // MetricCards: advertisers, creatives, active, longest-running.
    for (const label of ['Nhà quảng cáo', 'Creative đã tải', 'Đang chạy', 'Chạy lâu nhất']) {
      expect(source.indexOf(label)).toBeGreaterThan(-1);
    }
    expect(source.indexOf('Theo nhà quảng cáo')).toBeGreaterThan(-1);
  });

  it('ReferringSitesPanel shows DR/backlinks/referring domains/dofollow + top backlinks + the 5-credit disclosure', () => {
    const source = readPanel('src/components/admin/traffic/panels/ReferringSitesPanel.tsx');
    for (const label of ['Domain Rating', 'Backlinks', 'Tên miền giới thiệu', 'Dofollow backlink', 'Top backlink']) {
      expect(source.indexOf(label)).toBeGreaterThan(-1);
    }
    expect(source.indexOf('tốn 5 credit TabAPI')).toBeGreaterThan(-1);
    expect(source.indexOf('lưu cache 24 giờ')).toBeGreaterThan(-1);
  });

  it('SerankingPanel exposes two separate load buttons (ads + competitors) with slice guards', () => {
    const source = readPanel('src/components/admin/traffic/panels/SerankingPanel.tsx');
    expect(source.indexOf('seranking/ads?domain=')).toBeGreaterThan(-1);
    expect(source.indexOf('seranking/competitors?domain=')).toBeGreaterThan(-1);
    expect(source.indexOf('Tải mẫu quảng cáo')).toBeGreaterThan(-1);
    expect(source.indexOf('Tải đối thủ quảng cáo')).toBeGreaterThan(-1);
  });
});
