'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import styles from './ArticleTableOfContents.module.css';

interface ArticleTableOfContentsProps {
  contentId: string;
}

interface ContentsItem {
  id: string;
  level: 2 | 3;
  text: string;
}

function headingId(value: string, index: number) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `section-${index + 1}`;
}

export default function ArticleTableOfContents({ contentId }: ArticleTableOfContentsProps) {
  const [items, setItems] = useState<ContentsItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const usedIds = new Set<string>();
    const headings = Array.from(content.querySelectorAll<HTMLHeadingElement>('h2, h3'));
    const nextItems = headings.map((heading, index) => {
      const text = heading.textContent?.replace(/\s+/g, ' ').trim() || `Section ${index + 1}`;
      const baseId = heading.id || headingId(text, index);
      let id = baseId;
      let suffix = 2;

      while (usedIds.has(id) || (document.getElementById(id) && document.getElementById(id) !== heading)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      heading.id = id;
      usedIds.add(id);
      return { id, level: heading.tagName === 'H3' ? 3 : 2, text } as ContentsItem;
    });

    // Measure the current position, including headings skipped by a fast scroll.
    // IntersectionObserver only reports crossings and can leave an old section active.
    let scrollFrame = 0;
    const updateActiveHeading = () => {
      scrollFrame = 0;
      const readingLine = Math.min(180, window.innerHeight * 0.25);
      let currentId = nextItems[0]?.id || '';
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > readingLine) break;
        currentId = heading.id;
      }
      setActiveId(currentId);
    };
    const scheduleUpdate = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateActiveHeading);
    };
    const updateFrame = window.requestAnimationFrame(() => {
      setItems(nextItems);
      updateActiveHeading();
    });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(updateFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [contentId]);

  useEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
    const stickyRail = nav?.closest<HTMLElement>('[data-toc-rail="true"]');
    if (!activeLink || !stickyRail || stickyRail.scrollHeight <= stickyRail.clientHeight) return;

    const linkBounds = activeLink.getBoundingClientRect();
    const railBounds = stickyRail.getBoundingClientRect();
    const safeTop = railBounds.top + 24;
    const safeBottom = railBounds.bottom - 24;
    if (linkBounds.top >= safeTop && linkBounds.bottom <= safeBottom) return;

    const nextScrollTop = stickyRail.scrollTop
      + linkBounds.top
      - railBounds.top
      - stickyRail.clientHeight * 0.32;
    stickyRail.scrollTo({
      top: Math.max(0, nextScrollTop),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [activeId]);

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const heading = document.getElementById(id);
    if (!heading) return;

    setActiveId(id);
    window.history.pushState(null, '', `#${id}`);
    const headerOffset = window.innerWidth < 640 ? 88 : 126;
    const targetTop = heading.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  if (items.length === 0) return null;

  return (
    <nav ref={navRef} className={styles.toc} aria-label="Table of contents">
      <div className={styles.header}>
        <p>Reading signal</p>
        <span>{String(items.length).padStart(2, '0')} sections</span>
      </div>
      <h2>On this page</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-level={item.level} data-active={activeId === item.id ? 'true' : undefined}>
            <a href={`#${item.id}`} aria-current={activeId === item.id ? 'location' : undefined} onClick={(event) => goToSection(event, item.id)}>
              <span aria-hidden="true" />
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
