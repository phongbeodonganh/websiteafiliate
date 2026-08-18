'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, KeyboardEvent, Suspense } from 'react';
import { Search, Home, User, LogOut, ShieldCheck, Menu, X } from 'lucide-react';
import CategorySelector from '@/components/CategorySelector';
import { BRAND_NAME } from '@/lib/brand';

interface EditorialHeaderProps {
  initialSearchQuery?: string;
}

function HeaderContent({ initialSearchQuery = '' }: EditorialHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || searchParams.get('q') || '');
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

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
      router.push(`/figma-tech-finance-news?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/figma-tech-finance-news');
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

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] h-[82px] bg-[#111111] border-b border-[#222222] shadow-[0_14px_34px_rgba(17,17,17,0.15)] flex items-center justify-between px-4 sm:px-7 font-['Inter',system-ui,sans-serif]">
      {/* ── Brand & Navigation Links ── */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Brand Name -> Click to Home */}
        <Link
          href="/"
          className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight text-decoration-none hover:text-gray-200 transition-colors font-['Plus_Jakarta_Sans',sans-serif]"
        >
          {BRAND_NAME}
        </Link>

        {/* Home Button */}
        <Link
          href="/"
          role="button"
          className="hidden md:flex items-center gap-1.5 border border-white/80 text-white px-3.5 py-1.5 text-xs font-bold uppercase transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02] text-decoration-none"
        >
          <Home size={14} />
          <span>Home</span>
        </Link>
      </div>

      {/* ── Center: Search Bar ── */}
      <div className="hidden lg:flex items-center bg-[#111111] border-2 border-white rounded-lg h-[44px] px-3 w-[260px] xl:w-[320px] shadow-[0_8px_18px_rgba(17,17,17,0.09)]">
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
          onClick={handleSearch}
          className="bg-white text-black font-bold text-[10px] uppercase px-2.5 h-[28px] shrink-0 transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02]"
        >
          Go
        </button>
      </div>

      {/* ── Right: Categories + Auth Actions ── */}
      <div className="hidden md:flex items-center gap-3">
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
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden text-white p-2 hover:bg-zinc-800 rounded"
        aria-label="Toggle Navigation"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ── Mobile Menu Dropdown ── */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[82px] left-0 right-0 bg-[#111111] border-b border-[#333] p-4 space-y-4 shadow-xl z-50">
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
              onClick={() => {
                handleSearch();
                setMobileMenuOpen(false);
              }}
              className="bg-white text-black font-bold text-[10px] uppercase px-2.5 h-[28px] shrink-0"
            >
              Go
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 text-white text-xs font-bold uppercase hover:text-gray-300"
            >
              <Home size={14} /> Home
            </Link>
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
        <header className="fixed top-0 left-0 right-0 z-[1000] h-[82px] bg-[#111111] border-b border-[#222222] flex items-center justify-between px-4 sm:px-7">
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
