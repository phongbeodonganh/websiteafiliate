'use client';

// Danh sách domain theo dõi (TRF-02, TRF-04) — bảng sàng lọc affiliate:
// mỗi cột trả lời "domain nào đáng mở ra xem tiếp" trong vài giây.
//
// Nguyên tắc: KHÔNG gọi API nào để dựng bảng — mọi số liệu lấy từ report đã
// lưu (TabAPI), kết quả Ads/Backlink người dùng đã tải trong phiên (localStorage
// qua module-loads), còn cột affiliate chỉ là schema chờ Phần B.
//
// Cấu trúc cột định nghĩa MỘT LẦN trong COLUMNS và dùng chung cho thead/tbody/
// CSV — header và body không thể lệch nhau từng cột (lỗi cũ của bảng).

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { dialog } from '@/lib/dialog';
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  formatPercentLocale,
  formatVisitsCompact,
} from '@/lib/traffic/format';
import {
  buildCsv,
  computePreliminaryScore,
  computeTrafficMix,
  FLAT_TREND_EPSILON,
  formatAffiliateCell,
  getMarketShare,
  isEmptyTrafficReport,
  parseDomainList,
  scoreMethodology,
  type TrafficMix,
  type TrafficMixKey,
} from '@/lib/traffic/table-insights';
import type { MonthlyVisit, TrafficResponse } from '@/types/traffic';
import {
  filterRows,
  formatRelativeTime,
  momTrend,
  sortRows,
  trafficFetch,
  WORK_STATUSES,
  WORK_STATUS_LABELS,
  type SortDir,
  type TrafficRow,
  type TrafficSortKey,
  type WorkStatus,
} from './traffic-helpers';
import { getModuleLoads, type ModuleLoadRecord, type ScreenModule } from './module-loads';

interface TrafficDomainsTableProps {
  rows: TrafficRow[];
  loading: boolean;
  onAdded: (row: TrafficRow) => void;
  onRefreshed: (row: TrafficRow) => void;
  onDeleted: (id: string) => void;
  onRowUpdated: (row: TrafficRow) => void;
  onOpenDetail: (row: TrafficRow) => void;
  onToast: (type: 'success' | 'error', text: string) => void;
}

interface AddRunResponse {
  status: string;
  data: {
    id: string;
    domain: string;
    report: TrafficRow['report'];
    lastFetchedAt: string | null;
  };
}

interface PatchWorkResponse {
  status: string;
  data: {
    id: string;
    domain: string;
    workStatus: WorkStatus;
    workNote: string;
  };
}

// ---------------------------------------------------------------------------
// Cột — một nguồn duy nhất cho thead + tbody + CSV (chống lệch header/body)
// ---------------------------------------------------------------------------

type ColumnKey =
  | 'domain'
  | 'visits'
  | 'global_rank'
  | 'country_rank'
  | 'trend'
  | 'market_share'
  | 'mix'
  | 'bounce_rate'
  | 'pages_per_visit'
  | 'external_ads'
  | 'affiliate'
  | 'score'
  | 'updated'
  | 'actions';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  optional?: boolean;
  sortable?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'domain', label: 'Domain', sortable: true },
  { key: 'visits', label: 'Lượt truy cập/tháng', sortable: true },
  { key: 'global_rank', label: 'Hạng toàn cầu', optional: true, sortable: true },
  { key: 'country_rank', label: 'Hạng quốc gia', optional: true, sortable: true },
  { key: 'trend', label: 'Xu hướng', sortable: true },
  { key: 'market_share', label: 'Thị trường chính', sortable: true },
  { key: 'mix', label: 'Cơ cấu traffic' },
  { key: 'bounce_rate', label: 'Bounce rate', optional: true, sortable: true },
  { key: 'pages_per_visit', label: 'Trang/phiên', optional: true, sortable: true },
  { key: 'external_ads', label: 'Đối thủ quảng cáo', sortable: true },
  { key: 'affiliate', label: 'Chương trình affiliate' },
  { key: 'score', label: 'Điểm sơ bộ', sortable: true },
  { key: 'updated', label: 'Cập nhật', sortable: true },
  { key: 'actions', label: 'Hành động' },
];

const OPTIONAL_COLUMN_KEYS: ColumnKey[] = COLUMNS.filter((column) => column.optional).map((column) => column.key);

const COLUMNS_STORAGE_KEY = 'traffic_table_columns_v1';

