'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Newspaper, ShieldCheck, UserCheck, Search, Menu, X, ArrowUpRight } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Fetch Public Settings for dynamic theme & logo
    fetch('/api/v1/public/settings')
      .then((r) => r.json())
      .then((d) => d.status === 'success' && setSiteSettings(d.data))
      .catch(() => {});

    // Check token
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success') {
            setUser(data.data);
          }
        })
        .catch(() => {});
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const accentColor = siteSettings?.accentColor || '#f59e0b';
  const logoUrl = siteSettings?.logoUrl || '';
  const bannerText = siteSettings?.bannerText || '';
  const siteTitle = siteSettings?.siteTitle || 'NEXUS FINANCE';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-900/90 backdrop-blur-md shadow-lg border-b border-slate-800'
          : 'bg-slate-900 border-b border-slate-800'
      }`}
    >
      {bannerText && (
        <div
          className="w-full text-center py-1.5 px-4 text-xs font-bold text-slate-950 truncate shadow-inner"
          style={{ backgroundColor: accentColor }}
        >
          {bannerText}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={logoUrl} alt={siteTitle} className="h-9 object-contain" />
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg group-hover:scale-105 transition-transform duration-200"
                  style={{ backgroundColor: accentColor }}
                >
                  <Newspaper className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">
                    {siteTitle}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest font-semibold" style={{ color: accentColor }}>
                    Institutional Insights & Review Deals
                  </span>
                </div>
              </>
            )}
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Trang Chủ
            </Link>
            <a
              href="#featured-deals"
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              Deal Nổi Bật <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Action Right */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium border border-slate-700 transition-all"
              >
                {user.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-blue-400" />
                )}
                <span>CMS: {user.username} ({user.role})</span>
              </Link>
            ) : (
              <Link
                href="/admin/login"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 hover:shadow-blue-600/40 transition-all"
              >
                Đăng Nhập CMS
              </Link>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-300 hover:text-white p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 font-medium py-2 hover:text-emerald-400"
          >
            Trang Chủ
          </Link>
          {user ? (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block bg-slate-800 text-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              Vào CMS Quản Trị ({user.username})
            </Link>
          ) : (
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
            >
              Đăng Nhập CMS
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
