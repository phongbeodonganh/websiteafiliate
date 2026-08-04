'use client';

import React, { useEffect, useState } from 'react';
import { Star, Zap, ExternalLink, ShieldCheck, Clock, Award } from 'lucide-react';

interface TopPick {
  id: string | number;
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
          <Award className="w-5 h-5 text-[#0056B3]" />
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Top Recommended AI Deals (Editor's Choice)</h2>
        </div>
        <span className="text-xs text-[#20C997] font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
          ✓ Verified Offers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {picks.map((pick, idx) => (
          <div
            key={pick.id}
            className="group relative bg-white rounded-2xl border border-slate-100 p-6 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 shadow-sm flex flex-col justify-between"
          >
            {/* Ribbon Badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Star size={10} fill="currentColor" /> Rank #{idx + 1}
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#0056B3] mb-4 shadow-sm">
                <Zap size={22} />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#0056B3] transition-colors">
                {pick.name}
              </h3>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/80 w-max">
                  <ShieldCheck size={14} className="text-[#20C997]" /> {pick.commission || 'Exclusive Offer'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} className="text-slate-400" /> Cookie Window: <span className="text-slate-700 font-medium">{pick.cookie || '30 Days'}</span>
                </div>
              </div>
            </div>

            {/* Coral Orange (#FF6B6B) Primary CTA for maximum Conversion CTR */}
            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${pick.id}`}
              rel="nofollow sponsored"
              target="_blank"
              className="w-full py-3.5 rounded-xl bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 hover:scale-[1.02] transition-all cursor-pointer"
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
