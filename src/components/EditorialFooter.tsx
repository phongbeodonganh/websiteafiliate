'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CategorySelector from '@/components/CategorySelector';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

const YEAR = new Date().getFullYear();

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

export default function EditorialFooter() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let active = true;
    loadCategories().then((items) => {
      if (active) setCategories(items);
    });
    return () => { active = false; };
  }, []);

  return (
    <footer className="mt-auto w-full border-t-[3px] border-t-[#123f35] bg-[#101d19] text-white" data-motion="fade">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 pb-8 pt-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div>
          <Link href="/" className="mb-4 block font-['Plus_Jakarta_Sans',sans-serif] text-[24px] font-extrabold text-white no-underline">
            GOOD<span className="text-[#f4c95d]">PICK</span>
          </Link>
          <p className="max-w-[300px] text-[12px] leading-relaxed text-neutral-400">{BRAND_TAGLINE}</p>
        </div>

        <div>
          <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">Khám phá</h4>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px]">
            <li><Link href="/" className="footer-link text-neutral-300 no-underline hover:text-white">Sản phẩm đề xuất</Link></li>
            <li><Link href="/latest" className="footer-link text-neutral-300 no-underline hover:text-white">Bài viết mới</Link></li>
            <li><Link href="/editorial-picks" className="footer-link text-neutral-300 no-underline hover:text-white">Biên tập viên chọn</Link></li>
            <li><Link href="/affiliates" className="footer-link text-neutral-300 no-underline hover:text-white">Ưu đãi liên kết</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">Danh mục</h4>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px]">
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}><Link href={`/category/${category.slug}`} className="footer-link text-neutral-300 no-underline hover:text-white">{category.name}</Link></li>
            ))}
            {categories.length === 0 && <li><CategorySelector placement="footer" /></li>}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-500">Thông tin tin cậy</h4>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px]">
            <li><Link href="/about" className="footer-link text-neutral-300 no-underline hover:text-white">Về chúng tôi</Link></li>
            <li><Link href="/contact" className="footer-link text-neutral-300 no-underline hover:text-white">Liên hệ</Link></li>
            <li><Link href="/privacy-policy" className="footer-link text-neutral-300 no-underline hover:text-white">Chính sách bảo mật</Link></li>
            <li><Link href="/terms" className="footer-link text-neutral-300 no-underline hover:text-white">Điều khoản sử dụng</Link></li>
            <li><Link href="/affiliate-disclosure" className="footer-link text-neutral-300 no-underline hover:text-white">Công bố liên kết tiếp thị</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 sm:px-8">
        <p className="m-0 border-t border-white/[0.08] pt-5 text-[11px] leading-relaxed text-neutral-500">
          <strong className="text-neutral-300">Công bố liên kết tiếp thị:</strong>{' '}
          GoodPick có thể nhận hoa hồng khi bạn mua qua một số liên kết. Bạn không phải trả thêm phí và điều này không ảnh hưởng đến đánh giá biên tập.
        </p>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-[11px] text-neutral-500 sm:px-8">
        <p className="m-0">© {YEAR} {BRAND_NAME}. Bảo lưu mọi quyền.</p>
        <p className="m-0">Giá và tình trạng hàng có thể thay đổi tại website nhà bán lẻ.</p>
      </div>
    </footer>
  );
}
