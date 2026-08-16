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
              <span className="text-lg font-extrabold text-slate-900">AIDEALSUK</span>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed mb-4">
              {bioText || 'Your Trusted Source for AI Tool Reviews, Tech News & Exclusive Affiliate Deals. Delivering in-depth software benchmarks, lifetime deals, and revenue automation insights.'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-slate-700 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#20C997]" />
              Verified AI Partner Programs &amp; Affiliate Links
            </div>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-[#0056B3] transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-[#0056B3] transition-colors">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-[#0056B3] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#0056B3] transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/affiliate-disclosure" className="hover:text-[#0056B3] transition-colors">Affiliate Disclosure</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/admin/login" className="hover:text-[#0056B3] transition-colors flex items-center gap-1">CMS Login <ExternalLink className="w-3 h-3" /></Link></li>
              <li><Link href="/figma-tech-finance-news" className="hover:text-[#0056B3] transition-colors">Tech &amp; Finance News</Link></li>
              <li><Link href="/figma-tech-finance-news/affiliates" className="hover:text-[#0056B3] transition-colors">Affiliate Deals</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 text-xs text-slate-500">
          <p className="mb-3 leading-relaxed max-w-3xl">
            <strong className="text-slate-600">Affiliate Disclosure:</strong>{' '}
            Some links on this site are affiliate links. If you click through and make a purchase, we may earn a commission at no additional cost to you. We only recommend products we genuinely believe in.
          </p>
          <p className="text-center font-medium">
            {copyrightText || `© ${new Date().getFullYear()} AIDEALSUK. All Rights Reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
