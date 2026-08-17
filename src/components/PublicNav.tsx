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

  const accentColor = siteSettings?.accentColor || '#0056B3';
  const logoUrl = siteSettings?.logoUrl || '';
  const bannerText = siteSettings?.bannerText || '';
  const siteTitle = siteSettings?.siteTitle || 'AIDEALSUK';

  return (
    <nav className="fixed top-0 left-0 w-full z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-300 shadow-sm">
      {/* Dynamic Announcement Banner */}
      {bannerText && (
        <div
          className="w-full text-center py-1.5 px-4 text-xs font-semibold text-white truncate shadow-inner flex items-center justify-center gap-2 bg-gradient-to-r from-[#0056B3] via-indigo-600 to-[#4F46E5]"
        >
          <Sparkles size={14} className="shrink-0" />
          <span>{bannerText}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo or Custom Image Logo */}
        <Link href="/" className="text-2xl font-bold tracking-tighter text-slate-900 flex items-center gap-2.5 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={siteTitle} className="h-9 object-contain" />
          ) : (
            <>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md bg-[#0056B3]"
              >
                {siteTitle[0] || 'A'}
              </div>
              <span className="font-extrabold tracking-tight text-slate-900">
                {siteTitle}
              </span>
            </>
          )}
        </Link>

        {/* Main Desktop Navigation Items */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700">
          <Link
            href="/"
            className={`transition-colors hover:text-[#0056B3] ${
              !currentTab && !currentCat ? 'text-[#0056B3] font-bold' : ''
            }`}
          >
            Home
          </Link>

          {/* Interactive Categories & Sub-categories Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-slate-100/80 transition-colors cursor-pointer ${
                currentCat || currentSubCat ? 'text-[#0056B3] font-bold bg-blue-50 border border-blue-100' : ''
              }`}
            >
              <Layers size={16} className="text-[#0056B3]" />
              <span>Categories</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180 text-[#0056B3]' : 'text-slate-400'}`}
              />
            </button>

            {/* Dropdown Menu Container */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
                  <span>Browse Topics</span>
                  {currentCat && (
                    <button onClick={() => handleSelectCategory('')} className="text-[#0056B3] hover:underline">
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
                            ? 'bg-blue-50 text-[#0056B3] border border-blue-100'
                            : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Tag size={14} className="text-[#0056B3]" /> {cat.name}
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                      </button>

                      {/* Level 2 Sub-Categories */}
                      {cat.subCategories && cat.subCategories.length > 0 && (
                        <div className="pl-6 space-y-1 border-l-2 border-slate-100 ml-3 py-1">
                          {cat.subCategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSelectCategory(cat.slug, sub.slug)}
                              className={`w-full text-left text-xs px-3 py-1 rounded-md transition-colors block ${
                                currentSubCat === sub.slug
                                  ? 'bg-blue-50 text-[#0056B3] font-bold border border-blue-100'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
            className={`flex items-center gap-1 transition-colors hover:text-[#0056B3] ${
              currentTab === 'hot' ? 'text-[#0056B3] font-bold' : ''
            }`}
          >
            <Flame size={15} className="text-rose-500" /> Hot Weekly
          </Link>

          <Link
            href="/?tab=popular"
            className={`transition-colors hover:text-[#0056B3] ${
              currentTab === 'popular' ? 'text-[#0056B3] font-bold' : ''
            }`}
          >
            Most Popular
          </Link>

          <Link
            href="/?tab=latest"
            className={`transition-colors hover:text-[#0056B3] ${
              currentTab === 'latest' ? 'text-[#0056B3] font-bold' : ''
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
              placeholder="Search AI tools, prompt guides..."
              className="w-full bg-slate-100/80 border border-slate-200 rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] focus:bg-white transition-colors shadow-inner"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </form>

          <Link
            href="/admin/login"
            className="hidden sm:flex px-4 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all duration-300 items-center gap-1.5 shrink-0"
          >
            <User size={14} /> CMS Portal
          </Link>
        </div>
      </div>

      {/* Active Filter Indicators Bar */}
      {(currentCat || currentSubCat || currentQuery || currentTab !== 'latest') && (
        <div className="bg-slate-50/90 border-t border-slate-200/80 py-2 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter size={13} className="text-[#0056B3]" /> Active Filters:
              {currentTab && currentTab !== 'latest' && (
                <span className="bg-blue-100/70 text-[#0056B3] font-semibold px-2 py-0.5 rounded border border-blue-200 uppercase">
                  Tab: {currentTab}
                </span>
              )}
              {currentCat && (
                <span className="bg-emerald-100/80 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Category: {currentCat}
                </span>
              )}
              {currentSubCat && (
                <span className="bg-indigo-100/80 text-indigo-800 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                  Sub-Category: {currentSubCat}
                </span>
              )}
              {currentQuery && (
                <span className="bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded border border-slate-300">
                  Keyword: "{currentQuery}"
                </span>
              )}
            </div>

            <button
              onClick={clearAllFilters}
              className="text-[#0056B3] hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X size={12} /> Clear All Filters
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
