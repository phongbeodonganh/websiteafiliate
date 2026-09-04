'use client';

import { useEffect, useState } from 'react';
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

    const updateFrame = window.requestAnimationFrame(() => {
      setItems(nextItems);
      setActiveId(nextItems[0]?.id || '');
    });

    const observer = nextItems.length > 0 && 'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            const current = visible[0]?.target as HTMLElement | undefined;
            if (current?.id) setActiveId(current.id);
          },
          { rootMargin: '-110px 0px -68% 0px', threshold: [0, 1] },
        )
      : null;

    headings.forEach((heading) => observer?.observe(heading));
    return () => {
      window.cancelAnimationFrame(updateFrame);
      observer?.disconnect();
    };
  }, [contentId]);

  if (items.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label="Table of contents">
      <div className={styles.header}>
        <p>Reading signal</p>
        <span>{String(items.length).padStart(2, '0')} sections</span>
      </div>
      <h2>On this page</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-level={item.level} data-active={activeId === item.id ? 'true' : undefined}>
            <a href={`#${item.id}`} onClick={() => setActiveId(item.id)}>
              <span aria-hidden="true" />
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
