'use client';

import React, { useEffect, useState } from 'react';
import { Star, Zap, ExternalLink, ShieldCheck, Clock, Award } from 'lucide-react';

interface TopPick {
  id: number;
  name: string;
  baseUrl: string;
  commission: string;
  cookie: string;
}

export default function TopPicksWidget() {
  const [picks, setPicks] = useState<TopPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/public/top-picks')
      .then((r) => r.json())
      .then((d) => {
        if (d.status === 'success') setPicks(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || picks.length === 0) return null;

  return (
    <section className="my-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl md:text-2xl font-bold text-white">Top Recommended Deals (Editor's Choice)</h2>
        </div>
        <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          Verified Offers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {picks.map((pick, idx) => (
          <div
            key={pick.id}
            className="group relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 hover:border-amber-500/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
          >
            {/* Ribbon Badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
              <Star size={10} fill="currentColor" /> Rank #{idx + 1}
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 mb-4 shadow-inner">
                <Zap size={22} />
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                {pick.name}
              </h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 w-max">
                  <ShieldCheck size={14} /> {pick.commission || 'Exclusive Offer'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} className="text-slate-500" /> Cookie Window: <span className="text-slate-200">{pick.cookie || '30 Days'}</span>
                </div>
              </div>
            </div>

            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${pick.id}`}
              rel="nofollow sponsored"
              target="_blank"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <span>Claim Deal & Start</span>
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
