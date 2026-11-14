'use client';

// Shared shell for the five click-to-load extended panels in the traffic detail
// modal. Credit-conscious: a panel NEVER fetches on render — data loads only
// when the user expands it (and each panel owns its first-load trigger). All
// four body states (loading / error / missing-key / data) render Vietnamese copy.

import { ChevronDown, Loader2 } from 'lucide-react';

interface PanelCardProps {
  title: string;
  description?: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function PanelCard({ title, description, badge, expanded, onToggle, disabled, children }: PanelCardProps) {
  return (
    <div className="rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
            {title}
            {badge && (
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {badge}
              </span>
            )}
          </h4>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && <div className="px-5 pb-5 pt-4 border-t border-slate-800/60">{children}</div>}
    </div>
  );
}

export function PanelLoading({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-400 py-2">
      <Loader2 size={15} className="animate-spin" /> {text}
    </p>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/40 transition-all cursor-pointer"
      >
        Thử lại
      </button>
    </div>
  );
}

export function PanelMissingKey() {
  return (
    <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-400">
      Chưa cấu hình key — vào tab Quản lý cấu hình
    </p>
  );
}

export function PanelEmpty({ text }: { text: string }) {
  return <p className="text-xs text-slate-500 py-3 text-center">{text}</p>;
}
