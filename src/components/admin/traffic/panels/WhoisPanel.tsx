'use client';

// Whois panel — GET /api/v1/cms/traffic/whois?domain= (soft slice { data, error }).
// Click-to-load: fetch fires only when the user expands the panel. The
// "Xem lịch sử" sub-load (GET /whois/history) is a second explicit click.

import { useState } from 'react';
import { History } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/traffic/format';
import { WHOIS_FIELD_LABELS, WHOIS_PRIVACY_STATE_LABELS } from '@/lib/traffic/whois-insights';
import type { WhoisChangeEvent, WhoisHistory, WhoisRecord } from '@/types/traffic';
import { sliceMessage, trafficFetch } from '../traffic-helpers';
import { PanelCard, PanelEmpty, PanelError, PanelLoading, PanelMissingKey } from './panel-shell';

interface WhoisPanelProps {
  domain: string;
  missingKey: boolean;
}

interface SliceBody<T> {
  whois?: { data: T | null; error: { code: string; message: string } | null };
  history?: { data: WhoisHistory | null; error: { code: string; message: string } | null };
}

function privacyLabel(record: WhoisRecord): string {
  if (record.privacy_protected === true) return 'Đã phát hiện';
  if (record.privacy_protected === false) return 'Không phát hiện';
  return 'Chưa rõ';
}

function TextList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return <p className="text-xs text-slate-500">{label}: —</p>;
  return (
    <div>
      <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">{label}</h5>
      <ul aria-label={label} className="space-y-1">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="break-all font-mono text-[11px] text-slate-300">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistorySection({ domain }: { domain: string }) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<WhoisHistory | null>(null);

  async function load() {
    if (phase === 'loading') return;
    setPhase('loading');
    setMessage(null);
    const result = await trafficFetch<SliceBody<never>>(`/api/v1/cms/traffic/whois/history?domain=${encodeURIComponent(domain)}`);
    if (!result.ok) {
      setMessage(result.message);
      setPhase('error');
      return;
    }
    const slice = result.data.history;
    const error = sliceMessage(slice);
    if (error) {
      setMessage(error);
      setPhase('error');
      return;
    }
    setHistory(slice?.data ?? null);
    setPhase('ready');
  }

  function eventValue(event: WhoisChangeEvent, value: string | null): string {
    if (value === null) return '—';
    if (event.field !== 'privacy') return value;
    return value === 'private' || value === 'public' ? WHOIS_PRIVACY_STATE_LABELS[value] : '—';
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/60">
      <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Lịch sử thay đổi</h5>
      <p className="text-[11px] text-slate-500 mb-2">
        Lịch sử WHOIS tốn credits của tài khoản WhoisXML — chỉ tải khi bạn bấm nút.
      </p>
      {phase === 'idle' && (
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all cursor-pointer"
        >
          <History size={12} /> Tải lịch sử domain
        </button>
      )}
      {phase === 'loading' && <PanelLoading text="Đang tải lịch sử WHOIS…" />}
      {phase === 'error' && message && <PanelError message={message} onRetry={() => void load()} />}
      {phase === 'ready' && (
        history ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              {formatNumber(history.summary.records)} bản ghi · {formatNumber(history.summary.changes_total)} thay đổi đăng ký
            </p>
            {history.events.length ? (
              <ul aria-label="Dòng thời gian thay đổi" className="space-y-1.5">
                {history.events.map((event, index) => (
                  <li key={`${index}-${event.date}-${event.field}`} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-300">
                    <span className="text-slate-500">{formatDate(event.date)}</span> · {WHOIS_FIELD_LABELS[event.field]}:{' '}
                    {eventValue(event, event.from)} → {eventValue(event, event.to)}
                  </li>
                ))}
              </ul>
            ) : (
              <PanelEmpty text="Không ghi nhận thay đổi nào." />
            )}
            {history.events_truncated && (
              <p className="text-[11px] text-slate-500">Chỉ hiển thị các thay đổi gần nhất; các thay đổi cũ hơn đã được lược bớt.</p>
            )}
          </div>
        ) : (
          <PanelEmpty text="WhoisXML chưa có lịch sử WHOIS cho tên miền này." />
        )
      )}
    </div>
  );
}

export default function WhoisPanel({ domain, missingKey }: WhoisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [record, setRecord] = useState<WhoisRecord | null>(null);

  async function load() {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    const result = await trafficFetch<SliceBody<WhoisRecord>>(`/api/v1/cms/traffic/whois?domain=${encodeURIComponent(domain)}`);
    if (!result.ok) {
      setErrorMessage(result.message);
    } else {
      const error = sliceMessage(result.data.whois);
      if (error) setErrorMessage(error);
      else setRecord(result.data.whois?.data ?? null);
    }
    setLoading(false);
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    // Click-to-load: only the first expand fetches (never auto-fetch on render).
    if (next && !loading && errorMessage === null && record === null && !missingKey) {
      void load();
    }
  }

  const hasData = record !== null;
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
      title="Tuổi thọ & lịch sử domain (WhoisXML)"
      description="Tuổi domain, nhà đăng ký, ngày tạo/hết hạn, trạng thái, name server và dấu hiệu ẩn danh."
      badge="WhoisXML"
      expanded={expanded}
      onToggle={toggle}
      disabled={false}
    >
      {phase === 'loading' && <PanelLoading text="Đang tải thông tin WHOIS…" />}
      {phase === 'error' && errorMessage && <PanelError message={errorMessage} onRetry={() => void load()} />}
      {phase === 'missing' && <PanelMissingKey />}
      {phase === 'empty' && <PanelEmpty text="WhoisXML chưa có dữ liệu WHOIS cho tên miền này." />}
      {phase === 'ready' && record && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MiniInfo label="Tuổi domain" value={record.age_years == null ? '—' : `${formatNumber(Math.round(record.age_years * 10) / 10)} năm`} hint={record.age_verdict?.label ?? null} />
            <MiniInfo label="Nhà đăng ký" value={record.registrar ?? '—'} />
            <MiniInfo label="Ngày tạo" value={formatDate(record.created_date)} />
            <MiniInfo label="Cập nhật lần cuối" value={formatDate(record.updated_date)} />
            <MiniInfo label="Ngày hết hạn" value={formatDate(record.expires_date)} />
            <MiniInfo label="Quyền riêng tư" value={privacyLabel(record)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextList label="Name server" items={record.name_servers} />
            <TextList label="Trạng thái" items={record.status} />
          </div>
        </div>
      )}
      <HistorySection domain={domain} />
    </PanelCard>
  );
}

function MiniInfo({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 truncate">{label}</p>
      <p className="text-sm font-bold text-white break-words" title={value}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}
