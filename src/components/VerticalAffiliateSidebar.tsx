'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Loader2, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AffiliateItem {
  id: string;
  name: string;
  commission?: string;
  cookie?: string;
}

interface VerticalAffiliateSidebarProps {
  hideWhenEmpty?: boolean;
  sticky?: boolean;
  variant?: 'default' | 'article';
}

export default function VerticalAffiliateSidebar({ hideWhenEmpty = false, sticky = true, variant = 'default' }: VerticalAffiliateSidebarProps) {
  const [items, setItems] = useState<AffiliateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const article = variant === 'article';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/public/top-picks', { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.status === 'success') setItems(payload.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (!loading && hideWhenEmpty && items.length === 0) return null;

  return (
    <aside className={`w-full self-start border p-[22px] ${article ? 'border-white/15 bg-white/[0.045] text-white' : 'border-[#E2E2DE] border-t-2 border-t-black bg-white'} ${sticky ? 'lg:sticky lg:top-[98px]' : ''}`} aria-label="Recommended affiliate deals">
      <p className={`mb-3 text-[10px] font-bold uppercase tracking-[0.14em] ${article ? 'text-[#85DDD5]' : 'text-neutral-500'}`}>Partner Links</p>
      <h2 className={`mb-[22px] text-[26px] font-bold uppercase leading-none ${article ? 'text-white' : 'text-black'}`}>{article ? 'Sponsor Desk' : 'Top Deals'}</h2>

      {loading && (
        <div className={`flex items-center gap-2 border-t py-6 text-xs font-bold uppercase ${article ? 'border-white/15 text-white/45' : 'border-[#E2E2DE] text-neutral-500'}`}>
          <Loader2 size={15} className="animate-spin" /> Loading deals
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className={`border-t py-5 text-sm ${article ? 'border-white/15 text-white/45' : 'border-[#E2E2DE] text-neutral-500'}`}>No partner deals available.</p>
      )}

      <div className={`-mx-[22px] flex snap-x snap-mandatory gap-4 overflow-x-auto border-t px-[22px] pb-2 lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0 ${article ? 'border-white/15' : 'border-[#E2E2DE]'}`}>
        {items.map((item, index) => (
          <article
            key={item.id}
            data-motion="rise"
            style={{ '--motion-delay': `${index * 55}ms` } as React.CSSProperties}
            className={`${index >= 2 ? 'hidden lg:block' : 'block'} clickable-card group relative min-w-[min(280px,82vw)] cursor-pointer snap-start border-b py-5 lg:min-w-0 ${article ? 'border-white/15' : 'border-[#E2E2DE]'}`}
          >
            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${item.id}`}
              target="_blank"
              rel="nofollow sponsored"
              className="card-stretched-link"
              aria-label={`View affiliate deal for ${item.name}`}
            />
            <div className={`mb-3 inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase ${article ? 'bg-[#85DDD5] text-[#071211]' : 'bg-black text-white'}`}>
              <Star size={9} fill="currentColor" /> Pick #{index + 1}
            </div>
            <h3 className={`mb-3 text-base font-bold leading-tight transition-colors ${article ? 'text-white group-hover:text-[#85DDD5]' : 'text-black'}`}>{item.name}</h3>
            <p className={`mb-2 flex items-center gap-2 text-xs ${article ? 'text-white/55' : 'text-neutral-600'}`}>
              <ShieldCheck size={13} /> {item.commission || 'Exclusive Offer'}
            </p>
            <p className={`mb-4 flex items-center gap-2 text-xs ${article ? 'text-white/55' : 'text-neutral-600'}`}>
              <Clock size={13} /> {item.cookie || '30 Days'}
            </p>
            <a
              href={`/api/v1/public/tracking/redirect?affiliate_link_id=${item.id}`}
              target="_blank"
              rel="nofollow sponsored"
              className={`flex w-full items-center justify-between border px-4 py-3 text-[10px] font-bold uppercase transition-colors duration-150 ${article ? 'border-[#85DDD5] bg-[#85DDD5] text-[#071211] hover:border-white hover:bg-white' : 'border-black bg-black text-white hover:bg-neutral-800'}`}
            >
              View deal <ArrowRight size={13} />
            </a>
          </article>
        ))}
      </div>

      <Link
        href="/affiliates"
        className={`mt-5 flex items-center justify-between border-t pt-4 text-[10px] font-bold uppercase transition-colors ${article ? 'border-white/20 text-white hover:text-[#85DDD5]' : 'border-black text-black'}`}
      >
        All affiliate deals <ArrowRight size={13} />
      </Link>
    </aside>
  );
}
