'use client';

// Google Ads Transparency panel — GET /api/v1/cms/traffic/ads?domain=
// (hard-error envelope). "Tải thêm" paginates via next_page_token; each
// creative expands on demand → GET /ads/detail (1 SerpApi call per view).

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/traffic/format';
import type { AdCreative, AdDetail, AdsResponse } from '@/types/traffic';
import { trafficFetch } from '../traffic-helpers';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface AdsPanelProps {
  domain: string;
  missingKey: boolean;
}

// Ported minimal ads-insights (traffic-web reference) — pure, computed from
// loaded creatives only.
const ACTIVE_WINDOW_DAYS = 7;
const LONG_RUNNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const FORMAT_LABELS: Record<string, string> = {
  text: 'Văn bản',
  image: 'Hình ảnh',
  video: 'Video',
  unknown: 'Khác',
};

function toMs(date: string | null): number | null {
  if (!date) return null;
  const value = Date.parse(date);
  return Number.isNaN(value) ? null : value;
}

function isActive(creative: AdCreative, now: number): boolean {
  const last = toMs(creative.last_shown);
  return last != null && last + DAY_MS >= now - ACTIVE_WINDOW_DAYS * DAY_MS;
}

function formatLabel(format: string | null): string {
  return FORMAT_LABELS[format ?? 'unknown'] ?? format ?? 'Khác';
}

interface AdvertiserGroup {
  id: string;
  name: string;
  count: number;
  active: number;
  totalDays: number;
  lastShown: string | null;
}

