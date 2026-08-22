'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Back-to-Top Floating Action Button
 * Appears smoothly when scrolling down past 300px.
 * Triggers an elastic smooth scroll to the top of the page.
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      title="Back to top"
      className="fixed bottom-6 right-6 z-[950] flex h-11 w-11 items-center justify-center border border-white/20 bg-black/90 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/50 hover:bg-black hover:shadow-[#0D766E]/20 active:scale-95 animate-in fade-in slide-in-from-bottom-4"
    >
      <ArrowUp size={18} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
