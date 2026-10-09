'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Back-to-Top Floating Action Button
 * Appears smoothly when scrolling down past 300px.
 * Uses opacity/transform only, so showing the control never shifts layout.
 */
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Quay về đầu trang"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      title="Quay về đầu trang"
      className={`group fixed bottom-5 right-5 z-[950] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#123f35] text-white shadow-[0_10px_30px_rgba(18,63,53,.28)] transition-[opacity,transform,background-color] duration-300 hover:bg-[#0d3029] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#f4c95d] ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
    >
      <ArrowUp size={18} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
