'use client';

// Chi tiết domain (TRF-05) — modal đọc report ĐÃ LƯU từ GET
// /api/v1/cms/traffic/domains/[id] (không gọi upstream khi mở). "Làm mới" là
// hành động tường minh (POST .../refresh, tốn credits) và cập nhật cả dòng trong
// bảng qua onRefreshed. Bố cục core report theo traffic-web (data-shape reference)
// nhưng restyle hoàn toàn sang theme dark glassmorphism của admin, copy tiếng Việt.

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDuration,
  formatMonth,
  formatNumber,
  formatPercent,
} from '@/lib/traffic/format';
import type { AiTraffic, MonthlyVisit, TopRegion, TrafficResponse, TrafficSources } from '@/types/traffic';
import { trafficFetch, type TrafficConfigData, type TrafficRow } from './traffic-helpers';
import AdsPanel from './panels/AdsPanel';
import ReferringSitesPanel from './panels/ReferringSitesPanel';
import SerankingPanel from './panels/SerankingPanel';
import TrustpilotPanel from './panels/TrustpilotPanel';
import WhoisPanel from './panels/WhoisPanel';

interface TrafficDetailModalProps {
  row: TrafficRow;
  config: TrafficConfigData | null;
  onClose: () => void;
  onRefreshed: (row: TrafficRow) => void;
  onToast: (type: 'success' | 'error', text: string) => void;
}

interface DomainGetResponse {
  status: string;
  data: {
    id: string;
    domain: string;
    report: TrafficResponse | null;
    lastFetchedAt: string | null;
    lastError: TrafficRow['lastError'];
    updatedAt: string | null;
  };
}

interface RefreshResponse {
  status: string;
  data: {
    id: string;
    domain: string;
    report: TrafficResponse | null;
    lastFetchedAt: string | null;
  };
}

const SOURCE_LABELS: Array<[keyof TrafficSources, string]> = [
  ['direct', 'Trực tiếp'],
  ['search', 'Tìm kiếm'],
  ['search_organic', 'Tìm kiếm tự nhiên'],
  ['search_paid', 'Tìm kiếm trả phí'],
  ['social', 'Mạng xã hội'],
  ['social_organic', 'Social tự nhiên'],
  ['social_paid', 'Social trả phí'],
  ['referrals', 'Giới thiệu'],
  ['paid_referrals', 'Giới thiệu trả phí'],
  ['mail', 'Email'],
  ['gen_ai', 'AI tạo sinh'],
  ['affiliate', 'Affiliate'],
  ['other', 'Khác'],
];

function momChange(monthly: MonthlyVisit[], index: number): number | null {
  const previous = monthly[index - 1]?.visits;
  if (typeof previous !== 'number' || previous <= 0) return null;
  return (monthly[index].visits - previous) / previous;
}

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">{title}</h3>
        {badge && <span className="text-[10px] uppercase tracking-wider text-slate-500">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 truncate">{label}</p>
      <p className="text-lg font-bold text-white truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function EmptyHint({ text = 'Chưa có dữ liệu' }: { text?: string }) {
  return <p className="text-xs text-slate-500 py-3 text-center">{text}</p>;
}

