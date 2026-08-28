'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Layers, Check } from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

let categoryRequest: Promise<CategoryOption[]> | null = null;

function loadCategories() {
  if (!categoryRequest) {
    categoryRequest = fetch('/api/v1/public/categories')
      .then((response) => response.json())
      .then((payload) => (payload.status === 'success' ? payload.data : []))
      .catch(() => []);
  }
  return categoryRequest;
}

export default function CategorySelector({ placement }: { placement: 'header' | 'footer' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSlug = pathname.match(/\/category\/([^/]+)/)?.[1] || '';
  const currentCategory = categories.find((c) => c.slug === currentSlug);

  useEffect(() => {
    let active = true;
    loadCategories().then((items) => {
      if (active) setCategories(items);
    });
    return () => {
      active = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(slug: string) {
    setIsOpen(false);
    if (!slug) {
      router.push('/');
    } else {
      router.push(`/category/${encodeURIComponent(slug)}`);
    }
  }

  if (placement === 'footer') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Category</span>
        <select
          aria-label="Select a category"
          value={currentSlug}
          onChange={(e) => handleSelect(e.target.value)}
          className="h-[38px] min-w-[180px] cursor-pointer border border-black bg-white px-3 text-xs font-bold uppercase text-black outline-none transition-colors hover:bg-neutral-50"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-[38px] items-center gap-2 border px-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
          isOpen || currentCategory
            ? 'border-[#0D766E] bg-[#0D766E]/10 text-white shadow-[0_0_15px_rgba(13,118,110,0.2)]'
            : 'border-white/20 bg-white/5 text-neutral-200 hover:border-white/40 hover:bg-white/10 hover:text-white'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Layers size={14} className={currentCategory ? 'text-[#0D766E]' : 'text-neutral-400'} />
        <span className="max-w-[120px] truncate">
          {currentCategory ? currentCategory.name : 'Categories'}
        </span>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {/* ── Popover Menu ── */}
      {isOpen && (
        <div className="absolute right-0 z-[1200] mt-2 w-56 origin-top-right border border-white/15 bg-[#161616] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="mb-1 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Select Category
          </div>

          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
              !currentSlug
                ? 'bg-[#0D766E] text-white font-bold'
                : 'text-neutral-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>All Categories</span>
            {!currentSlug && <Check size={13} />}
          </button>

          <div className="my-1 border-t border-white/10" />

          <div className="max-h-[260px] overflow-y-auto space-y-0.5 scrollbar-thin">
            {categories.map((category) => {
              const isSelected = category.slug === currentSlug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelect(category.slug)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#0D766E] text-white font-bold'
                      : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{category.name}</span>
                  {isSelected && <Check size={13} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
