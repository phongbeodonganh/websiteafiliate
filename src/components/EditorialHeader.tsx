'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, KeyboardEvent, Suspense, useRef } from 'react';
import { ArrowLeft, Search, Home, LogOut, ShieldCheck, Menu, X, Sparkles, TrendingUp, Compass, Mail } from 'lucide-react';
import CategorySelector from '@/components/CategorySelector';
import { BRAND_NAME } from '@/lib/brand';

interface EditorialHeaderProps {
  initialSearchQuery?: string;
}

function HeaderContent({ initialSearchQuery = '' }: EditorialHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || searchParams.get('q') || '');
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isHome = pathname === '/';

  const handleSubscribeClick = () => {
    const el = document.getElementById('newsletter-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const input = el.querySelector<HTMLInputElement>('input[type="email"]');
        if (input) {
          input.focus();
        }
      }, 450);
    } else {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard Shortcut (⌘K / Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
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
  }, []);

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchParams.get('q')) {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Fallback cleanup
      }
    }
    localStorage.removeItem('token');
    setUser(null);
    router.refresh();
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <header
      className={`pointer-events-auto fixed isolate top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
        scrolled
          ? 'header-glass bg-[#0a0a0a]/88 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
          : 'bg-[#0a0a0a] border-b border-white/[0.06]'
      }`}
    >
      {/* ── Top Micro-Ticker Bar ── */}
      <div className="hidden sm:flex items-center justify-between px-6 py-1.5 bg-black/50 border-b border-white/[0.04] text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-2.5">
          {/* Animated live pulse indicator */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#0D766E] opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D766E]" />
          </span>
          <span className="font-semibold text-white/90 tracking-wider">LIVE EDITION</span>
          <span className="text-white/10">|</span>
          <span className="text-neutral-400">UK AI & Tech Intelligence Platform</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-sans text-neutral-400">
          <Link href="/hottest" className="hover:text-white transition-colors duration-200 flex items-center gap-1.5">
            <TrendingUp size={11} className="text-[#0D766E]" /> Hottest Deals
          </Link>
          <Link href="/editorial-picks" className="hover:text-white transition-colors duration-200 flex items-center gap-1.5">
            <Sparkles size={11} className="text-amber-400/80" /> Editor&apos;s Choice
          </Link>
        </div>
      </div>

      {/* ── Main Navigation Bar ── */}
      <div className={`mx-auto max-w-[1440px] flex items-center justify-between gap-4 px-4 sm:px-6 transition-[height] duration-300 ${
        scrolled ? 'h-[58px] md:h-[64px]' : 'h-[66px] md:h-[74px]'
      }`}>
        {/* ── Brand Logo & Quick Nav ── */}
        <div className="flex min-w-0 shrink-0 items-center gap-3 lg:gap-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 group text-decoration-none"
          >
            <span className="whitespace-nowrap text-xl sm:text-2xl lg:text-[28px] font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif] group-hover:text-neutral-200 transition-colors duration-200">
              {BRAND_NAME}
            </span>
            <span className="hidden xl:inline-block bg-[#0D766E] text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 tracking-widest font-mono">
              UK
            </span>
          </Link>

          {!isHome && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 border border-white/15 bg-white/[0.04] text-neutral-300 px-3 py-1.5 text-xs font-bold uppercase transition-all duration-200 hover:bg-white/[0.08] hover:border-white/25 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Quick Nav Links */}
          <nav className="hidden lg:flex items-center gap-4 border-l border-white/[0.08] pl-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
            <Link
              href="/"
              className={`flex items-center gap-1.5 transition-colors duration-200 hover:text-white ${
                pathname === '/' ? 'text-white border-b-2 border-[#0D766E] pb-0.5' : ''
              }`}
            >
              <Home size={13} /> Home
            </Link>
            <Link
              href="/latest"
              className={`flex items-center gap-1.5 transition-colors duration-200 hover:text-white ${
                pathname === '/latest' ? 'text-white border-b-2 border-[#0D766E] pb-0.5' : ''
              }`}
            >
              <Compass size={13} /> Latest
            </Link>
          </nav>
        </div>

        {/* ── Center: Search Bar with Accent Glow ── */}
        <div className="hidden md:flex flex-1 max-w-[560px] items-center mx-2 lg:mx-6">
          <div className={`group relative flex w-full items-center h-[40px] border px-3.5 transition-all duration-250 ${
            searchFocused
              ? 'border-[#0D766E]/70 bg-black/90 shadow-[0_0_0_1px_rgba(13,118,110,0.3),0_0_20px_rgba(13,118,110,0.1)]'
              : 'border-white/[0.12] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
          }`}>
            <button
              type="button"
              onClick={handleSearch}
              aria-label="Submit search"
              className="mr-2 text-neutral-500 hover:text-white transition-colors duration-200 focus:outline-none"
            >
              <Search className={`w-4 h-4 transition-colors duration-250 ${searchFocused ? 'text-[#0D766E]' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search AI news, tools & editorial reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="bg-transparent border-0 text-white placeholder-neutral-500 text-xs font-medium w-full outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="text-neutral-500 hover:text-white p-1 hover:bg-white/[0.08] transition-all duration-200"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center text-[10px] font-semibold font-mono tracking-wider text-neutral-500 bg-white/[0.06] border border-white/[0.1] px-2 py-0.5 group-hover:border-white/20 group-hover:text-neutral-400 transition-all duration-200 whitespace-nowrap">
                Ctrl + K
              </kbd>
            )}
          </div>
        </div>

        {/* ── Right: Dropdown, Subscribe CTA & Auth Actions ── */}
        <div className="hidden sm:flex min-w-0 shrink-0 items-center gap-3">
          <CategorySelector placement="header" />

          {/* Subscribe CTA Button */}
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="flex items-center gap-2 bg-[#0D766E] hover:bg-[#0a625c] text-white px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer border border-[#0D766E]/60 hover:border-[#0D766E] hover:shadow-[0_0_16px_rgba(13,118,110,0.2)] shrink-0"
            title="Subscribe to VIP AI Newsletter"
          >
            <Mail size={14} />
            <span>Subscribe</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-white/[0.04] text-white border border-white/[0.1] px-3 py-1.5 text-xs font-bold uppercase transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20"
              >
                <ShieldCheck size={14} className="text-[#0D766E]" />
                <span className="max-w-[100px] truncate">{user.username}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.1] p-2 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
              <Link
                href="/admin/login"
                className="text-neutral-400 hover:text-white px-3 py-1.5 text-xs font-bold uppercase transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/admin/login"
                className="verdict-cta !py-1.5 !px-3.5 !text-xs"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* ── Mobile Hamburger Button ── */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="pointer-events-auto relative z-[2] shrink-0 touch-manipulation sm:hidden text-white p-2 hover:bg-white/[0.06] transition-colors duration-200"
          aria-label="Toggle Navigation"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Menu Slide Dropdown ── */}
      {mobileMenuOpen && (
        <div
          className="pointer-events-auto fixed top-[66px] left-0 right-0 z-[1100] max-h-[calc(100dvh-66px)] overflow-y-auto bg-[#0a0a0a]/95 header-glass border-b border-white/[0.08] p-5 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          style={{ animation: 'mobile-menu-in 250ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
        >
          <style>{`
            @keyframes mobile-menu-in {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="flex items-center bg-black/60 border border-white/[0.12] h-[44px] px-3.5">
            <Search className="text-neutral-500 shrink-0 w-4 h-4 mr-2" />
            <input
              type="text"
              placeholder="Search news, tools & reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                  setMobileMenuOpen(false);
                }
              }}
              className="bg-transparent border-0 text-white placeholder-neutral-500 text-xs font-medium w-full outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  handleSearch();
                  setMobileMenuOpen(false);
                }}
                className="verdict-cta !py-1 !px-3 !text-[10px]"
              >
                Search
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] p-3 text-xs font-bold text-white uppercase transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <Home size={14} /> Home
            </Link>
            <Link
              href="/latest"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] p-3 text-xs font-bold text-white uppercase transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <Compass size={14} /> Latest News
            </Link>
            <Link
              href="/hottest"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] p-3 text-xs font-bold text-white uppercase transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <TrendingUp size={14} className="text-[#0D766E]" /> Hottest Deals
            </Link>
            <Link
              href="/editorial-picks"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] p-3 text-xs font-bold text-white uppercase transition-colors duration-200 hover:bg-white/[0.06]"
            >
              <Sparkles size={14} className="text-amber-400/80" /> Top Choice
            </Link>
          </div>

          <div className="pt-2 border-t border-white/[0.06]">
            <CategorySelector placement="header" />
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-white text-xs font-bold uppercase"
                >
                  <ShieldCheck size={14} className="text-[#0D766E]" /> CMS: {user.username}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-400 font-bold uppercase flex items-center gap-1"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center border border-white/20 text-white py-2.5 text-xs font-bold uppercase transition-colors duration-200 hover:bg-white/[0.06]"
                >
                  Sign in
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center verdict-cta justify-center !py-2.5 !text-xs"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function EditorialHeader(props: EditorialHeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="fixed top-0 left-0 right-0 z-[1000] h-[66px] bg-[#0a0a0a] border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-7">
          <Link href="/" className="text-white text-2xl font-bold font-['Plus_Jakarta_Sans']">
            {BRAND_NAME}
          </Link>
        </header>
      }
    >
      <HeaderContent {...props} />
    </Suspense>
  );
}
