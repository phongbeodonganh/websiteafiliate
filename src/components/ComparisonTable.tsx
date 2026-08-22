import React from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

export interface ComparisonItem {
  id: string;
  name: string;
  price: string;
  rating: number; // 1 to 5
  pros: string[];
  cons: string[];
  linkUrl: string;
  badge?: string;
}

interface ComparisonTableProps {
  title?: string;
  items: ComparisonItem[];
}

/**
 * Editorial Tool Comparison Table
 * Uses clean monochrome lines, IBM Plex Mono typography for pricing/specs,
 * filled dots (⬤⬤⬤⬤○) instead of fake star ratings, and subtle hover states.
 */
export default function ComparisonTable({ title = "Feature & Price Comparison", items }: ComparisonTableProps) {
  if (!items || items.length === 0) return null;

  return (
    <aside className="my-10 border border-[#E2E2DE] border-t-2 border-t-black bg-white p-6 md:p-8" aria-label="Tool comparison table">
      <h3 className="text-xl font-bold uppercase tracking-tight text-black mb-6 font-['Plus_Jakarta_Sans']">
        {title}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-black text-xs font-bold uppercase tracking-wider text-black">
              <th className="py-3 px-4 w-1/4">Tool</th>
              <th className="py-3 px-4 w-1/5 font-mono">Price</th>
              <th className="py-3 px-4 w-1/4">Score</th>
              <th className="py-3 px-4 w-1/4">Key Highlight</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E2DE] text-sm">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                <td className="py-4 px-4 font-bold text-black font-['Plus_Jakarta_Sans']">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                      {item.name}
                      {item.badge && (
                        <span className="bg-[#0D766E] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-xs font-semibold text-neutral-800">
                  {item.price}
                </td>
                <td className="py-4 px-4 text-xs font-mono text-[#0D766E]">
                  {'⬤'.repeat(Math.min(5, Math.max(1, Math.round(item.rating))))}
                  {'○'.repeat(5 - Math.min(5, Math.max(1, Math.round(item.rating))))}
                  <span className="ml-2 text-neutral-500 font-sans">({item.rating.toFixed(1)})</span>
                </td>
                <td className="py-4 px-4 text-xs text-neutral-600">
                  {item.pros[0] || 'High performance'}
                </td>
                <td className="py-4 px-4 text-right">
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="nofollow sponsored"
                    className="verdict-cta !py-2 !px-3 !text-[10px]"
                  >
                    Try <ArrowRight size={11} className="cta-arrow" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
