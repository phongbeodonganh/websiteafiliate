import Link from 'next/link';
import { Newspaper, Shield, ExternalLink } from 'lucide-react';

interface FooterProps {
  bioText?: string;
  copyrightText?: string;
}

export default function Footer({ bioText, copyrightText }: FooterProps) {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#0056B3] flex items-center justify-center text-white font-bold shadow-md">
                <Newspaper className="w-5 h-5" />
              </div>
              <span className="text-lg font-extrabold text-slate-900">AI AFFILIATE HUB</span>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-4">
              {bioText || 'The premier AI affiliate platform and tool reviews hub. Delivering in-depth software benchmarks, lifetime deals, and revenue automation insights.'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-slate-700 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#20C997]" />
              Verified AI Partner Programs & Affiliate Links
            </div>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm mb-4">AI Use-Cases</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/?category=ai-for-creators-media" className="hover:text-[#0056B3] transition-colors">AI for Creators & Media</Link></li>
              <li><Link href="/?category=ai-for-real-estate-sales" className="hover:text-[#0056B3] transition-colors">AI for Real Estate & Sales</Link></li>
              <li><Link href="/?category=ai-for-e-commerce-online-business" className="hover:text-[#0056B3] transition-colors">AI for E-commerce</Link></li>
              <li><Link href="/?category=ai-for-marketers-agencies" className="hover:text-[#0056B3] transition-colors">AI for Marketers & Agencies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm mb-4">CMS Portal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/admin/login" className="hover:text-[#0056B3] transition-colors flex items-center gap-1">CMS Login <ExternalLink className="w-3 h-3" /></Link></li>
              <li><Link href="/admin" className="hover:text-[#0056B3] transition-colors">Admin Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 text-xs text-center text-slate-500">
          {copyrightText || `© ${new Date().getFullYear()} AI AFFILIATE HUB. All Rights Reserved.`}
        </div>
      </div>
    </footer>
  );
}
