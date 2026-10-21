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
  allowDirectLinks?: boolean;
  onInsert: (html: string) => void;
}

type Template = 'inline' | 'cta';

export default function AffiliateInsertModal({
  open,
  onClose,
  affiliateLinks,
  articleId,
  allowDirectLinks = false,
  onInsert,
}: AffiliateInsertModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [template, setTemplate] = useState<Template>('inline');
  const [directUrl, setDirectUrl] = useState('');
  const [label, setLabel] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return affiliateLinks;
    return affiliateLinks.filter((l) => l.name.toLowerCase().includes(q));
  }, [affiliateLinks, search]);

  if (!open) return null;

  const selectedLink = affiliateLinks.find((l) => l.id === selectedId);
  let validUrl = '';
  try {
    const url = new URL(directUrl.trim());
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) validUrl = url.href;
  } catch { }
  const canInsert = allowDirectLinks ? Boolean(validUrl && label.trim()) : Boolean(articleId && selectedLink);
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

  const handleInsert = () => {
    if (!canInsert) return;
    if (allowDirectLinks) {
      const html = `<a href="${escape(validUrl)}" rel="nofollow sponsored noopener noreferrer" target="_blank"${template === 'cta' ? ' class="affiliate-btn"' : ''}>${escape(label.trim())}</a>`;
      onInsert(template === 'cta' ? `<p>${html}</p>` : html);
      setDirectUrl(''); setLabel(''); onClose();
      return;
    }
    if (!selectedLink || !articleId) return;

    const href = `/api/v1/public/tracking/redirect?article_id=${articleId}&affiliate_link_id=${selectedLink.id}`;
    const dataAttrs = `data-affiliate-id="${selectedLink.id}" data-article-id="${articleId}" rel="nofollow sponsored" target="_blank"`;

    const html =
      template === 'inline'
        ? `<a href="${href}" ${dataAttrs}>${selectedLink.name}</a>`
        : `<div class="my-8 flex flex-col items-center justify-center p-6 bg-[#0056B3]/10 border border-[#0056B3]/30 rounded-2xl text-center"><p class="font-bold text-[#0056B3] text-lg mb-2">🔥 Ưu đãi đề xuất (${selectedLink.name}):</p><p class="text-xs text-slate-500 mb-4">Hoa hồng: ${selectedLink.commission || 'Độc quyền'} • Cookie: ${selectedLink.cookie || '30 ngày'}</p><a href="${href}" ${dataAttrs} class="affiliate-btn inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-200 bg-[#FF6B6B] hover:bg-[#ff5252] rounded-full hover:scale-105 shadow-md shadow-rose-500/20">👉 Xem ưu đãi tại ${selectedLink.name}</a></div>`;

    onInsert(html);
    setSelectedId('');
    setSearch('');
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="affiliate-insert-title" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); handleInsert(); }
    }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 id="affiliate-insert-title" className="text-white font-bold text-sm flex items-center gap-2">
            <Link2 size={16} className="text-amber-400" /> Chèn liên kết affiliate
          </h3>
          <button type="button" aria-label="Đóng cửa sổ chèn affiliate" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {allowDirectLinks ? <div className="space-y-3">
            <label className="block text-xs text-slate-300">URL affiliate<input type="url" value={directUrl} onChange={(event) => setDirectUrl(event.target.value)} placeholder="https://store.example.com/?ref=..." className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
            <label className="block text-xs text-slate-300">Chữ hiển thị / tên nút<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Xem ưu đãi tại cửa hàng" maxLength={200} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
            {directUrl && !validUrl && <p role="alert" className="text-xs text-rose-300">Nhập URL http/https hợp lệ.</p>}
            <p className="text-xs text-slate-400">Có thể chèn trước khi lưu. Lượt bấm được theo dõi sau khi xuất bản.</p>
          </div> : <>
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
              placeholder="Tìm liên kết affiliate theo tên..."
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
                  Hoa hồng: {link.commission || 'Chưa có'} • Cookie: {link.cookie || 'Chưa có'}
                </div>
              </button>
            ))}
          </div>
          </>}
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
                <Link2 size={13} /> Liên kết trong dòng
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
