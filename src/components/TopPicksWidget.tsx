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
    fetch('/api/v1/public/affiliates?sort=clicks&limit=4')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.data)) {
          setPicks(data.data.slice(0, 4));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading || picks.length === 0) return null;

  return (
    <section
      className={
        editorial
          ? 'relative h-full bg-white/[0.04] border border-white/15 px-5 py-6 md:px-7 md:py-8 text-white'
          : 'my-12'
      }
    >
      <div className={`flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b ${editorial ? 'border-white/15' : 'border-neutral-200'}`}>
        <div className="flex items-center gap-2">
          <Award className={`w-5 h-5 ${editorial ? 'text-[#85DDD5]' : 'text-black'}`} />
          <h2 className={`text-xl md:text-2xl font-bold uppercase font-['Plus_Jakarta_Sans'] ${editorial ? 'text-white' : 'text-black'}`}>
            {editorial ? 'Exclusive Affiliate Deals' : 'Hottest Affiliate Deals'}
          </h2>
        </div>
        <span
          className={
            editorial
              ? 'text-[10px] text-[#85DDD5] font-bold bg-[#85DDD5]/10 px-3 py-1 border border-[#85DDD5]/35 uppercase tracking-wider flex items-center gap-1'
              : 'text-xs text-black font-semibold bg-neutral-100 px-3 py-1 border border-neutral-300'
          }
        >
          ✓ Tested Deals
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${editorial ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
        {picks.map((pick, index) => (
          <div
            key={pick.id}
            data-motion="rise"
            style={{ '--motion-delay': `${index * 55}ms` } as React.CSSProperties}
            className={
              editorial
                ? 'clickable-card group relative cursor-pointer bg-white/[0.055] border border-white/15 p-5 flex flex-col justify-between transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-[#85DDD5]/65 hover:bg-white/[0.085] focus-within:border-[#85DDD5]/65 motion-reduce:transform-none motion-reduce:transition-none'
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
                    ? 'absolute top-4 right-4 bg-[#85DDD5] text-[#071211] font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 flex items-center gap-1'
                  : 'absolute top-4 right-4 bg-black text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm'
              }
            >
              <Star size={10} fill="currentColor" /> Pick #{index + 1}
            </div>

            <div>
              <div
                className={
                  editorial
                    ? 'w-11 h-11 bg-[#85DDD5]/10 border border-[#85DDD5]/35 flex items-center justify-center font-bold text-[#85DDD5] mb-4'
                    : 'w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#0056B3] mb-4 shadow-sm'
                }
              >
                <Zap size={22} />
              </div>

              <h3 className={`text-lg font-bold mb-2 transition-colors ${editorial ? 'text-white group-hover:text-[#85DDD5]' : 'text-slate-900 group-hover:text-[#0056B3]'}`}>
                {pick.name}
              </h3>

              <div className="space-y-2 mb-6">
                <div
                  className={
                    editorial
                      ? 'flex max-w-full items-center gap-2 break-words text-xs text-[#85DDD5] font-semibold bg-[#85DDD5]/10 px-3 py-1 border border-[#85DDD5]/25'
                      : 'flex max-w-full items-center gap-2 break-words text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/80'
                  }
                >
                  <ShieldCheck size={14} className={editorial ? 'text-[#85DDD5]' : 'text-[#20C997]'} />
                  {pick.commission || 'Exclusive Offer'}
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${editorial ? 'text-white/45' : 'text-slate-500'}`}>
                  <Clock size={12} className={editorial ? 'text-white/35' : 'text-slate-400'} /> Cookie Window:{' '}
                  <span className={`font-medium ${editorial ? 'text-white/70' : 'text-slate-700'}`}>{pick.cookie || '30 Days'}</span>
                </div>
              </div>
            </div>

            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${pick.id}`}
              rel="nofollow sponsored"
              target="_blank"
              className={editorial ? 'relative z-2 w-full flex items-center justify-center gap-2 bg-[#85DDD5] border border-[#85DDD5] px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#071211] transition-colors hover:bg-white hover:border-white' : 'verdict-cta w-full justify-center'}
            >
              <span>View Deal</span>
              <ExternalLink size={14} className="cta-arrow" />
            </a>
          </div>
        ))}
      </div>
      {viewAllHref && (
        <div className={`mt-6 flex ${editorial ? 'justify-start' : 'justify-center'}`}>
          <Link
            href={viewAllHref}
            className={editorial ? 'border border-white/30 bg-transparent px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-colors duration-150 hover:border-[#85DDD5] hover:text-[#85DDD5]' : 'border border-black bg-black px-7 py-3 text-xs font-bold uppercase text-white transition-colors duration-150 hover:bg-neutral-800'}
          >
            View all affiliate deals
          </Link>
        </div>
      )}
    </section>
  );
}