const WORK_STATUS_BADGE: Record<WorkStatus, string> = {
  chua_xet: 'border-slate-700 bg-slate-950/70 text-slate-400',
  dang_xet: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
  chon: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  loai: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
};

const MODULE_DOT_META: Array<{ key: ScreenModule; label: string; color: string }> = [
  { key: 'traffic', label: 'Traffic', color: 'bg-sky-400' },
  { key: 'backlink', label: 'Backlink', color: 'bg-violet-400' },
  { key: 'ads', label: 'Ads', color: 'bg-amber-400' },
  { key: 'affiliate', label: 'Affiliate', color: 'bg-emerald-400' },
];

const MIX_SEGMENTS: Array<{ key: TrafficMixKey; label: string; color: string }> = [
  { key: 'direct', label: 'Trực tiếp', color: 'bg-sky-500' },
  { key: 'organic', label: 'Tự nhiên', color: 'bg-emerald-500' },
  { key: 'paid', label: 'Trả phí', color: 'bg-amber-500' },
  { key: 'other', label: 'Khác', color: 'bg-slate-600' },
];

// ---------------------------------------------------------------------------
// Bộ lọc nhanh (A8)
// ---------------------------------------------------------------------------

interface QuickFilters {
  minVisits: string;
  minMarket: string;
  maxDirect: string;
  status: 'all' | WorkStatus;
}

const EMPTY_FILTERS: QuickFilters = { minVisits: '', minMarket: '', maxDirect: '', status: 'all' };

function filtersActive(filters: QuickFilters): boolean {
  return filters.minVisits !== '' || filters.minMarket !== '' || filters.maxDirect !== '' || filters.status !== 'all';
}

// ---------------------------------------------------------------------------
// Ô dữ liệu dùng chung cho render + CSV
// ---------------------------------------------------------------------------

function marketText(row: TrafficRow): string {
  const share = getMarketShare(row.report);
  if (share == null) return '—';
  return `US · ${formatPercentLocale(share)}`;
}

function mixTooltip(mix: TrafficMix): string {
  return MIX_SEGMENTS.map((segment) => `${segment.label} ${formatPercentLocale(mix[segment.key])}`).join(' · ');
}

function trendValue(monthly: MonthlyVisit[] | null | undefined): number | null {
  return momTrend(monthly);
}

function trendPctText(trend: number): string {
  if (Math.abs(trend) < FLAT_TREND_EPSILON) return '±0%';
  return `${trend >= 0 ? '+' : ''}${(trend * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

// ---------------------------------------------------------------------------
// Các ô hiển thị
// ---------------------------------------------------------------------------

function NoDataCell() {
  return <span className="text-slate-600 italic">Không có dữ liệu</span>;
}

function DomainFavicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-800 text-[9px] font-bold text-slate-400">
        {domain.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- favicon từ domain ngoài, không qua tối ưu của Next
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      alt=""
      width={16}
      height={16}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-4 w-4 shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}

function ModuleDots({
  trafficLoaded,
  trafficLoadedAt,
  loads,
}: {
  trafficLoaded: boolean;
  trafficLoadedAt: string | null;
  loads: Partial<Record<ScreenModule, ModuleLoadRecord>>;
}) {
  return (
    <div className="mt-1 flex items-center gap-1" aria-hidden="true">
      {MODULE_DOT_META.map((meta) => {
        const lit = meta.key === 'traffic' ? trafficLoaded : loads[meta.key] != null;
        const time =
          meta.key === 'traffic'
            ? trafficLoaded && trafficLoadedAt
              ? Date.parse(trafficLoadedAt)
              : null
            : loads[meta.key]?.loadedAt ?? null;
        return (
          <span
            key={meta.key}
            title={
              lit && time && Number.isFinite(time)
                ? `${meta.label}: đã tải ${formatDateTime(new Date(time).toISOString())}`
                : `${meta.label}: ${meta.key === 'affiliate' ? 'chờ Phần B' : 'chưa tải'}`
            }
            className={`h-1.5 w-1.5 rounded-full ${lit ? meta.color : 'bg-slate-700'}`}
          />
        );
      })}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 44 / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(1)},${(15 - ((value - min) / span) * 13).toFixed(1)}`)
    .join(' ');
  return (
    <svg width="44" height="16" viewBox="0 0 44 16" className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function TrendCell({ monthly }: { monthly: MonthlyVisit[] | null | undefined }) {
  const trend = trendValue(monthly);
  if (trend == null) return <span className="text-slate-600">—</span>;
  const flat = Math.abs(trend) < FLAT_TREND_EPSILON;
  const color = flat ? 'text-slate-400' : trend >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const arrow = flat ? '→' : trend >= 0 ? '▲' : '▼';
  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <Sparkline values={(monthly ?? []).slice(-3).map((point) => point.visits)} />
      <span className="font-semibold whitespace-nowrap">
        {arrow} {trendPctText(trend)}
      </span>
    </span>
  );
}

