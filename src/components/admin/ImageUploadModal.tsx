'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, X } from 'lucide-react';
import { slugifyFileName } from '@/lib/file-name';

interface ImageUploadModalProps {
  file: File | null;
  uploading?: boolean;
  showAlt?: boolean;
  onConfirm: (values: { filename: string; alt: string }) => void;
  onCancel: () => void;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ImageUploadModal({
  file,
  uploading = false,
  showAlt = false,
  onConfirm,
  onCancel,
}: ImageUploadModalProps) {
  const [filename, setFilename] = useState('');
  const [alt, setAlt] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) return;
    setFilename(slugifyFileName(file.name));
    setAlt('');
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, uploading, onCancel]);

  if (!file) return null;

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const slug = slugifyFileName(filename);
  const finalName = slug ? `${slug}${ext ? `.${ext}` : ''}` : file.name;

  const submit = () => {
    if (uploading) return;
    onConfirm({ filename: slug, alt: alt.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !uploading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload image"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <ImageIcon size={16} className="text-amber-400" /> Upload Image
          </h3>
          <button type="button" onClick={onCancel} disabled={uploading} className="text-slate-400 hover:text-white disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
            {previewUrl && (
              <img src={previewUrl} alt="Selected image preview" className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-white font-semibold truncate">{file.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{file.type || 'image'} • {formatSize(file.size)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">SEO file name</label>
            <input
              type="text"
              autoFocus
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. gohighlevel-crm-review"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1.5 break-all">
              Saved as: <span className="text-amber-300 font-mono">/uploads/{finalName}</span>
            </p>
          </div>

          {showAlt && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alt text <span className="text-slate-500 font-normal">(recommended for SEO &amp; accessibility)</span>
              </label>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Describe what the image shows"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-200 to-yellow-500 text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading && <Loader2 size={13} className="animate-spin" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
