'use client';

// SE Ranking panel — hai nút tải riêng biệt (mỗi nút tốn credits):
//  - GET /api/v1/cms/traffic/seranking/ads?domain=          (mẫu quảng cáo)
//  - GET /api/v1/cms/traffic/seranking/competitors?domain=  (đối thủ quảng cáo)
// Cả hai trả soft slice { data, error } HTTP-200 — UI phải check .error trước
// khi render. Panel bắt đầu thu gọn; mở header chỉ hiển thị 2 nút tải — dữ liệu
// chỉ về khi người dùng bấm nút (credit-conscious, never auto-fetch).

import { useState } from 'react';
import { formatNumber } from '@/lib/traffic/format';
import type {
  SeRankingAdKeyword,
  SeRankingAdsResponse,
  SeRankingCompetitor,
  SeRankingCompetitorsResponse,
} from '@/types/traffic';
import { sliceMessage, trafficFetch } from '../traffic-helpers';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface SerankingPanelProps {
  domain: string;
  missingKey: boolean;
}

const BLOCK_LABELS: Record<string, string> = { top: 'Trên cùng', bottom: 'Cuối trang' };

type SubLoad = 'idle' | 'loading' | 'error' | 'ready' | 'empty';

export default function SerankingPanel({ domain, missingKey }: SerankingPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <PanelCard
      title="SE Ranking"
      description="Mẫu quảng cáo Google và đối thủ cạnh tranh theo cơ sở dữ liệu us — mỗi lần tải tốn credits."
      badge="SE Ranking"
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
    >
      {missingKey ? (
        <PanelMissingKey />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AdsSection domain={domain} />
          <CompetitorsSection domain={domain} />
        </div>
      )}
    </PanelCard>
  );
}

function AdsSection({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<SubLoad>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ads, setAds] = useState<SeRankingAdKeyword[]>([]);

  async function load() {
    setPhase('loading');
    setErrorMessage(null);
    const result = await trafficFetch<SeRankingAdsResponse>(`/api/v1/cms/traffic/seranking/ads?domain=${encodeURIComponent(domain)}`);
    if (!result.ok) {
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    const error = sliceMessage(result.data.ads);
    if (error) {
      setErrorMessage(error);
      setPhase('error');
      return;
    }
    const rows = result.data.ads?.data ?? [];
    setAds(rows);
    setPhase(rows.length ? 'ready' : 'empty');
  }

  return (
    <div>
      <h5 className="text-xs font-semibold text-slate-300 mb-2">Mẫu quảng cáo &amp; trang đích</h5>
      {phase === 'idle' && (
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all cursor-pointer"
        >
          Tải mẫu quảng cáo
        </button>
      )}
      {phase === 'loading' && <PanelLoading text="Đang tải mẫu quảng cáo từ SE Ranking…" />}
      {phase === 'error' && errorMessage && <PanelError message={errorMessage} onRetry={() => void load()} />}
      {phase === 'empty' && <PanelEmpty text="SE Ranking chưa ghi nhận mẫu quảng cáo nào cho tên miền này." />}
      {phase === 'ready' && (
        <ul aria-label="Mẫu quảng cáo" className="space-y-2">
          {ads.map((ad, index) => (
            <li key={`${index}-${ad.keyword ?? ''}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <div className="flex flex-wrap items-baseline gap-2 mb-1">
                <span className="font-bold text-white">{ad.keyword ?? '—'}</span>
                {ad.block && (
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                    {BLOCK_LABELS[ad.block] ?? ad.block}
                  </span>
                )}
                {ad.position != null && <span className="text-slate-500">Vị trí {ad.position}</span>}
              </div>
              <p className="text-slate-300 break-words">{ad.snippet_title ?? '—'}</p>
              <p className="font-mono text-[10px] text-slate-500 break-all">{ad.snippet_display_url ?? '—'}</p>
              <p className="text-[11px] text-slate-500 break-all mt-1">Trang đích: {ad.url ?? '—'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CompetitorsSection({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<SubLoad>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<SeRankingCompetitor[]>([]);

  async function load() {
    setPhase('loading');
    setErrorMessage(null);
    const result = await trafficFetch<SeRankingCompetitorsResponse>(
      `/api/v1/cms/traffic/seranking/competitors?domain=${encodeURIComponent(domain)}`
    );
    if (!result.ok) {
      setErrorMessage(result.message);
      setPhase('error');
      return;
    }
    const error = sliceMessage(result.data.competitors);
    if (error) {
      setErrorMessage(error);
      setPhase('error');
      return;
    }
    const rows = result.data.competitors?.data ?? [];
    setCompetitors(rows);
    setPhase(rows.length ? 'ready' : 'empty');
  }

  return (
    <div>
      <h5 className="text-xs font-semibold text-slate-300 mb-2">Đối thủ quảng cáo</h5>
      {phase === 'idle' && (
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all cursor-pointer"
        >
          Tải đối thủ quảng cáo
        </button>
      )}
      {phase === 'loading' && <PanelLoading text="Đang tải danh sách đối thủ từ SE Ranking…" />}
      {phase === 'error' && errorMessage && <PanelError message={errorMessage} onRetry={() => void load()} />}
      {phase === 'empty' && <PanelEmpty text="Chưa phát hiện đối thủ quảng cáo nào cho tên miền này." />}
      {phase === 'ready' && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 text-left font-bold">Tên miền</th>
              <th className="py-1.5 text-right font-bold">Từ khóa chung</th>
              <th className="py-1.5 text-right font-bold">Liên quan</th>
              <th className="py-1.5 text-right font-bold">Traffic</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor, index) => (
              <tr key={`${index}-${competitor.domain ?? ''}`} className="border-b border-slate-800/40 last:border-0">
                <td className="py-2 text-slate-200 break-all">{competitor.domain ?? '—'}</td>
                <td className="py-2 text-right text-slate-300 font-mono">{formatNumber(competitor.common_keywords)}</td>
                <td className="py-2 text-right text-slate-300 font-mono">{formatNumber(competitor.domain_relevance)}</td>
                <td className="py-2 text-right text-slate-300 font-mono">{formatNumber(competitor.traffic_sum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
