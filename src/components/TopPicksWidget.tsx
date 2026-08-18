'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Clock, ExternalLink, ShieldCheck, Star, Zap } from 'lucide-react';

interface TopPick {
  id: string | number;
  name: string;
  baseUrl: string;
  commission: string;
  cookie: string;
}

interface TopPicksWidgetProps {
  variant?: 'default' | 'editorial';
  viewAllHref?: string;
}

export default function TopPicksWidget({ variant = 'default', viewAllHref }: TopPicksWidgetProps) {
  const [picks, setPicks] = useState<TopPick[]>([]);
  const [loading, setLoading] = useState(true);
  const editorial = variant === 'editorial';

  useEffect(() => {
    fetch('/api/v1/public/top-picks')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'success') setPicks(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || picks.length === 0) return null;

  return (
    <section
      className={
        editorial
          ? 'relative bg-white border border-neutral-300 border-t-4 border-t-black px-6 md:px-8 py-8 shadow-sm animate-in fade-in duration-700'
          : 'my-12 animate-in fade-in duration-700'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-black" />
          <h2 className="text-xl md:text-2xl font-bold text-black uppercase font-['Plus_Jakarta_Sans']">
            Top Recommended AI Deals (Editor&apos;s Choice)
          </h2>
        </div>
        <span
          className={
            editorial
              ? 'text-xs text-black font-semibold bg-neutral-100 px-3 py-1 border border-black uppercase'
              : 'text-xs text-black font-semibold bg-neutral-100 px-3 py-1 border border-neutral-300'
          }
        >
          ✓ Verified Offers
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {picks.map((pick, index) => (
          <div
            key={pick.id}
            className={
              editorial
                ? 'clickable-card group relative cursor-pointer bg-white border border-neutral-300 p-6 flex flex-col justify-between'
                : 'clickable-card group relative cursor-pointer bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between'
            }
          >
            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${pick.id}`}
              rel="nofollow sponsored"
              target="_blank"
              className="card-stretched-link"
              aria-label={`View affiliate deal for ${pick.name}`}
            />
            <div
              className={
                editorial
                  ? 'absolute top-4 right-4 bg-black text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 flex items-center gap-1'
                  : 'absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm'
              }
            >
              <Star size={10} fill="currentColor" /> Rank #{index + 1}
            </div>

            <div>
              <div
                className={
                  editorial
                    ? 'w-12 h-12 bg-black border border-black flex items-center justify-center font-bold text-white mb-4'
                    : 'w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#0056B3] mb-4 shadow-sm'
                }
              >
                <Zap size={22} />
              </div>

              <h3 className={`text-lg font-bold text-slate-900 mb-2 ${editorial ? '' : 'group-hover:text-[#0056B3] transition-colors'}`}>
                {pick.name}
              </h3>

              <div className="space-y-2 mb-6">
                <div
                  className={
                    editorial
                      ? 'flex max-w-full items-center gap-2 break-words text-xs text-black font-semibold bg-white px-3 py-1 border border-black'
                      : 'flex max-w-full items-center gap-2 break-words text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/80'
                  }
                >
                  <ShieldCheck size={14} className={editorial ? 'text-black' : 'text-[#20C997]'} />
                  {pick.commission || 'Exclusive Offer'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} className="text-slate-400" /> Cookie Window:{' '}
                  <span className="text-slate-700 font-medium">{pick.cookie || '30 Days'}</span>
                </div>
              </div>
            </div>

            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${pick.id}`}
              rel="nofollow sponsored"
              target="_blank"
              className={
                editorial
                  ? 'w-full py-3.5 border border-black bg-black text-white font-bold text-xs flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:scale-[1.02] transition-transform duration-150 cursor-pointer'
                  : 'w-full py-3.5 rounded-xl bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 hover:scale-[1.02] transition-all cursor-pointer'
              }
            >
              <span>Claim Deal &amp; Start</span>
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
      {viewAllHref && (
        <div className="mt-6 flex justify-center">
          <Link
            href={viewAllHref}
            className="border border-black bg-black px-7 py-3 text-xs font-bold uppercase text-white transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
          >
            View all affiliate deals
          </Link>
        </div>
      )}
    </section>
  );
}