function MixBar({ mix }: { mix: TrafficMix }) {
  return (
    <div
      className="flex h-2.5 w-full min-w-[90px] max-w-[150px] overflow-hidden rounded-full bg-slate-800"
      title={mixTooltip(mix)}
      role="img"
      aria-label={mixTooltip(mix)}
    >
      {MIX_SEGMENTS.map((segment) => {
        const value = mix[segment.key];
        if (value <= 0) return null;
        return <div key={segment.key} className={segment.color} style={{ width: `${value * 100}%` }} />;
      })}
    </div>
  );
}

/** Chú thích cách tính Điểm sơ bộ — hover icon ⓘ ở tiêu đề cột. */
function ScoreMethodologyHint() {
  return (
    <span className="relative inline-flex items-center group/method" title="Cách tính Điểm sơ bộ">
      <Info size={12} className="text-slate-500 group-hover/method:text-amber-400" />
      <span className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-[11px] font-normal normal-case tracking-normal leading-relaxed text-slate-300 shadow-xl group-hover/method:block">
        <span className="mb-1 block font-bold text-white">Cách tính Điểm sơ bộ (0–100)</span>
        {scoreMethodology().map((line) => (
          <span key={line} className="block">
            • {line}
          </span>
        ))}
      </span>
    </span>
  );
}

function ScoreCell({ report }: { report: TrafficResponse | null }) {  const result = computePreliminaryScore(report);
  if (result.score == null) return <span className="text-slate-600">—</span>;
  const tooltip = [
    'Điểm sơ bộ (heuristic 0–100, không phải số liệu đo được):',
    ...result.components.map((component) =>
      component.available
        ? `• ${component.label}: ${Math.round(component.earned)}/${component.maxPoints} điểm — ${component.detail}`
        : `• ${component.label}: thiếu dữ liệu (${component.detail})`
    ),
    result.insufficient
      ? 'Chưa đủ dữ liệu: thiếu quá 1 thành phần — điểm đã chuẩn hóa về thang 100.'
      : 'Chuẩn hóa trên các thành phần có dữ liệu.',
  ].join('\n');
  return (
    <span className={result.insufficient ? 'font-semibold text-amber-300' : 'font-semibold text-white'} title={tooltip}>
      {result.score}
      {result.insufficient && <span className="ml-0.5 text-amber-400">*</span>}
    </span>
  );
}

