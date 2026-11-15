'use client';

// Google Ads Transparency panel — GET /api/v1/cms/traffic/ads?domain=
// (hard-error envelope). Đúng 1 lượt SerpApi cho mỗi domain: server trả sẵn
// nhóm advertiser từ mẫu 100 creative; panel chỉ render, không gọi thêm.

import { useMemo, useState } from 'react';
import { formatNumber, formatDate } from '@/lib/traffic/format';
import { dialog } from '@/lib/dialog';
import type { AdsAdvertiserRow, AdsResponse } from '@/types/traffic';
import { trafficFetch } from '../traffic-helpers';
import { recordAdsInsight } from '../module-loads';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface AdsPanelProps {
  domain: string;
  missingKey: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeLastRun(lastRunSeconds: number | null, now: number): string {
  if (lastRunSeconds == null) return '—';
  const diffDays = Math.max(0, Math.floor((now - lastRunSeconds * 1000) / DAY_MS));
  const relative = diffDays === 0 ? 'hôm nay' : `${formatNumber(diffDays)} ngày trước`;
  return `${relative} (${formatDate(new Date(lastRunSeconds * 1000).toISOString())})`;
}

function OwnerBadge({ owner }: { owner: AdsAdvertiserRow['owner'] }) {
  return owner === 'owner' ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
      Chính chủ
    </span>
  ) : (
    <span className="rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
      Bên ngoài
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
      Đang chạy
    </span>
  ) : (
    <span className="rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
      Ngừng
    </span>
  );
}

function AdvertiserRowItem({ row, now }: { row: AdsAdvertiserRow; now: number }) {
  const newest = row.newest_creative;
  const started =
    newest?.first_shown != null ? formatDate(new Date(newest.first_shown * 1000).toISOString()) : '—';
  const runDays = row.newest_run_days != null ? formatNumber(row.newest_run_days) : '—';
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold text-white break-words">{row.name || 'Không rõ tên'}</span>
        <OwnerBadge owner={row.owner} />
        <StatusBadge isActive={row.is_active} />
      </div>
      <p className="text-[11px] text-slate-500 mt-1 font-mono break-words">
        {formatNumber(row.creative_count)} creative · creative mới nhất bắt đầu {started}, chạy {runDays} ngày ·
        gần nhất: {relativeLastRun(row.last_run, now)}
      </p>
    </li>
  );
}

export default function AdsPanel({ domain, missingKey }: AdsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<AdsResponse | null>(null);

  async function load(noCache: boolean) {
    setLoading(true);
    setErrorMessage(null);
    const query = new URLSearchParams({ domain });
    if (noCache) query.set('no_cache', 'true');
    const result = await trafficFetch<AdsResponse>(`/api/v1/cms/traffic/ads?${query.toString()}`);
    if (!result.ok) {
      setErrorMessage(result.message);
      setLoading(false);
      return;
    }
    setData(result.data);
    // Instrumentation for the outer table ("Đối thủ quảng cáo" + module dot).
    recordAdsInsight(domain, result.data.external_active);
    setLoading(false);
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loading && data === null && errorMessage === null && !missingKey) {
      void load(false);
    }
  }

  async function refresh() {
    const confirmed = await dialog.confirm(
      'Làm mới sẽ gọi lại SerpApi cho domain này và tốn 1 lượt credit. Tiếp tục?',
      { title: 'Làm mới dữ liệu Ads', confirmLabel: 'Làm mới' },
    );
    if (confirmed) void load(true);
  }

  const hasData = data !== null && data.sample_size > 0;
  const isEmptyResult = data !== null && data.sample_size === 0;
  // Captured once at mount (state initializer — render stays pure); the
  // relative "gần nhất" time is relative to when the panel rendered.
  const [now] = useState(() => Date.now());
  const totalLabel = useMemo(() => {
    if (!data) return '—';
    return data.total_results == null
      ? formatNumber(data.sample_size)
      : `${formatNumber(data.sample_size)} / ~${formatNumber(data.total_results)}`;
  }, [data]);

  return (
    <PanelCard
      title="Google Ads Transparency"
      description="1 lượt SerpApi cho mỗi domain"
      badge="SerpApi"
      expanded={expanded}
      onToggle={toggle}
    >
      {missingKey && <PanelMissingKey />}
      {!missingKey && loading && data === null && <PanelLoading text="Đang tải dữ liệu quảng cáo…" />}
      {!missingKey && errorMessage && data === null && (
        <PanelError message={errorMessage} onRetry={() => void load(false)} />
      )}
      {!missingKey && isEmptyResult && !loading && <PanelEmpty text="Không tìm thấy quảng cáo nào cho domain này" />}
      {!missingKey && hasData && data && (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-500">
            Mẫu {formatNumber(data.sample_size)} creative gần đây nhất / khoảng{' '}
            {data.total_results == null ? '—' : formatNumber(data.total_results)} tổng. Số creative theo từng nhà
            quảng cáo chỉ tính trong mẫu nên thấp hơn thực tế.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniStat
              label="Nhà quảng cáo"
              value={formatNumber(data.advertiser_total)}
              sub={`${formatNumber(data.advertiser_active)} đang chạy`}
            />
            <MiniStat label="Bên ngoài đang chạy" value={formatNumber(data.external_active)} />
            <MiniStat label="Creative (mẫu / khoảng tổng)" value={totalLabel} />
          </div>

          {data.advertisers.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Theo nhà quảng cáo</h5>
              <ul className="space-y-2">
                {data.advertisers.map((row, index) => (
                  <AdvertiserRowItem key={`${row.advertiser_id}-${index}`} row={row} now={now} />
                ))}
              </ul>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang tải…' : 'Làm mới (1 lượt SerpApi)'}
            </button>
            {errorMessage && (
              <p role="alert" className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </PanelCard>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{label}</p>
      <p className="text-sm font-bold text-white truncate" title={value}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
