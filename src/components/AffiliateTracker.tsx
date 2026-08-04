'use client';

import { useEffect } from 'react';

export default function AffiliateTracker() {
  useEffect(() => {
    const handleAffiliateClick = async (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const affId = target.getAttribute('data-affiliate-id');
      const artId = target.getAttribute('data-article-id');

      if (affId && artId) {
        // Gửi tracking API ẩn dưới nền theo Luồng 1 (Spec section 3)
        try {
          fetch('/api/v1/public/tracking/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              article_id: Number(artId),
              affiliate_link_id: Number(affId),
            }),
          }).catch(() => {});
        } catch (err) {
          console.error('Tracking call error:', err);
        }
      }
    };

    document.addEventListener('click', handleAffiliateClick);
    return () => document.removeEventListener('click', handleAffiliateClick);
  }, []);

  return null;
}
