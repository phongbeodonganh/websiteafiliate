"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import styles from "./stores.module.css";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export default function StoreCarousel({ children, count }: { children: ReactNode; count: number }) {
  const id = useId();
  const list = useRef<HTMLUListElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);
  const [autoplay, setAutoplay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [canScroll, setCanScroll] = useState(false);
  const [range, setRange] = useState({ start: 1, end: count });

  const measure = useCallback(() => {
    const element = list.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const visible = Array.from(element.children).flatMap((child, index) => {
      const rect = child.getBoundingClientRect();
      return rect.right > bounds.left + 24 && rect.left < bounds.right - 24 ? [index + 1] : [];
    });
    setCanScroll(element.scrollWidth > element.clientWidth + 4);
    if (visible.length) setRange((current) => {
      const start = visible[0], end = visible[visible.length - 1];
      return current.start === start && current.end === end ? current : { start, end };
    });
  }, []);

  const advance = useCallback((direction: number) => {
    const element = list.current;
    const first = element?.firstElementChild as HTMLElement | null;
    if (!element || !first) return;
    const step = first.offsetWidth + (parseFloat(getComputedStyle(element).columnGap) || 16);
    const lastPosition = element.scrollWidth - element.clientWidth;
    const next = element.scrollLeft + direction * step;
    const target = direction > 0
      ? element.scrollLeft >= lastPosition - 4 ? 0 : Math.min(next, lastPosition)
      : element.scrollLeft <= 4 ? lastPosition : Math.max(0, next);
    element.scrollTo({ left: target, behavior: reducedMotion ? "instant" : "smooth" });
  }, [reducedMotion]);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(element);
    return () => { resize.disconnect(); observer.disconnect(); };
  }, [measure, count]);

  useEffect(() => {
    if (!autoplay || reducedMotion || hovered || !inView || !pageVisible || !canScroll) return;
    const timer = window.setInterval(() => advance(1), 4200);
    return () => window.clearInterval(timer);
  }, [autoplay, reducedMotion, hovered, inView, pageVisible, canScroll, advance]);

  return <div className={styles.carousel} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={(event) => { if (!(event.target as HTMLElement).closest("[data-rotation-control]")) setAutoplay(false); }}>
    <div className={styles.carouselToolbar}>
      <p><span className={styles.liveDot} aria-hidden="true" /> {count} stores to explore {canScroll && <span className={styles.carouselHint}>· Swipe or use the arrows</span>}</p>
      <div className={styles.carouselControls} data-scrollable={canScroll}>
        <button type="button" data-rotation-control aria-controls={id} disabled={!canScroll || reducedMotion}
          aria-label={reducedMotion ? "Automatic scrolling disabled by your motion preference" : autoplay ? "Pause automatic scrolling" : "Start automatic scrolling"}
          onClick={() => setAutoplay((current) => !current)}>
          {autoplay && !reducedMotion ? <Pause size={15} /> : <Play size={15} />}<span>{autoplay && !reducedMotion ? "Pause" : "Play"}</span>
        </button>
        <button type="button" aria-label="Previous stores" aria-controls={id} disabled={!canScroll} onClick={() => { setAutoplay(false); advance(-1); }}><ArrowLeft size={19} /></button>
        <button type="button" aria-label="Next stores" aria-controls={id} disabled={!canScroll} onClick={() => { setAutoplay(false); advance(1); }}><ArrowRight size={19} /></button>
      </div>
    </div>
    <ul id={id} ref={list} className={styles.carouselList} data-sparse={count <= 3} aria-label="Featured stores" onScroll={measure}
      onPointerDown={() => setAutoplay(false)} onWheel={() => setAutoplay(false)}>
      {children}
    </ul>
    <div className={styles.carouselFooter}><span>Find a favourite. Discover something new.</span><span>{range.start}–{range.end} <span className={styles.rangeDivider}>/</span> {count}</span></div>
  </div>;
}
