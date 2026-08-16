'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';

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
      .then((payload) => payload.status === 'success' ? payload.data : [])
      .catch(() => []);
  }
  return categoryRequest;
}

export default function CategorySelector({ placement }: { placement: 'header' | 'footer' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const currentSlug = pathname.match(/\/figma-tech-finance-news\/category\/([^/]+)/)?.[1] || '';

  useEffect(() => {
    let active = true;
    loadCategories().then((items) => {
      if (active) setCategories(items);
    });
    return () => { active = false; };
  }, []);

  function selectCategory(event: ChangeEvent<HTMLSelectElement>) {
    const slug = event.target.value;
    if (!slug) return;
    router.push(`/figma-tech-finance-news/category/${encodeURIComponent(slug)}`);
  }

  return (
    <label className={placement === 'header' ? 'block' : 'flex items-center gap-3'}>
      {placement === 'footer' && <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Category</span>}
      <select
        aria-label="Select a category"
        value={currentSlug}
        onChange={selectCategory}
        className={
          placement === 'header'
            ? 'h-[38px] min-w-[150px] cursor-pointer border border-white bg-black px-3 text-xs font-bold uppercase text-white outline-none'
            : 'h-[38px] min-w-[180px] cursor-pointer border border-black bg-white px-3 text-xs font-bold uppercase text-black outline-none'
        }
      >
        <option value="">Browse categories</option>
        {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
      </select>
    </label>
  );
}
