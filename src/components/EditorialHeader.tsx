'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, KeyboardEvent, Suspense } from 'react';
import { ArrowLeft, Search, Home, LogOut, ShieldCheck, Menu, X } from 'lucide-react';
import CategorySelector from '@/components/CategorySelector';
import Button from '@/components/Button';
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
  const isHome = pathname === '/';

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
        .catch(() => { });
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
        // Mất mạng/API lỗi vẫn cứ đăng xuất phía client bình thường.
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
    <header className="pointer-events-auto fixed isolate top-0 left-0 right-0 z-[1000] h-[70px] md:h-[82px] bg-[#111111] border-b border-[#222222] shadow-[0_14px_34px_rgba(17,17,17,0.15)] flex items-center justify-between gap-3 px-4 sm:px-7 font-['Inter',system-ui,sans-serif]">
      {/* ── Brand & Navigation Links ── */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 xl:gap-4">
        {/* Brand Name -> Click to Home */}
        <Link
          href="/"
          className="whitespace-nowrap text-xl font-extrabold tracking-tight text-white text-decoration-none transition-colors hover:text-gray-200 sm:text-2xl xl:text-3xl font-['Plus_Jakarta_Sans',sans-serif]"
        >
          {BRAND_NAME}
        </Link>

        {!isHome && (
          <Button
            onClick={handleBack}
            variant="headerOutline"
            size="headerNav"
            leadingIcon={<ArrowLeft size={15} />}
            className="w-10 sm:w-[88px]"
            aria-label="Go back to the previous page"
            title="Back"
          >
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}

        {/* Home Button */}
        <Button
          onClick={() => router.push('/')}
          variant="headerOutline"
          size="headerNav"
          leadingIcon={<Home size={14} />}
          className="hidden md:inline-flex"
        >
          <span>Home</span>
        </Button>
      </div>

      {/* ── Center: Search Bar ── */}
      <div className="hidden h-[44px] w-[280px] min-w-0 items-center rounded-lg border-2 border-white bg-[#111111] px-3 shadow-[0_8px_18px_rgba(17,17,17,0.09)] xl:flex 2xl:w-[320px]">
        <Search className="text-white shrink-0 w-5 h-5 mr-2" />
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-0 text-white placeholder-gray-400 text-sm w-full outline-none"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="bg-white text-black font-bold text-[10px] uppercase px-2.5 h-[28px] shrink-0 transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
        >
          Go
        </button>
      </div>

      {/* ── Right: Categories + Auth Actions ── */}
      <div className="hidden min-w-0 shrink-0 items-center gap-2 md:flex xl:gap-3">
        {/* Categories Selection */}
        <CategorySelector placement="header" />

        {/* Auth Buttons / User Profile */}
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              role="button"
              className="flex items-center gap-1.5 bg-zinc-800 text-white border border-zinc-600 px-3 py-2 text-xs font-bold uppercase transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{user.username}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="bg-zinc-800 text-white border border-zinc-600 p-2 transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/login"
              role="button"
              className="border border-white/80 text-white px-3.5 py-2 text-xs font-bold uppercase transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
            >
              Sign in
            </Link>
            <Link
              href="/admin/login"
              role="button"
              className="bg-white text-black border border-white px-3.5 py-2 text-xs font-bold uppercase transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
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
        className="pointer-events-auto relative z-[2] shrink-0 touch-manipulation md:hidden text-white p-2 hover:bg-zinc-800 rounded"
        aria-label="Toggle Navigation"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-editorial-navigation"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ── Mobile Menu Dropdown ── */}
      {mobileMenuOpen && (
        <div id="mobile-editorial-navigation" className="pointer-events-auto fixed top-[70px] left-0 right-0 z-[1100] max-h-[calc(100dvh-70px)] touch-manipulation overflow-y-auto overscroll-contain bg-[#111111] border-b border-[#333] p-4 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center bg-[#111111] border-2 border-white rounded-lg h-[44px] px-3">
            <Search className="text-white shrink-0 w-5 h-5 mr-2" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                  setMobileMenuOpen(false);
                }
              }}
              className="bg-transparent border-0 text-white placeholder-gray-400 text-sm w-full outline-none"
            />
            <button
              type="button"
              onClick={() => {
                handleSearch();
                setMobileMenuOpen(false);
              }}
              className="bg-white text-black font-bold text-[10px] uppercase px-2.5 h-[28px] shrink-0"
            >
              Go
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-2">
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                router.push('/');
              }}
              variant="headerOutline"
              size="headerNav"
              leadingIcon={<Home size={14} />}
            >
              Home
            </Button>
            <CategorySelector placement="header" />
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 text-white text-xs font-bold uppercase"
                >
                  <ShieldCheck size={14} className="text-emerald-400" /> CMS: {user.username}
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
                  className="flex-1 text-center border border-white text-white py-2 text-xs font-bold uppercase"
                >
                  Sign in
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center bg-white text-black py-2 text-xs font-bold uppercase"
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
        <header className="fixed top-0 left-0 right-0 z-[1000] h-[70px] md:h-[82px] bg-[#111111] border-b border-[#222222] flex items-center justify-between px-4 sm:px-7">
          <Link href="/" className="text-white text-2xl font-bold">
            {BRAND_NAME}
          </Link>
        </header>
      }
    >
      <HeaderContent {...props} />
    </Suspense>
  );
}
