'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

interface SearchReplacePanelProps {
  editor: Editor;
  onClose: () => void;
}

export default function SearchReplacePanel({ editor, onClose }: SearchReplacePanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    editor.commands.setSearchTerm(searchTerm);
    const storage = editor.storage.searchAndReplace;
    setMatchCount(storage.results.length);
    setCurrentIndex(storage.currentIndex);
    // Chạy lại khi editor unmount thì tự dọn (đóng panel = xoá highlight)
    return () => {
      editor.commands.setSearchTerm('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, editor]);

  const refreshCount = () => {
    const storage = editor.storage.searchAndReplace;
    setMatchCount(storage.results.length);
    setCurrentIndex(storage.currentIndex);
  };

  const goNext = () => {
    editor.commands.goToSearchResult('next');
    refreshCount();
  };
  const goPrev = () => {
    editor.commands.goToSearchResult('prev');
    refreshCount();
  };
  const replaceOne = () => {
    editor.commands.replaceCurrentResult(replaceTerm);
    refreshCount();
  };
  const replaceAll = () => {
    editor.commands.replaceAllResults(replaceTerm);
    refreshCount();
  };
  const handleClose = () => {
    editor.commands.setSearchTerm('');
    onClose();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 bg-slate-900/80 px-2 py-1.5">
      <input
        autoFocus
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') goNext();
          if (e.key === 'Escape') handleClose();
        }}
        placeholder="Tìm..."
        className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 w-32"
      />
      <span className="text-[10px] text-slate-500 w-14 shrink-0">
        {matchCount > 0 ? `${currentIndex + 1}/${matchCount}` : '0/0'}
      </span>
      <button type="button" onClick={goPrev} disabled={!matchCount} title="Kết quả trước" className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30">
        <ChevronUp size={14} />
      </button>
      <button type="button" onClick={goNext} disabled={!matchCount} title="Kết quả sau" className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30">
        <ChevronDown size={14} />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-1" />

      <input
        type="text"
        value={replaceTerm}
        onChange={(e) => setReplaceTerm(e.target.value)}
        placeholder="Thay bằng..."
        className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 w-32"
      />
      <button
        type="button"
        onClick={replaceOne}
        disabled={!matchCount}
        className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30"
      >
        Thay
      </button>
      <button
        type="button"
        onClick={replaceAll}
        disabled={!matchCount}
        className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30"
      >
        Thay tất cả
      </button>

      <button type="button" onClick={handleClose} title="Đóng" className="ml-auto p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}
