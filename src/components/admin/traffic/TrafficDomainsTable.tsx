'use client';

// Danh sách domain theo dõi (TRF-02, TRF-04) — Affiora guide List-Domain UX:
// thanh tìm kiếm + nhóm "Thêm & chạy" (nhập domain hoặc URL, chạy report ngay
// trong một bước), bảng 10 cột với sắp xếp cột phía client, làm mới/xóa từng
// dòng. Mọi lỗi từ route (missing_api_key, invalid_domain,
// insufficient_credits…) hiện đúng câu tiếng Việt mà route trả về.

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, ChevronUp, Eye, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { dialog } from '@/lib/dialog';
import { formatCompactNumber, formatNumber, formatPercent } from '@/lib/traffic/format';
import type { MonthlyVisit } from '@/types/traffic';
import {
  filterRows,
  formatRelativeTime,
  momTrend,
  sortRows,
  trafficFetch,
  type SortDir,
  type TrafficRow,
  type TrafficSortKey,
} from './traffic-helpers';

interface TrafficDomainsTableProps {
  rows: TrafficRow[];
  loading: boolean;
  onAdded: (row: TrafficRow) => void;
  onRefreshed: (row: TrafficRow) => void;
  onDeleted: (id: string) => void;
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

interface RowMutationResponse {
  status: string;
  data: {
    id: string;
    domain: string;
    report: TrafficRow['report'];
    lastFetchedAt: string | null;
  };
}

const SORT_COLUMNS: Array<{ key: TrafficSortKey; label: string }> = [
  { key: 'visits', label: 'Lượt truy cập/tháng' },
  { key: 'global_rank', label: 'Hạng toàn cầu' },
  { key: 'country_rank', label: 'Hạng quốc gia' },
  { key: 'bounce_rate', label: 'Bounce rate' },
  { key: 'pages_per_visit', label: 'Trang/phiên' },
  { key: 'updated', label: 'Cập nhật' },
];

function TrendCell({ monthly }: { monthly: MonthlyVisit[] | null | undefined }) {
  const trend = momTrend(monthly);
  if (trend == null) return <span className="text-slate-600">—</span>;
  const pct = (trend * 100).toFixed(1);
  if (trend >= 0) return <span className="text-emerald-400 font-semibold">▲ +{pct}%</span>;
  return <span className="text-rose-400 font-semibold">▼ {pct}%</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800/50">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-3.5 rounded bg-slate-800/70 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function TrafficDomainsTable({
  rows,
  loading,
  onAdded,
  onRefreshed,
  onDeleted,
  onOpenDetail,
  onToast,
}: TrafficDomainsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TrafficSortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const visibleRows = useMemo(
    () => sortRows(filterRows(rows, searchQuery), sortKey, sortDir),
    [rows, searchQuery, sortKey, sortDir]
  );

  function toggleSort(key: TrafficSortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'updated' ? 'desc' : 'asc');
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = addValue.trim();
    if (!value || adding) return;
    setAdding(true);
    setAddError(null);
    const result = await trafficFetch<AddRunResponse>('/api/v1/cms/traffic/domains', {
      method: 'POST',
      body: { domain: value },
    });
    if (result.ok && result.data?.status === 'success') {
      onAdded({ ...result.data.data, lastError: null, updatedAt: null });
      setAddValue('');
      onToast('success', 'Đã thêm domain');
    } else {
      const message = result.ok ? 'Không thể thêm domain lúc này.' : result.message;
      setAddError(message);
      onToast('error', message);
    }
    setAdding(false);
  }

  async function handleRefresh(row: TrafficRow) {
    if (refreshingId) return;
    setRefreshingId(row.id);
    const result = await trafficFetch<RowMutationResponse>(
      `/api/v1/cms/traffic/domains/${row.id}/refresh`,
      { method: 'POST' }
    );
    if (result.ok && result.data?.status === 'success') {
      onRefreshed({ ...result.data.data, lastError: null, updatedAt: null });
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

  const isSorted = (key: TrafficSortKey) => sortKey === key;

  return (
    <div className="space-y-4">
      {/* Search + Thêm & chạy (Affiora #s4 single-step Add & run) */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
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
        <form onSubmit={handleAdd} className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder="example.com hoặc https://example.com/blog"
            aria-label="Domain hoặc URL cần thêm"
            disabled={adding}
            className="w-full md:w-72 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors disabled:opacity-60"
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

      {addError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {addError}
        </div>
      )}

      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="p-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Domain</th>
                {SORT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    aria-sort={isSorted(col.key) ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="p-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer ${isSorted(col.key) ? 'text-amber-400' : ''}`}
                    >
                      {col.label}
                      {isSorted(col.key) ? (
                        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="p-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Xu hướng</th>
                <th className="p-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-500 text-sm">
                    {rows.length === 0
                      ? 'Chưa theo dõi domain nào'
                      : `Không có domain nào khớp "${searchQuery}".`}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const overview = row.report?.overview ?? null;
                  const topRegion = row.report?.top_regions?.[0] ?? null;
                  const busy = refreshingId === row.id || deletingId === row.id;
                  return (
                    <tr key={row.id} className="group border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white break-all max-w-[220px]">
                        {row.domain}
                        {row.lastError && (
                          <span className="block text-[11px] text-rose-400/90 mt-0.5" title={row.lastError.message}>
                            Lỗi lần cập nhật gần nhất
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-300 font-mono">
                        {overview?.visits == null ? '—' : formatCompactNumber(overview.visits)}
                      </td>
                      <td className="p-4 text-right text-slate-300 font-mono">
                        {overview?.global_rank == null ? '—' : `#${formatNumber(overview.global_rank)}`}
                      </td>
                      <td className="p-4 text-right text-slate-300 font-mono">
                        {overview?.country_rank ? `${overview.country_rank.country} · #${formatNumber(overview.country_rank.rank)}` : '—'}
                      </td>
                      <td className="p-4 text-right text-slate-300 font-mono">{formatPercent(overview?.bounce_rate ?? null)}</td>
                      <td className="p-4 text-right text-slate-300 font-mono">
                        {overview?.pages_per_visit == null ? '—' : overview.pages_per_visit.toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-slate-300">
                        {topRegion ? `${topRegion.country} · ${formatPercent(topRegion.share)}` : '—'}
                      </td>
                      <td className="p-4 text-right font-mono text-xs">
                        <TrendCell monthly={row.report?.monthly_visits} />
                      </td>
                      <td className="p-4 text-right text-slate-400 text-xs whitespace-nowrap">
                        <span suppressHydrationWarning>{formatRelativeTime(row.lastFetchedAt ?? row.updatedAt ?? null)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
                            title="Làm mới"
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
                      </td>
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
