'use client';

// Referring sites panel — GET /api/v1/cms/traffic/referring-sites?domain=
// (soft slice { data, error }; TabAPI, tốn 5 credit mỗi lần tải — phải hiện
// disclosure). Click-to-load.

import { useState } from 'react';
import { formatDateTime, formatNumber } from '@/lib/traffic/format';
import type { ReferringBacklink, ReferringSitesResponse, ReferringSitesResult } from '@/types/traffic';
import { sliceMessage, trafficFetch } from '../traffic-helpers';
import { recordModuleLoad } from '../module-loads';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface ReferringSitesPanelProps {
  domain: string;
  missingKey: boolean;
}

function BacklinkItem({ item }: { item: ReferringBacklink }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-white break-all text-xs">{item.from_domain}</span>
        {item.domain_rating != null && (
          <span className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            DR {formatNumber(item.domain_rating)}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 break-words mt-1">{item.title ?? item.from_domain}</p>
      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
        {item.anchor && (
          <span className="rounded-md border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-slate-400 break-all max-w-full">
            {item.anchor}
          </span>
        )}
        <span aria-hidden="true" className="text-slate-600">→</span>
        <span className="font-mono text-slate-500 break-all max-w-full">{item.to_path ?? item.to_url ?? '—'}</span>
      </div>
    </li>
  );
}

export default function ReferringSitesPanel({ domain, missingKey }: ReferringSitesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ReferringSitesResult | null>(null);

  async function load() {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    const res = await trafficFetch<ReferringSitesResponse>(`/api/v1/cms/traffic/referring-sites?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) {
      setErrorMessage(res.message);
    } else {
      const error = sliceMessage(res.data.referring_sites);
      if (error) setErrorMessage(error);
      else {
        setResult(res.data.referring_sites?.data ?? null);
        // Instrumentation for the outer table's module dots — no UI change.
        recordModuleLoad(domain, 'backlink');
      }
    }
    setLoading(false);
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loading && errorMessage === null && result === null && !missingKey) {
      void load();
    }
  }

  const overview = result?.overview ?? null;
  const backlinks = result?.backlinks ?? [];
  const hasData = overview !== null || backlinks.length > 0;
  const phase = errorMessage
    ? 'error'
    : loading
      ? 'loading'
      : missingKey
        ? 'missing'
        : hasData
          ? 'ready'
          : 'empty';

  return (
    <PanelCard
      title="Tên miền giới thiệu (backlink)"
      description="Dữ liệu dựa trên liên kết từ TabAPI — không phải lượt truy cập. Mỗi lần tải tốn 5 credit TabAPI; kết quả được lưu cache 24 giờ, kết quả trống chỉ 10 phút."
      badge="TabAPI · 5 credits"
      expanded={expanded}
      onToggle={toggle}
    >
      {phase === 'loading' && <PanelLoading text="Đang tải dữ liệu backlink…" />}
      {phase === 'error' && errorMessage && <PanelError message={errorMessage} onRetry={() => void load()} />}
      {phase === 'missing' && <PanelMissingKey />}
      {phase === 'empty' && (
        <PanelEmpty text="Chưa phát hiện backlink nào cho tên miền này — có thể trang quá mới hoặc chưa được thu thập dữ liệu liên kết." />
      )}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <MiniStat label="Domain Rating" value={formatNumber(overview?.domain_rating ?? null)} />
            <MiniStat label="Backlinks" value={formatNumber(overview?.backlinks ?? null)} />
            <MiniStat label="Tên miền giới thiệu" value={formatNumber(overview?.referring_domains ?? null)} />
            <MiniStat
              label="Dofollow backlink"
              value={overview?.dofollow_backlinks_pct == null ? '—' : `${formatNumber(overview.dofollow_backlinks_pct)}%`}
            />
            <MiniStat
              label="Dofollow tên miền"
              value={
                overview?.dofollow_referring_domains_pct == null
                  ? '—'
                  : `${formatNumber(overview.dofollow_referring_domains_pct)}%`
              }
            />
          </div>

          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Top backlink</h5>
            {backlinks.length ? (
              <ul aria-label="Top backlink" className="space-y-2">
                {backlinks.slice(0, 10).map((item, index) => (
                  <BacklinkItem key={`${item.from_url}-${index}`} item={item} />
                ))}
              </ul>
            ) : (
              <PanelEmpty text="Chưa có backlink mẫu nào được ghi nhận." />
            )}
          </div>

          {result?.fetched_at && (
            <p className="text-[11px] text-slate-500">Nguồn: TabAPI · Cập nhật {formatDateTime(result.fetched_at)}</p>
          )}
        </div>
      )}
    </PanelCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{label}</p>
      <p className="text-sm font-bold text-white truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
