'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';

interface BreakingNewsTickerProps {
  newsText?: string;
  newsLink?: string;
}

export default function BreakingNewsTicker({
  newsText = 'Apple chính thức công bố chip M4 Max thế hệ mới với hiệu suất xử lý AI tăng gấp 3 lần.',
  newsLink = '/article/case-study-faceless-youtube-automation-ai-avatars',
}: BreakingNewsTickerProps) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-transparent border border-slate-800/80 shadow-lg mb-8">
      <div className="flex items-center space-x-3 overflow-hidden">
        <span className="bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg shrink-0 flex items-center gap-1.5 shadow-md">
          <Flame size={14} className="animate-pulse" /> Tin Nóng
        </span>
        <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
          {newsText}
        </p>
      </div>
      <Link
        href={newsLink}
        className="hidden sm:inline-flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline shrink-0 ml-4"
      >
        <span>Chi tiết</span>
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
