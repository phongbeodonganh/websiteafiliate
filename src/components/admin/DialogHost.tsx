'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { closeDialog, subscribeDialogs, type DialogRequest, type DialogVariant } from '@/lib/dialog';

const VARIANT_STYLE: Record<DialogVariant, { icon: typeof Info; color: string; title: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-400', title: 'Success' },
  error: { icon: AlertCircle, color: 'text-rose-400', title: 'Something went wrong' },
  info: { icon: Info, color: 'text-amber-400', title: 'Enter a value' },
  danger: { icon: AlertTriangle, color: 'text-rose-400', title: 'Please confirm' },
};

function DialogView({ request }: { request: DialogRequest }) {
  const [value, setValue] = useState(request.kind === 'prompt' ? request.defaultValue : '');
  const { icon: Icon, color, title } = VARIANT_STYLE[request.variant];
  const isDanger = request.variant === 'danger';

  const cancel = () => {
    if (request.kind === 'confirm') request.resolve(false);
    else if (request.kind === 'prompt') request.resolve(null);
    else request.resolve();
    closeDialog(request.id);
  };

  const confirm = () => {
    if (request.kind === 'confirm') request.resolve(true);
    else if (request.kind === 'prompt') request.resolve(value);
    else request.resolve();
    closeDialog(request.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
      else if (e.key === 'Enter' && request.kind !== 'prompt') confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const confirmLabel =
    request.kind === 'alert' ? 'OK' : request.confirmLabel || (isDanger ? 'Delete' : 'Confirm');

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        role={request.kind === 'alert' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Icon size={16} className={color} /> {request.title || title}
          </h3>
          <button type="button" onClick={cancel} aria-label="Close" className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line break-words">{request.message}</p>
          {request.kind === 'prompt' && (
            <input
              type="text"
              autoFocus
              value={value}
              placeholder={request.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirm();
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          {request.kind !== 'alert' && (
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            autoFocus={request.kind !== 'prompt'}
            onClick={confirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              isDanger
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  useEffect(() => subscribeDialogs(setQueue), []);

  // One dialog at a time; the rest wait their turn.
  const current = queue[0];
  return current ? <DialogView key={current.id} request={current} /> : null;
}
