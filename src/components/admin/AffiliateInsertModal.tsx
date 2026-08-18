'use client';

import { useMemo, useState } from 'react';
import { Search, X, Link2, MousePointerClick } from 'lucide-react';

interface AffiliateLinkOption {
  id: string;
  name: string;
  commission?: string;
  cookie?: string;
}

interface AffiliateInsertModalProps {
  open: boolean;
  onClose: () => void;
  affiliateLinks: AffiliateLinkOption[];
  articleId?: string;
  onInsert: (html: string) => void;
}

type Template = 'inline' | 'cta';

export default function AffiliateInsertModal({
  open,
  onClose,
  affiliateLinks,
  articleId,
  onInsert,
}: AffiliateInsertModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [template, setTemplate] = useState<Template>('inline');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return affiliateLinks;
    return affiliateLinks.filter((l) => l.name.toLowerCase().includes(q));
  }, [affiliateLinks, search]);

  if (!open) return null;

  const selectedLink = affiliateLinks.find((l) => l.id === selectedId);
  const canInsert = Boolean(articleId && selectedLink);

  const handleInsert = () => {
    if (!canInsert || !selectedLink || !articleId) return;

    const href = `/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${selectedLink.id}`;
    const dataAttrs = `data-affiliate-id="${selectedLink.id}" data-article-id="${articleId}" rel="nofollow sponsored" target="_blank"`;

    const html =
      template === 'inline'
        ? `<a href="${href}" ${dataAttrs}>${selectedLink.name}</a>`
        : `<div class="my-8 flex flex-col items-center justify-center p-6 bg-[#0056B3]/10 border border-[#0056B3]/30 rounded-2xl text-center"><p class="font-bold text-[#0056B3] text-lg mb-2">🔥 Recommended Offer (${selectedLink.name}):</p><p class="text-xs text-slate-500 mb-4">Commission: ${selectedLink.commission || 'Exclusive'} • Cookie: ${selectedLink.cookie || '30 Days'}</p><a href="${href}" ${dataAttrs} class="affiliate-btn inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-200 bg-[#FF6B6B] hover:bg-[#ff5252] rounded-full hover:scale-105 shadow-md shadow-rose-500/20">👉 Claim Offer On ${selectedLink.name}</a></div>`;

    onInsert(html);
    setSelectedId('');
    setSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Link2 size={16} className="text-amber-400" /> Chèn Affiliate
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!articleId && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              Lưu bài viết trước khi chèn liên kết affiliate có theo dõi.
            </div>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm affiliate link theo tên..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Không tìm thấy affiliate link nào.</p>
            )}
            {filtered.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => setSelectedId(link.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  selectedId === link.id
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold">{link.name}</div>
                <div className="text-[10px] text-slate-500">
                  Commission: {link.commission || 'N/A'} • Cookie: {link.cookie || 'N/A'}
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kiểu chèn</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('inline')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  template === 'inline'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Link2 size={13} /> Link chữ inline
              </button>
              <button
                type="button"
                onClick={() => setTemplate('cta')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  template === 'cta'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MousePointerClick size={13} /> Nút CTA
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!canInsert}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Chèn
          </button>
        </div>
      </div>
    </div>
  );
}