function WorkStatusControl({
  row,
  disabled,
  onStatusChange,
  onNoteChange,
}: {
  row: TrafficRow;
  disabled: boolean;
  onStatusChange: (status: WorkStatus) => void;
  onNoteChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const status = row.workStatus ?? 'chua_xet';
  return (
    <div className="flex items-center gap-1">
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          title={`Trạng thái xét duyệt — Chưa xét: mặc định · Đang xét: đang phân tích · Chọn: giữ lại · Loại: loại bỏ. Bấm để đổi.${row.workNote ? ` Ghi chú: ${row.workNote}` : ''}`}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors disabled:opacity-50 cursor-pointer ${WORK_STATUS_BADGE[status]}`}
        >
          {WORK_STATUS_LABELS[status]}
          <ChevronDown size={10} />
        </button>
        {open && (
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
            {WORK_STATUSES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onStatusChange(candidate);
                }}
                className={`block w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 cursor-pointer ${
                  candidate === status ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {WORK_STATUS_LABELS[candidate]}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onNoteChange}
        disabled={disabled}
        title={row.workNote ? `Ghi chú: ${row.workNote}` : 'Thêm ghi chú'}
        aria-label={`Ghi chú cho ${row.domain}`}
        className="p-1 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-40 transition-colors cursor-pointer"
      >
        <StickyNote size={12} className={row.workNote ? 'text-amber-400' : ''} />
      </button>
    </div>
  );
}

function SkeletonRow({ count }: { count: number }) {
  return (
    <tr className="border-b border-slate-800/50">
      {Array.from({ length: count }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-3.5 rounded bg-slate-800/70 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function readStoredOptionalColumns(): Set<ColumnKey> {
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as ColumnKey[];
    return new Set(parsed.filter((key) => OPTIONAL_COLUMN_KEYS.includes(key)));
  } catch {
    // Private-mode storage failure — dùng mặc định (ẩn hết cột tùy chọn).
    return new Set();
  }
}

// ---------------------------------------------------------------------------

export default function TrafficDomainsTable({
  rows,
  loading,
  onAdded,
  onRefreshed,
  onDeleted,
  onRowUpdated,
  onOpenDetail,
  onToast,
}: TrafficDomainsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TrafficSortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<QuickFilters>(EMPTY_FILTERS);
  const [showColumns, setShowColumns] = useState(false);
  // Bảng chỉ render sau khi admin đăng nhập (client-side), nên đọc trực tiếp
  // localStorage ở initializer là an toàn — subtree này không bao giờ SSR.
  const [visibleOptional, setVisibleOptional] = useState<Set<ColumnKey>>(readStoredOptionalColumns);

  const activeColumns = useMemo(
    () => COLUMNS.filter((column) => !column.optional || visibleOptional.has(column.key)),
    [visibleOptional]
  );

  // Dữ liệu module (Ads/Backlink) — đọc localStorage khi render (client-only).
  const { externalAds, moduleLoads } = useMemo(() => {
    const ads: Record<string, number> = {};
    const loads: Record<string, Partial<Record<ScreenModule, ModuleLoadRecord>>> = {};
    for (const row of rows) {
      const rowLoads = getModuleLoads(row.domain);
      loads[row.domain] = rowLoads;
      const externalActive = rowLoads.ads?.externalActive;
      if (typeof externalActive === 'number') ads[row.domain] = externalActive;
    }
    return { externalAds: ads, moduleLoads: loads };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const base = filterRows(rows, searchQuery);
    if (!filtersActive(filters)) return base;
    const minVisits = Number(filters.minVisits) || 0;
    const minMarket = Number(filters.minMarket) || 0;
    const maxDirect = filters.maxDirect === '' ? 100 : Number(filters.maxDirect);
    return base.filter((row) => {
      if (filters.status !== 'all' && (row.workStatus ?? 'chua_xet') !== filters.status) return false;
      if (isEmptyTrafficReport(row.report)) {
        // Dòng không có dữ liệu chỉ bị ảnh hưởng bởi lọc trạng thái.
        return minVisits <= 0 && minMarket <= 0 && maxDirect >= 100;
      }
      const visits = row.report?.overview?.visits ?? null;
      if (minVisits > 0 && (visits == null || visits < minVisits)) return false;
      const share = getMarketShare(row.report);
      if (minMarket > 0 && (share == null || share * 100 < minMarket)) return false;
      const mix = computeTrafficMix(row.report?.traffic_sources);
      if (maxDirect < 100 && (mix == null || mix.direct * 100 > maxDirect)) return false;
      return true;
    });
  }, [rows, searchQuery, filters]);

  const visibleRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir, externalAds),
    [filteredRows, sortKey, sortDir, externalAds]
  );

  function toggleSort(key: TrafficSortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'updated' ? 'desc' : 'asc');
    }
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleOptional((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Private-mode storage failure — lựa chọn chỉ sống trong phiên.
      }
      return next;
    });
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = addValue.trim();
    if (!value || adding) return;
    setAdding(true);
    setAddError(null);

    const { valid, invalid } = parseDomainList(value);
    if (valid.length === 0) {
      setAddError(`Không có domain hợp lệ để chạy: ${invalid.join(', ') || value}`);
      setAdding(false);
      return;
    }

    const invalidNote = invalid.length ? ` Bỏ qua ${invalid.length} mục không hợp lệ: ${invalid.join(', ')}.` : '';
    const confirmed = await dialog.confirm(
      `Sẽ thêm & chạy ${valid.length} domain (${valid.length} lượt gọi TabAPI).${invalidNote} Tiếp tục?`,
      { title: 'Thêm & chạy', confirmLabel: 'Chạy' }
    );
    if (!confirmed) {
      setAdding(false);
      return;
    }

    let okCount = 0;
    const failures: string[] = [];
    for (const domain of valid) {
      const result = await trafficFetch<AddRunResponse>('/api/v1/cms/traffic/domains', {
        method: 'POST',
        body: { domain },
      });
      if (result.ok && result.data?.status === 'success') {
        onAdded({ ...result.data.data, lastError: null, updatedAt: null });
        okCount += 1;
      } else {
        failures.push(`${domain}: ${result.ok ? 'lỗi không rõ' : result.message}`);
      }
    }

    if (okCount > 0) onToast('success', `Đã thêm & chạy ${okCount}/${valid.length} domain`);
    if (failures.length) setAddError(failures.join(' · '));
    else if (okCount > 0) setAddValue('');
    setAdding(false);
  }

  async function handleRefresh(row: TrafficRow) {
    if (refreshingId) return;
    setRefreshingId(row.id);
    const result = await trafficFetch<AddRunResponse>(
      `/api/v1/cms/traffic/domains/${row.id}/refresh`,
      { method: 'POST' }
    );
    if (result.ok && result.data?.status === 'success') {
      onRefreshed({ ...result.data.data, lastError: null, updatedAt: null, workStatus: row.workStatus, workNote: row.workNote });
      onToast('success', 'Đã làm mới dữ liệu domain');
    } else {
      onToast('error', result.ok ? 'Không thể làm mới domain lúc này.' : result.message);
    }
    setRefreshingId(null);
  }

  async function handleDelete(row: TrafficRow) {
    if (deletingId) return;
    const confirmed = await dialog.confirm('Bỏ theo dõi domain này?');
    if (!confirmed) return;
    setDeletingId(row.id);
    const result = await trafficFetch<{ status: string }>(
      `/api/v1/cms/traffic/domains/${row.id}`,
      { method: 'DELETE' }
    );
    if (result.ok && result.data?.status === 'success') {
      onDeleted(row.id);
      onToast('success', 'Đã bỏ theo dõi domain');
    } else {
      onToast('error', result.ok ? 'Không thể xóa domain lúc này.' : result.message);
    }
    setDeletingId(null);
  }

  async function patchWork(row: TrafficRow, payload: { workStatus?: WorkStatus; workNote?: string }) {
    if (patchingId) return;
    setPatchingId(row.id);
    const result = await trafficFetch<PatchWorkResponse>(`/api/v1/cms/traffic/domains/${row.id}`, {
      method: 'PATCH',
      body: payload,
    });
    if (result.ok && result.data?.status === 'success') {
      onRowUpdated({ ...row, workStatus: result.data.data.workStatus, workNote: result.data.data.workNote });
    } else {
      onToast('error', result.ok ? 'Không thể cập nhật trạng thái.' : result.message);
    }
    setPatchingId(null);
  }

  async function handleNoteChange(row: TrafficRow) {
    const note = await dialog.prompt('Ghi chú ngắn cho domain này', {
      title: 'Ghi chú',
      defaultValue: row.workNote ?? '',
      confirmLabel: 'Lưu',
    });
    if (note === null) return;
    await patchWork(row, { workNote: note.slice(0, 500) });
  }

  function csvValue(row: TrafficRow, key: ColumnKey, empty: boolean): string {
    const overview = row.report?.overview ?? null;
    switch (key) {
      case 'domain':
        return row.domain;
      case 'visits':
        return empty || overview?.visits == null ? '' : formatNumber(overview.visits);
      case 'global_rank':
        return overview?.global_rank == null ? '' : String(overview.global_rank);
      case 'country_rank':
        return overview?.country_rank ? `${overview.country_rank.country} #${overview.country_rank.rank}` : '';
      case 'trend': {
        const trend = trendValue(row.report?.monthly_visits);
        return trend == null ? '' : trendPctText(trend);
      }
      case 'market_share':
        return empty ? '' : marketText(row);
      case 'mix': {
        const mix = computeTrafficMix(row.report?.traffic_sources);
        return mix ? mixTooltip(mix) : '';
      }
      case 'bounce_rate':
        return overview?.bounce_rate == null ? '' : formatPercent(overview.bounce_rate);
      case 'pages_per_visit':
        return overview?.pages_per_visit == null ? '' : overview.pages_per_visit.toFixed(2);
      case 'external_ads':
        return externalAds[row.domain] != null ? String(externalAds[row.domain]) : '';
      case 'affiliate':
        return 'Chưa quét';
      case 'score': {
        const score = computePreliminaryScore(row.report).score;
        return score == null ? '' : String(score);
      }
      case 'updated':
        return row.lastFetchedAt ?? row.updatedAt ?? '';
      case 'actions':
        return '';
    }
  }

  function exportCsv() {
    const cols = activeColumns.filter((column) => column.key !== 'actions');
    const lines = visibleRows.map((row) =>
      cols.map((column) => csvValue(row, column.key, isEmptyTrafficReport(row.report)))
    );
    const blob = new Blob([buildCsv(cols.map((column) => column.label), lines)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `traffic-domains-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    onToast('success', 'Đã xuất CSV các cột đang hiển thị');
  }

  const isSorted = (key: TrafficSortKey) => sortKey === key;
  const columnCount = activeColumns.length;

  function renderCell(row: TrafficRow, key: ColumnKey, empty: boolean) {
    const overview = row.report?.overview ?? null;
    const busy = refreshingId === row.id || deletingId === row.id || patchingId === row.id;

    switch (key) {
      case 'domain':
        return (
          <>
            <div className="flex items-center gap-2">
              <DomainFavicon domain={row.domain} />
              <span className="truncate">{row.domain}</span>
            </div>
            {row.lastError && (
              <span className="block text-[11px] text-rose-400/90 mt-0.5" title={row.lastError.message}>
                Lỗi lần cập nhật gần nhất
              </span>
            )}
            <ModuleDots
              trafficLoaded={row.report != null}
              trafficLoadedAt={row.lastFetchedAt ?? row.updatedAt ?? null}
              loads={moduleLoads[row.domain] ?? {}}
            />
          </>
        );
      case 'visits':
        if (empty) return <NoDataCell />;
        return (
          <span title={overview?.visits != null ? formatNumber(overview.visits) : undefined}>
            {overview?.visits == null ? '—' : formatVisitsCompact(overview.visits)}
          </span>
        );
      case 'global_rank':
        return empty ? <NoDataCell /> : <span>{overview?.global_rank == null ? '—' : `#${formatNumber(overview.global_rank)}`}</span>;
      case 'country_rank':
        return empty ? (
          <NoDataCell />
        ) : (
          <span>{overview?.country_rank ? `${overview.country_rank.country} · #${formatNumber(overview.country_rank.rank)}` : '—'}</span>
        );
      case 'trend':
        return empty ? <NoDataCell /> : <TrendCell monthly={row.report?.monthly_visits} />;
      case 'market_share':
        return empty ? <NoDataCell /> : <span>{marketText(row)}</span>;
      case 'mix': {
        if (empty) return <NoDataCell />;
        const mix = computeTrafficMix(row.report?.traffic_sources);
        return mix ? <MixBar mix={mix} /> : <span className="text-slate-600">—</span>;
      }
      case 'bounce_rate':
        return empty ? <NoDataCell /> : <span>{formatPercent(overview?.bounce_rate ?? null)}</span>;
      case 'pages_per_visit':
        return empty ? (
          <NoDataCell />
        ) : (
          <span>{overview?.pages_per_visit == null ? '—' : overview.pages_per_visit.toFixed(2)}</span>
        );
      case 'external_ads': {
        const external = externalAds[row.domain];
        return external != null ? (
          <span title="Số advertiser bên ngoài đang chạy (từ kết quả Ads đã tải trong phiên)">
            {formatNumber(external)}
          </span>
        ) : (
          <span className="text-slate-600" title="Chưa tải dữ liệu Ads cho domain này">
            —
          </span>
        );
      }
      case 'affiliate':
        return <span className="text-slate-600">{formatAffiliateCell(null)}</span>;
      case 'score':
        return empty ? <NoDataCell /> : <ScoreCell report={row.report} />;
      case 'updated':
        return (
          <span
            className="text-slate-500 text-xs whitespace-nowrap"
            title={row.lastFetchedAt ? formatDateTime(row.lastFetchedAt) : undefined}
          >
            <span suppressHydrationWarning>{formatRelativeTime(row.lastFetchedAt ?? row.updatedAt ?? null)}</span>
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <WorkStatusControl
              row={row}
              disabled={busy}
              onStatusChange={(status) => void patchWork(row, { workStatus: status })}
              onNoteChange={() => void handleNoteChange(row)}
            />
            <button
              type="button"
              onClick={() => onOpenDetail(row)}
              disabled={busy}
              title="Chi tiết"
              aria-label={`Xem chi tiết ${row.domain}`}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Eye size={15} />
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh(row)}
              disabled={busy}
              title="Làm mới traffic"
              aria-label={`Làm mới ${row.domain}`}
              className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {refreshingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(row)}
              disabled={busy}
              title="Xóa"
              aria-label={`Xóa ${row.domain}`}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {deletingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </div>
        );
    }
  }

  const alignClass = (key: ColumnKey) =>
    key === 'domain' ? 'text-left' : key === 'actions' ? 'text-right' : 'text-right';

  return (
    <div className="space-y-4">
      {/* Search + công cụ + Thêm & chạy (multi-domain, có xác nhận) */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm domain…"
            aria-label="Tìm domain"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFilters((current) => !current)}
            aria-expanded={showFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              filtersActive(filters)
                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                : 'border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={14} /> Bộ lọc{filtersActive(filters) ? ' •' : ''}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumns((current) => !current)}
              aria-expanded={showColumns}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Chọn cột
              {visibleOptional.size > 0 && <span className="text-amber-400">•</span>}
            </button>
            {showColumns && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
                {COLUMNS.filter((column) => column.optional).map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={visibleOptional.has(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="accent-amber-400"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visibleRows.length === 0}
            title="Xuất CSV các cột đang hiển thị"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} /> CSV
          </button>
        </div>
        <form onSubmit={handleAdd} className="flex items-start gap-2 shrink-0">
          <textarea
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            rows={1}
            placeholder="example.com hoặc nhiều domain…"
            title="Nhập nhiều domain: mỗi dòng một domain, hoặc phân tách bằng dấu phẩy"
            aria-label="Domain hoặc danh sách domain cần thêm"
            disabled={adding}
            className="w-full md:w-80 lg:w-96 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-60 resize-y min-h-[42px]"
          />
          <button
            type="submit"
            disabled={adding || !addValue.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Thêm &amp; chạy
          </button>
        </form>
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 px-4 py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="text-xs text-slate-400">
              Traffic tối thiểu (lượt/tháng)
              <input
                type="number"
                min={0}
                value={filters.minVisits}
                onChange={(e) => setFilters({ ...filters, minVisits: e.target.value })}
                placeholder="VD: 100000"
                className="mt-1 w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="text-xs text-slate-400">
              Tỷ trọng US tối thiểu (%)
              <input
                type="number"
                min={0}
                max={100}
                value={filters.minMarket}
                onChange={(e) => setFilters({ ...filters, minMarket: e.target.value })}
                placeholder="VD: 30"
                className="mt-1 w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="text-xs text-slate-400">
              Tỷ trọng trực tiếp tối đa (%)
              <input
                type="number"
                min={0}
                max={100}
                value={filters.maxDirect}
                onChange={(e) => setFilters({ ...filters, maxDirect: e.target.value })}
                placeholder="VD: 60"
                className="mt-1 w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="text-xs text-slate-400" title="Chưa xét: mặc định · Đang xét: đang phân tích · Chọn: giữ lại · Loại: loại bỏ">
              Trạng thái làm việc
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as QuickFilters['status'] })}
                className="mt-1 w-full bg-slate-950/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                <option value="all">Tất cả</option>
                {WORK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WORK_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filtersActive(filters) && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {addError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {addError}
        </div>
      )}

      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm min-w-[1280px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    aria-sort={
                      column.sortable && isSorted(column.key as TrafficSortKey)
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={`p-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${alignClass(column.key)}`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key as TrafficSortKey)}
                        className={`inline-flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${
                          isSorted(column.key as TrafficSortKey) ? 'text-amber-400' : ''
                        }`}
                      >
                        {column.label}
                        {column.key === 'score' && <ScoreMethodologyHint />}
                        {isSorted(column.key as TrafficSortKey) ? (
                          sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} count={columnCount} />)
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="p-10 text-center text-slate-500 text-sm">
                    {rows.length === 0
                      ? 'Chưa theo dõi domain nào'
                      : `Không có domain nào khớp "${searchQuery}"${filtersActive(filters) ? ' và bộ lọc hiện tại' : ''}.`}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const empty = isEmptyTrafficReport(row.report);
                  return (
                    <tr
                      key={row.id}
                      className={`group border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors ${
                        empty ? 'opacity-50 hover:opacity-90' : ''
                      }`}
                    >
                      {activeColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`p-4 ${alignClass(column.key)} ${
                            column.key === 'domain' ? 'font-medium text-white break-all max-w-[220px]' : 'text-slate-300'
                          }`}
                        >
                          {renderCell(row, column.key, empty)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