function groupByAdvertiser(creatives: AdCreative[], now: number): AdvertiserGroup[] {
  const groups = new Map<string, AdvertiserGroup>();
  for (const creative of creatives) {
    const id = creative.advertiser_id || creative.advertiser;
    let group = groups.get(id);
    if (!group) {
      group = { id, name: creative.advertiser, count: 0, active: 0, totalDays: 0, lastShown: null };
      groups.set(id, group);
    }
    group.count += 1;
    if (isActive(creative, now)) group.active += 1;
    group.totalDays += creative.total_days_shown ?? 0;
    if (creative.last_shown && (!group.lastShown || creative.last_shown > group.lastShown)) {
      group.lastShown = creative.last_shown;
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.totalDays - a.totalDays);
}

interface AdsSummary {
  advertisers: number;
  creatives: number;
  active: number;
  longest: AdCreative | null;
}

function summarizeAds(creatives: AdCreative[], now: number): AdsSummary {
  const advertisers = new Set<string>();
  let longest: AdCreative | null = null;
  for (const creative of creatives) {
    advertisers.add(creative.advertiser_id || creative.advertiser);
    if ((creative.total_days_shown ?? 0) > (longest?.total_days_shown ?? -1)) longest = creative;
  }
  return {
    advertisers: advertisers.size,
    creatives: creatives.length,
    active: creatives.filter((creative) => isActive(creative, now)).length,
    longest,
  };
}

function CreativeRow({ creative }: { creative: AdCreative }) {
  const [detail, setDetail] = useState<AdDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setError(null);
    const result = await trafficFetch<AdDetail>(
      `/api/v1/cms/traffic/ads/detail?advertiser_id=${encodeURIComponent(creative.advertiser_id)}&creative_id=${encodeURIComponent(creative.ad_creative_id)}`
    );
    if (result.ok) {
      setDetail(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-bold text-white break-words">
          {creative.advertiser || 'Không rõ tên'} · {formatLabel(creative.format)}
          {creative.width != null && creative.height != null && (
            <span className="ml-1 font-mono text-slate-500">
              {creative.width}×{creative.height}
            </span>
          )}
        </span>
        <span className="text-slate-500 font-mono">
          {creative.total_days_shown == null ? '—' : `${formatNumber(creative.total_days_shown)} ngày`}
          {(creative.total_days_shown ?? 0) >= LONG_RUNNING_DAYS && (
            <span className="ml-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              Chạy lâu
            </span>
          )}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1 font-mono break-words">
        Bắt đầu {creative.first_shown ?? '—'} · hiển thị gần nhất {creative.last_shown ?? '—'}
      </p>
      {!detail ? (
        <button
          type="button"
          onClick={() => void loadDetail()}
          disabled={loading}
          className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Đang tải…' : 'Sản phẩm & thị trường (1 lượt)'}
        </button>
      ) : null}
      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-300">
          {error}
        </p>
      )}
      {detail && (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] space-y-2">
          <p className="text-slate-300">
            Đơn vị tài trợ: <span className="font-bold text-white">{detail.funded_by ?? '—'}</span>
          </p>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Thị trường đang hiển thị</p>
            {detail.regions.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {detail.regions.map((region) => (
                  <li key={region.name} className="rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 text-slate-300">
                    {region.name}
                    {region.last_shown && <span className="ml-1 font-mono text-[10px] text-slate-500">· {region.last_shown}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Chưa có thông tin khu vực.</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Nội dung / sản phẩm trong quảng cáo</p>
            {detail.items.filter((item) => item.snippet || item.image).length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {detail.items
                  .filter((item) => item.snippet || item.image)
                  .map((item, index) => (
                    <li key={`${index}-${item.snippet ?? item.image}`} className="flex gap-2">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh quảng cáo từ domain ngoài, không qua tối ưu của Next
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-14 w-14 shrink-0 rounded-md border border-slate-800 object-contain"
                        />
                      )}
                      <p className="min-w-0 whitespace-pre-line break-words text-slate-300">{item.snippet ?? '—'}</p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-slate-500">Không có nội dung chi tiết.</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function AdsPanel({ domain, missingKey }: AdsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<AdCreative[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);

  async function load(pageToken: string | null) {
    setLoading(true);
    setErrorMessage(null);
    const query = new URLSearchParams({ domain });
    if (pageToken) query.set('page_token', pageToken);
    const result = await trafficFetch<AdsResponse>(`/api/v1/cms/traffic/ads?${query.toString()}`);
    if (!result.ok) {
      setErrorMessage(result.message);
      setLoading(false);
      return;
    }
    setCreatives((current) => {
      const known = new Set((current ?? []).map((creative) => creative.ad_creative_id));
      return [...(current ?? []), ...result.data.creatives.filter((creative) => !known.has(creative.ad_creative_id))];
    });
    setTotal(result.data.total_results);
    setNextToken(result.data.next_page_token);
    setLoading(false);
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loading && creatives === null && errorMessage === null && !missingKey) {
      void load(null);
    }
  }

  const hasData = creatives !== null && creatives.length > 0;
  const isEmptyResult = creatives !== null && creatives.length === 0;
  // Captured once at mount (state initializer — render stays pure); active/long
  // running windows are relative to when the panel data was loaded.
  const [now] = useState(() => Date.now());
  const summary = useMemo(() => (creatives ? summarizeAds(creatives, now) : null), [creatives, now]);
  const groups = useMemo(() => (creatives ? groupByAdvertiser(creatives, now) : []), [creatives, now]);

  return (
    <PanelCard
      title="Google Ads Transparency"
      description={
        creatives
          ? `${formatNumber(creatives.length)}/${total ?? creatives.length} creative đã tải · mỗi lần tải thêm tốn 1 lượt SerpApi`
          : 'Các creative quảng cáo Google mà Ads Transparency Center ghi nhận cho tên miền.'
      }
      badge="SerpApi"
      expanded={expanded}
      onToggle={toggle}
    >
      {missingKey && <PanelMissingKey />}
      {!missingKey && loading && creatives === null && <PanelLoading text="Đang tải dữ liệu quảng cáo…" />}
      {!missingKey && errorMessage && creatives === null && (
        <PanelError message={errorMessage} onRetry={() => void load(null)} />
      )}
      {!missingKey && isEmptyResult && !loading && <PanelEmpty text="Không tìm thấy quảng cáo nào cho tên miền này." />}
      {!missingKey && hasData && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Nhà quảng cáo" value={formatNumber(summary.advertisers)} />
            <MiniStat label="Creative đã tải" value={`${formatNumber(summary.creatives)}${total ? ` / ${formatNumber(total)}` : ''}`} />
            <MiniStat label="Đang chạy" value={formatNumber(summary.active)} />
            <MiniStat
              label="Chạy lâu nhất"
              value={summary.longest?.total_days_shown != null ? `${formatNumber(summary.longest.total_days_shown)} ngày` : '—'}
            />
          </div>

          {groups.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Theo nhà quảng cáo</h5>
              <div className="grid gap-2 md:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs font-bold text-white break-words">{group.name || 'Không rõ tên'}</p>
                    <p className="font-mono text-[10px] text-slate-500 break-all">{group.id}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {group.count} creative · {group.active} đang chạy · {formatNumber(group.totalDays)} ngày tổng
                    </p>
                    <p className="text-[11px] text-slate-500">Gần nhất: {group.lastShown ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Creative</h5>
            <ul className="space-y-2">
              {creatives?.map((creative) => <CreativeRow key={creative.ad_creative_id} creative={creative} />)}
            </ul>
          </div>

          {nextToken && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void load(nextToken)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang tải thêm…' : 'Tải thêm creative (1 lượt)'}
              </button>
              {errorMessage && (
                <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
                  {errorMessage}
                </p>
              )}
            </div>
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
