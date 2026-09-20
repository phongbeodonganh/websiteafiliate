'use client';

import { ArrowUp, Bookmark, Check, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './ArticleReadingTools.module.css';

export default function ArticleReadingTools({ contentId, slug }: { contentId: string; slug: string }) {
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState(0);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const storedSize = Number(localStorage.getItem('aidealsuk-reading-size') || 0);
        setSize(Number.isFinite(storedSize) ? Math.max(-1, Math.min(3, storedSize)) : 0);
        setSaved(localStorage.getItem(`aidealsuk-saved:${slug}`) === 'true');
      } catch { /* Reading controls still work when browser storage is unavailable. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [slug]);

  useEffect(() => {
    const content = document.getElementById(contentId);
    if (!content) return;
    content.style.setProperty('--reader-size-adjust', `${size * 2}px`);
    return () => { content.style.removeProperty('--reader-size-adjust'); };
  }, [contentId, size]);

  useEffect(() => {
    const content = document.getElementById(contentId);
    if (!content) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = content.getBoundingClientRect();
      const start = rect.top + window.scrollY - window.innerHeight * 0.35;
      const distance = Math.max(1, rect.height - window.innerHeight * 0.35);
      setProgress(Math.round(Math.min(1, Math.max(0, (window.scrollY - start) / distance)) * 100));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [contentId]);

  function changeSize(next: number) {
    setSize(next);
    try { localStorage.setItem('aidealsuk-reading-size', String(next)); } catch { /* Size applies for this visit. */ }
  }
  function toggleSaved() {
    try {
      if (saved) localStorage.removeItem(`aidealsuk-saved:${slug}`);
      else localStorage.setItem(`aidealsuk-saved:${slug}`, 'true');
      setSaved(!saved);
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  return <>
    <div className={styles.progress} role="progressbar" aria-label="Article reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
    <div className={styles.toolbar} ref={toolbarRef} aria-label="Reading tools">
      <span className={styles.progressLabel}>{progress === 100 ? <Check size={14} aria-hidden="true" /> : <span className={styles.dot} />}<span>{progress === 100 ? 'You’re all caught up' : `${progress}% read`}</span></span>
      <div className={styles.actions}>
        <div className={styles.sizeControls} role="group" aria-label="Article text size"><button type="button" aria-label="Decrease article text size" disabled={size <= -1} onClick={() => changeSize(size - 1)}><Minus size={14} /></button><span aria-hidden="true">Aa</span><button type="button" aria-label="Increase article text size" disabled={size >= 3} onClick={() => changeSize(size + 1)}><Plus size={14} /></button></div>
        <button type="button" className={styles.save} aria-label={saved ? 'Remove bookmark from this browser' : 'Bookmark article in this browser'} aria-pressed={saved} onClick={toggleSaved}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /><span>{saved ? 'Bookmarked' : 'Bookmark'}</span></button>
      </div>
      {storageError && <p className={styles.storageError} role="status">Your browser couldn’t save this bookmark.</p>}
    </div>
    {progress > 15 && <button className={styles.backToReading} type="button" aria-label="Back to start of article" onClick={() => toolbarRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}><ArrowUp size={18} /></button>}
  </>;
}