export default function TrafficDetailModal({ row, config, onClose, onRefreshed, onToast }: TrafficDetailModalProps) {
  const [report, setReport] = useState<TrafficResponse | null>(row.report ?? null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load the stored report (zero upstream calls on the server side). Loading
  // state starts true; states update only after the await. If the fetch fails
  // we fall back to the row's already-stored report.
  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await trafficFetch<DomainGetResponse>(`/api/v1/cms/traffic/domains/${row.id}`);
      if (!active) return;
      if (result.ok && result.data?.status === 'success') {
        setReport(result.data.data.report);
        setLoadError(null);
      } else if (row.report) {
        setReport(row.report);
        setLoadError(null);
      } else {
        setLoadError(result.ok ? 'Không tìm thấy tên miền.' : result.message);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [row.id, row.report]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    const result = await trafficFetch<RefreshResponse>(`/api/v1/cms/traffic/domains/${row.id}/refresh`, {
      method: 'POST',
    });
    if (result.ok && result.data?.status === 'success') {
      setReport(result.data.data.report);
      onRefreshed({ ...result.data.data, lastError: null, updatedAt: null });
      onToast('success', 'Đã làm mới dữ liệu domain');
    } else {
      onToast('error', result.ok ? 'Không thể làm mới domain lúc này.' : result.message);
    }
    setRefreshing(false);
  }

  const overview = report?.overview ?? null;
  const monthly: MonthlyVisit[] = report?.monthly_visits ?? [];
  const regions: TopRegion[] = report?.top_regions ?? [];
  const aiTrends: AiTraffic['trends'] = report?.ai_traffic?.trends ?? [];
  const sources = SOURCE_LABELS.map(([key, label]) => ({
    key,
    label,
    value: report?.traffic_sources?.[key] ?? null,
  }))
    .filter((source) => source.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Missing-credential flags from the masked /config payload drive the panels'
  // 'Chưa cấu hình key' states (config.missing carries env-var names).
  const missingList = config?.missing ?? [];
  const missingWhois = missingList.includes('WHOIS_API_KEY');
  const missingTrustpilot = missingList.includes('TRUSTPILOT_SCRAPER_URL');
  const missingSeranking = missingList.includes('SE_RANKING_API_KEY');
  const missingSerpApi = missingList.includes('SERPAPI_KEY');
  const missingTabApi = missingList.includes('TABAPI_KEY');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop (closes on click) */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="traffic-detail-title"
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#0a0a0c] border border-slate-800 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800/80 bg-slate-950/50 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 mb-1">
              Báo cáo / {formatMonth(overview?.month ?? null)}
            </p>
            <h2 id="traffic-detail-title" className="text-2xl font-bold text-white break-all">
              {row.domain}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Dữ liệu ước tính
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Làm mới
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết"
              className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          {loading && !report ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm gap-2">
              <Loader2 size={18} className="animate-spin" /> Đang tải báo cáo đã lưu…
            </div>
          ) : loadError && !report ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {loadError}
            </div>
          ) : report ? (
            <>
              {/* (1) 6 metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <MetricCell
                  label="Lượt truy cập/tháng"
                  value={overview?.visits == null ? '—' : `${formatCompactNumber(overview.visits)} lượt`}
                />
                <MetricCell
                  label="Hạng toàn cầu"
                  value={overview?.global_rank == null ? '—' : `#${formatNumber(overview.global_rank)}`}
                />
                <MetricCell
                  label={overview?.country_rank ? `Hạng ${overview.country_rank.country}` : 'Hạng quốc gia'}
                  value={overview?.country_rank ? `#${formatNumber(overview.country_rank.rank)}` : '—'}
                />
                <MetricCell label="Bounce rate" value={formatPercent(overview?.bounce_rate ?? null)} />
                <MetricCell
                  label="Trang/phiên"
                  value={overview?.pages_per_visit == null ? '—' : overview.pages_per_visit.toFixed(2)}
                />
                <MetricCell label="Thời gian TB/phiên" value={formatDuration(overview?.time_on_site_seconds ?? null)} />
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {/* (2) Lịch sử theo tháng */}
                <SectionCard title="Lịch sử theo tháng" badge="Lượt/tháng">
                  {monthly.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="py-2 text-left font-bold">Tháng</th>
                          <th className="py-2 text-right font-bold">Lượt truy cập</th>
                          <th className="py-2 text-right font-bold">% thay đổi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.map((item, index) => {
                          const change = momChange(monthly, index);
                          return (
                            <tr key={item.month} className="border-b border-slate-800/40 last:border-0">
                              <td className="py-2.5 text-slate-200 font-medium">{formatMonth(item.month)}</td>
                              <td className="py-2.5 text-right text-slate-300 font-mono">{formatNumber(item.visits)}</td>
                              <td className="py-2.5 text-right font-mono text-xs">
                                {change == null ? (
                                  <span className="text-slate-600">—</span>
                                ) : change >= 0 ? (
                                  <span className="text-emerald-400">+{(change * 100).toFixed(1)}%</span>
                                ) : (
                                  <span className="text-rose-400">{(change * 100).toFixed(1)}%</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyHint />
                  )}
                </SectionCard>

                {/* (3) Nguồn traffic */}
                <SectionCard title="Nguồn traffic" badge="Tỷ trọng (%)">
                  {sources.length ? (
                    <div className="space-y-3">
                      {sources.map((source) => (
                        <div key={source.key} className="grid grid-cols-[110px_1fr_56px] items-center gap-3">
                          <span className="text-xs text-slate-300 truncate">{source.label}</span>
                          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-600"
                              style={{ width: `${Math.min((source.value ?? 0) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-right text-xs text-slate-300 font-mono">{formatPercent(source.value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyHint />
                  )}
                </SectionCard>

                {/* (4) Top quốc gia */}
                <SectionCard title="Top quốc gia" badge="Tỷ trọng lượt truy cập">
                  {regions.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="py-2 text-left font-bold">Quốc gia</th>
                          <th className="py-2 text-right font-bold">Tỷ trọng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regions.map((region) => (
                          <tr key={region.country} className="border-b border-slate-800/40 last:border-0">
                            <td className="py-2.5 text-slate-200">
                              <span className="inline-block mr-2 rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                                {region.country}
                              </span>
                              {region.name}
                            </td>
                            <td className="py-2.5 text-right text-slate-300 font-mono">{formatPercent(region.share)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyHint />
                  )}
                </SectionCard>

                {/* (5) Từ khóa hàng đầu */}
                <SectionCard title="Từ khóa hàng đầu" badge="Ước tính">
                  {report?.top_keywords?.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="py-2 text-left font-bold">Từ khóa</th>
                          <th className="py-2 text-right font-bold">Volume/tháng</th>
                          <th className="py-2 text-right font-bold">CPC</th>
                          <th className="py-2 text-right font-bold">Giá trị ước tính</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_keywords.map((keyword) => (
                          <tr key={keyword.name} className="border-b border-slate-800/40 last:border-0">
                            <td className="py-2.5 text-slate-200 break-all">{keyword.name}</td>
                            <td className="py-2.5 text-right text-slate-300 font-mono">{formatCompactNumber(keyword.volume)}</td>
                            <td className="py-2.5 text-right text-slate-300 font-mono">{formatCurrency(keyword.cpc)}</td>
                            <td className="py-2.5 text-right text-slate-300 font-mono">
                              {formatCompactCurrency(keyword.estimated_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyHint />
                  )}
                </SectionCard>
              </div>

              {/* (6) AI referrals */}
              <SectionCard title="AI referrals" badge="Tỷ trọng trong AI traffic (%)">
                {aiTrends.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="py-2 text-left font-bold">Assistant</th>
                        <th className="py-2 text-right font-bold">Mới nhất</th>
                        <th className="py-2 text-right font-bold">Thay đổi (điểm %)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiTrends.map((trend) => {
                        const sorted = [...trend.history].sort((a, b) => b.date.localeCompare(a.date));
                        const latest = sorted[0]?.value;
                        const previous = sorted[1]?.value;
                        const delta = latest != null && previous != null ? latest - previous : null;
                        return (
                          <tr key={trend.name} className="border-b border-slate-800/40 last:border-0">
                            <td className="py-2.5 text-slate-200 font-medium">{trend.name}</td>
                            <td className="py-2.5 text-right text-slate-300 font-mono">
                              {latest == null ? '—' : `${latest.toFixed(1)}%`}
                            </td>
                            <td className="py-2.5 text-right font-mono text-xs">
                              {delta == null ? (
                                <span className="text-slate-600">—</span>
                              ) : delta >= 0 ? (
                                <span className="text-emerald-400">+{delta.toFixed(1)} pt</span>
                              ) : (
                                <span className="text-rose-400">{delta.toFixed(1)} pt</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <EmptyHint text="Chưa có dữ liệu referral từ AI assistants." />
                )}
              </SectionCard>

              {/* Dữ liệu mở rộng — 5 panel click-to-load (tốn credits, không
                  bao giờ tự fetch; mỗi panel tự quản trạng thái của mình) */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-white font-medium text-sm">Dữ liệu mở rộng</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Các panel dưới đây gọi API bên ngoài và tốn credits — chỉ tải khi bạn bấm mở từng panel.
                  </p>
                </div>
                <WhoisPanel domain={row.domain} missingKey={missingWhois} />
                <TrustpilotPanel domain={row.domain} missingKey={missingTrustpilot} />
                <SerankingPanel domain={row.domain} missingKey={missingSeranking} />
                <AdsPanel domain={row.domain} missingKey={missingSerpApi} />
                <ReferringSitesPanel domain={row.domain} missingKey={missingTabApi} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
