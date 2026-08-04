import Link from 'next/link';
import { Newspaper, Shield, ExternalLink } from 'lucide-react';

interface FooterProps {
  bioText?: string;
  copyrightText?: string;
}

export default function Footer({ bioText, copyrightText }: FooterProps) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-bold">
                <Newspaper className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white">NEXUS FINANCE GLOBAL</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-4">
              {bioText || 'Nền tảng phân tích tài chính & crypto chuyên sâu, cung cấp tín hiệu đầu tư và đánh giá các giải pháp đối tác uy tín.'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Verified Partner Deals & SEO/GEO Compliant
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Danh Mục Tin Tức</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/" className="hover:text-amber-400 transition-colors">Tài Chính & Quỹ Đầu Tư</Link></li>
              <li><Link href="/" className="hover:text-amber-400 transition-colors">Crypto & Blockchain Signals</Link></li>
              <li><Link href="/" className="hover:text-amber-400 transition-colors">Hosting & Cloud Server</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Hệ Thống CMS</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/admin/login" className="hover:text-amber-400 transition-colors flex items-center gap-1">Đăng Nhập CMS <ExternalLink className="w-3 h-3" /></Link></li>
              <li><Link href="/admin" className="hover:text-amber-400 transition-colors">Dashboard Quản Trị</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 text-xs text-center text-slate-500">
          {copyrightText || `© ${new Date().getFullYear()} NEXUS FINANCE GLOBAL. Tất cả quyền được bảo lưu.`}
        </div>
      </div>
    </footer>
  );
}
