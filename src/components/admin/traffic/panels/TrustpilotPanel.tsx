'use client';

// Trustpilot panel — GET /api/v1/cms/traffic/trustpilot?domain= (soft slice
// { data, error }). Click-to-load: chỉ fetch khi người dùng mở panel.

import { useState } from 'react';
import { Star } from 'lucide-react';
import { formatDateTime, formatNumber } from '@/lib/traffic/format';
import type { TrustpilotRatingBucket, TrustpilotResult } from '@/types/traffic';
import { sliceMessage, trafficFetch } from '../traffic-helpers';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface TrustpilotPanelProps {
  domain: string;
  missingKey: boolean;
}

type SliceBody = { trustpilot?: { data: TrustpilotResult | null; error: { code: string; message: string } | null } };

function StarBoxes({ score }: { score: number | null }) {
  if (score == null) return null;
  const rounded = Math.round(score);
  return (
    <span role="img" aria-label={`Điểm ${formatNumber(Math.round(score * 10) / 10)} trên 5`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= rounded ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
        />
      ))}
    </span>
  );
}

function RatingDistribution({ buckets }: { buckets: TrustpilotRatingBucket[] }) {
  const rows = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: buckets.find((bucket) => bucket.stars === stars)?.percent ?? 0,
  }));
  return (
    <ul aria-label="Phân bố đánh giá" className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <li key={row.stars} className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-10 shrink-0">{row.stars} sao</span>
          <span className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-amber-400"
              style={{ width: `${Math.min(Math.max(row.percent, 0), 100)}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right font-mono">{formatNumber(row.percent)}%</span>
        </li>
      ))}
    </ul>
  );
}

export default function TrustpilotPanel({ domain, missingKey }: TrustpilotPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TrustpilotResult | null>(null);

  async function load() {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    const res = await trafficFetch<SliceBody>(`/api/v1/cms/traffic/trustpilot?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) {
      setErrorMessage(res.message);
    } else {
      const error = sliceMessage(res.data.trustpilot);
      if (error) setErrorMessage(error);
      else setResult(res.data.trustpilot?.data ?? null);
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

  const profile = result?.profile ?? null;
  const business = profile?.business ?? null;
  const hasData = business !== null;
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
      title="Đánh giá Trustpilot"
      description="TrustScore, số đánh giá, danh mục và phân bố sao của hồ sơ Trustpilot."
      badge="Trustpilot"
      expanded={expanded}
      onToggle={toggle}
    >
      {phase === 'loading' && <PanelLoading text="Đang tải đánh giá Trustpilot… có thể mất tới khoảng một phút." />}
      {phase === 'error' && errorMessage && <PanelError message={errorMessage} onRetry={() => void load()} />}
      {phase === 'missing' && <PanelMissingKey />}
      {phase === 'empty' && <PanelEmpty text="Chưa có hồ sơ Trustpilot cho tên miền này." />}
      {phase === 'ready' && business && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h5 className="text-base font-bold text-white break-words">{business.name}</h5>
            <span className="text-sm text-slate-300 font-mono">
              {business.trust_score == null ? '—' : formatNumber(Math.round(business.trust_score * 10) / 10)}
            </span>
            <StarBoxes score={business.stars ?? business.trust_score} />
            <span className="text-xs text-slate-400">{formatNumber(business.review_count)} đánh giá</span>
          </div>
          {business.categories?.length ? (
            <p className="text-xs text-slate-500">Danh mục: {business.categories.join(' › ')}</p>
          ) : null}
          {business.rating_distribution?.length ? <RatingDistribution buckets={business.rating_distribution} /> : null}
          {result?.fetched_at && (
            <p className="text-[11px] text-slate-500">
              Nguồn: Trustpilot qua scraper nội bộ · Cập nhật {formatDateTime(result.fetched_at)}
            </p>
          )}
        </div>
      )}
    </PanelCard>
  );
}
