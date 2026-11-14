'use client';

// Cấu hình credentials cho Traffic Intelligence (TRF-01). Chỉ lưu/sửa trên máy
// chủ qua PUT /api/v1/cms/traffic/config; GET trả về giá trị đã che
// (••••••last4) + nguồn (db|env) — UI không bao giờ hiển thị key nguyên vẹn.
// PUT chỉ gửi các trường người dùng thực sự thay đổi: input để trống = không đổi
// (mirror gemini UX "Để trống nếu không đổi"); nút X là clear tường minh.

import { useState } from 'react';
import { ChevronDown, KeyRound, Loader2, X } from 'lucide-react';
import { trafficFetch, type TrafficConfigData, type TrafficConfigKey } from './traffic-helpers';

interface TrafficSettingsCardProps {
  config: TrafficConfigData | null;
  onSaved: (config: TrafficConfigData) => void;
  onToast: (type: 'success' | 'error', text: string) => void;
}

interface FieldSpec {
  key: TrafficConfigKey;
  label: string;
  placeholder: string;
  secret: boolean;
}

const FIELDS: FieldSpec[] = [
  { key: 'tabApiKey', label: 'TabAPI key', placeholder: 'Dán TabAPI key mới', secret: true },
  { key: 'serpApiKey', label: 'SerpApi key', placeholder: 'Dán SerpApi key mới', secret: true },
  { key: 'whoisApiKey', label: 'WhoisXML key', placeholder: 'Dán WhoisXML key mới', secret: true },
  { key: 'seRankingApiKey', label: 'SE Ranking key', placeholder: 'Dán SE Ranking key mới', secret: true },
  {
    key: 'trustpilotScraperUrl',
    label: 'Trustpilot scraper URL',
    placeholder: 'https://scraper.example.com',
    secret: false,
  },
];

const MONTH_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function SourceChip({ source }: { source: TrafficConfigData['source'][TrafficConfigKey] }) {
  if (source === 'db') {
    return (
      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
        Đã lưu
      </span>
    );
  }
  if (source === 'env') {
    return (
      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
        Từ env
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold text-slate-500">
      Chưa có
    </span>
  );
}

export default function TrafficSettingsCard({ config, onSaved, onToast }: TrafficSettingsCardProps) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [values, setValues] = useState<Record<TrafficConfigKey, string>>({
    tabApiKey: '',
    serpApiKey: '',
    whoisApiKey: '',
    seRankingApiKey: '',
    trustpilotScraperUrl: '',
  });
  const [cleared, setCleared] = useState<Record<TrafficConfigKey, boolean>>({
    tabApiKey: false,
    serpApiKey: false,
    whoisApiKey: false,
    seRankingApiKey: false,
    trustpilotScraperUrl: false,
  });
  const [monthsOverride, setMonthsOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Collapsed by default once every credential is configured; auto-expanded
  // while something is still missing (guidance state).
  const autoOpen = config == null || config.missing.length > 0;
  const isOpen = open ?? autoOpen;

  // The select follows the saved config until the user explicitly overrides it.
  const months = monthsOverride ?? String(config?.months ?? 3);

  const anyConfigured = Boolean(config && config.missing.length < 5);

  function setValue(key: TrafficConfigKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (value !== '') setCleared((prev) => ({ ...prev, [key]: false }));
  }

  function clearField(key: TrafficConfigKey) {
    setValues((prev) => ({ ...prev, [key]: '' }));
    setCleared((prev) => ({ ...prev, [key]: true }));
  }

  async function handleSave() {
    if (saving) return;
    const payload: Record<string, unknown> = {};
    for (const field of FIELDS) {
      if (cleared[field.key]) payload[field.key] = '';
      else if (values[field.key].trim() !== '') payload[field.key] = values[field.key].trim();
    }
    const parsedMonths = Number(months);
    if (Number.isInteger(parsedMonths) && parsedMonths >= 3 && parsedMonths <= 12) {
      if (!config || parsedMonths !== config.months) payload.months = parsedMonths;
    }

    if (Object.keys(payload).length === 0) {
      onToast('error', 'Không có thay đổi nào để lưu.');
      return;
    }

    setSaving(true);
    const result = await trafficFetch<{ status: string; data: TrafficConfigData }>('/api/v1/cms/traffic/config', {
      method: 'PUT',
      body: payload,
    });
    if (result.ok && result.data?.status === 'success') {
      onSaved(result.data.data);
      onToast('success', 'Đã lưu cấu hình traffic');
      setValues({ tabApiKey: '', serpApiKey: '', whoisApiKey: '', seRankingApiKey: '', trustpilotScraperUrl: '' });
      setCleared({ tabApiKey: false, serpApiKey: false, whoisApiKey: false, seRankingApiKey: false, trustpilotScraperUrl: false });
      setMonthsOverride(null);
      setOpen(false);
    } else {
      onToast('error', result.ok ? 'Không thể lưu cấu hình traffic.' : result.message);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800 shrink-0">
            <KeyRound size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-white text-sm">Cấu hình API</h3>
            <p className="text-xs text-slate-500 truncate">
              {anyConfigured
                ? 'Đã cấu hình một phần hoặc toàn bộ key — bấm để thay đổi.'
                : 'Nhập các key API để bật Traffic Intelligence.'}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-slate-800/60 pt-5 space-y-4">
          {FIELDS.map((field) => {
            const masked = config?.masked[field.key] ?? null;
            const source = config?.source[field.key] ?? null;
            return (
              <div key={field.key}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor={`traffic-${field.key}`} className="text-xs font-semibold text-slate-300">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-2">
                    {masked && (
                      <span className="font-mono text-[10px] text-slate-500" title="Giá trị đã lưu (được che)">
                        {masked}
                      </span>
                    )}
                    <SourceChip source={source} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`traffic-${field.key}`}
                    type={field.secret ? 'password' : 'text'}
                    value={values[field.key]}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    className="flex-1 bg-slate-950/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => clearField(field.key)}
                    disabled={!masked || saving}
                    aria-label={`Xóa ${field.label} đã lưu`}
                    title="Xóa key đã lưu trên máy chủ"
                    className="p-2.5 rounded-xl border border-slate-700/60 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          <div>
            <label htmlFor="traffic-months" className="text-xs font-semibold text-slate-300 block mb-1.5">
              Số tháng dữ liệu
            </label>
            <select
              id="traffic-months"
              value={months}
              onChange={(e) => setMonthsOverride(e.target.value)}
              className="bg-slate-950/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} tháng
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-500">Để trống nếu không đổi. Key chỉ được lưu trên máy chủ.</p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Lưu cấu hình
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
