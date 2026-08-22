'use client';

import { useEffect } from 'react';

const MOTION_SELECTOR = '[data-motion]';

export default function PublicMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      document.querySelectorAll<HTMLElement>(MOTION_SELECTOR).forEach((element) => {
        element.dataset.motionVisible = 'true';
      });
      return;
    }

    root.classList.add('public-motion-ready');
    const intersectionObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.motionVisible = 'true';
        intersectionObserver.unobserve(entry.target);
      }),
      { rootMargin: '0px 0px 75% 0px', threshold: 0.01 },
    );

    const observe = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>(MOTION_SELECTOR).forEach((element) => {
        if (element.dataset.motionObserved === 'true') return;
        element.dataset.motionObserved = 'true';
        intersectionObserver.observe(element);
      });
    };

    observe(document);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        observe(node.matches(MOTION_SELECTOR) ? node.parentElement || document : node);
      }));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      document.querySelectorAll<HTMLElement>('[data-motion-observed="true"]').forEach((element) => {
        delete element.dataset.motionObserved;
      });
      root.classList.remove('public-motion-ready');
    };
  }, []);

  return null;
}
