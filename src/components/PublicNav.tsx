'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronDown,
  Flame,
  User,
  X,
  Layers,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface CategoryItem {
  id: string | number;
  name: string;
  slug: string;
  subCategories?: Array<{ id: string | number; name: string; slug: string }>;
}

interface PublicNavProps {
  categoriesList: CategoryItem[];
  siteSettings?: any;
}

export default function PublicNav({ categoriesList, siteSettings: initialSettings }: PublicNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [siteSettings, setSiteSettings] = useState<any>(initialSettings || null);

  const currentTab = searchParams.get('tab') || 'latest';
  const currentCat = searchParams.get('category') || '';
  const currentSubCat = searchParams.get('sub_category') || '';
  const currentQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSettings) {
      fetch('/api/v1/public/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success') {
            setSiteSettings(data.data);
          }
        })
        .catch(() => {});
    } else {
      setSiteSettings(initialSettings);
    }
  }, [initialSettings]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    router.push(`/?${params.toString()}`);
  };

  const handleSelectCategory = (catSlug: string, subSlug?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (catSlug) {
      params.set('category', catSlug);
    } else {
      params.delete('category');
    }

    if (subSlug) {
      params.set('sub_category', subSlug);
    } else {
      params.delete('sub_category');
    }

    setDropdownOpen(false);
    router.push(`/?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    router.push('/');
  };

  const accentColor = siteSettings?.accentColor || '#f59e0b';
  const logoUrl = siteSettings?.logoUrl || '';
  const bannerText = siteSettings?.bannerText || '';
  const siteTitle = siteSettings?.siteTitle || 'NEXUS FINANCE';

  return (
    <nav className="fixed top-0 left-0 w-full z-40 border-b border-white/10 bg-[#0a0a0c]/90 backdrop-blur-xl transition-all duration-300 shadow-2xl">
      {/* Dynamic Announcement Banner */}
      {bannerText && (
        <div
          className="w-full text-center py-1.5 px-4 text-xs font-bold text-slate-950 truncate shadow-inner flex items-center justify-center gap-2"
          style={{ backgroundColor: accentColor }}
        >
          <Sparkles size={14} className="shrink-0" />
          <span>{bannerText}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo or Custom Image Logo */}
        <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2.5 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={siteTitle} className="h-9 object-contain" />
          ) : (
            <>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-extrabold text-lg shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                {siteTitle[0] || 'N'}
              </div>
              <span className="font-extrabold tracking-tight">
                {siteTitle}
              </span>
            </>
          )}
        </Link>

        {/* Main Desktop Navigation Items */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link
            href="/"
            className={`transition-colors hover:text-amber-400 ${
              !currentTab && !currentCat ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Home
          </Link>

          {/* Interactive Categories & Sub-categories Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer ${
                currentCat || currentSubCat ? 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20' : ''
              }`}
            >
              <Layers size={16} className="text-amber-400" />
              <span>Categories</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-amber-400' : 'text-slate-400'}`}
              />
            </button>

            {/* Dropdown Menu Container */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-80 bg-[#0c0c0e] border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                  <span>Browse Topics</span>
                  {currentCat && (
                    <button onClick={() => handleSelectCategory('')} className="text-amber-400 hover:underline">
                      Reset Category
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {categoriesList.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      {/* Level 1 Category */}
                      <button
                        onClick={() => handleSelectCategory(cat.slug)}
                        className={`w-full text-left font-semibold text-sm px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          currentCat === cat.slug && !currentSubCat
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Tag size={14} className="text-amber-400" /> {cat.name}
                        </span>
                        <ArrowRight size={12} className="text-slate-600" />
                      </button>

                      {/* Level 2 Sub-Categories */}
                      {cat.subCategories && cat.subCategories.length > 0 && (
                        <div className="pl-6 space-y-1 border-l-2 border-slate-800 ml-3 py-1">
                          {cat.subCategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSelectCategory(cat.slug, sub.slug)}
                              className={`w-full text-left text-xs px-3 py-1 rounded-md transition-colors block ${
                                currentSubCat === sub.slug
                                  ? 'bg-amber-400/10 text-amber-400 font-bold border border-amber-500/20'
                                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              • {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/?tab=hot"
            className={`flex items-center gap-1 transition-colors hover:text-amber-400 ${
              currentTab === 'hot' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            <Flame size={15} className="text-amber-400" /> Hot Weekly
          </Link>

          <Link
            href="/?tab=popular"
            className={`transition-colors hover:text-amber-400 ${
              currentTab === 'popular' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Most Popular
          </Link>

          <Link
            href="/?tab=latest"
            className={`transition-colors hover:text-amber-400 ${
              currentTab === 'latest' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            Latest Insights
          </Link>
        </div>

        {/* Taskbar Search Input & CMS Link */}
        <div className="flex items-center gap-3 flex-1 lg:flex-initial justify-end">
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs sm:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search crypto, news..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('q');
                  router.push(`/?${params.toString()}`);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </form>

          <Link
            href="/admin/login"
            className="hidden sm:flex px-4 py-2 text-xs font-semibold rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 items-center gap-1.5 shrink-0"
          >
            <User size={14} /> CMS Portal
          </Link>
        </div>
      </div>

      {/* Active Filter Indicators Bar */}
      {(currentCat || currentSubCat || currentQuery || currentTab !== 'latest') && (
        <div className="bg-slate-950/80 border-t border-slate-800/60 py-2 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={13} className="text-amber-400" /> Active Filters:
              {currentTab && currentTab !== 'latest' && (
                <span className="bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                  Tab: {currentTab}
                </span>
              )}
              {currentCat && (
                <span className="bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded border border-cyan-500/20">
                  Category: {currentCat}
                </span>
              )}
              {currentSubCat && (
                <span className="bg-purple-500/10 text-purple-400 font-semibold px-2 py-0.5 rounded border border-purple-500/20">
                  Sub-Category: {currentSubCat}
                </span>
              )}
              {currentQuery && (
                <span className="bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                  Keyword: "{currentQuery}"
                </span>
              )}
            </div>

            <button
              onClick={clearAllFilters}
              className="text-amber-400 hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X size={12} /> Clear All Filters
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
