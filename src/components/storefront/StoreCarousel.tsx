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

export default function StoreCarousel({ children, count, itemName = "stores", label = "Featured stores", className = "" }: {
  children: ReactNode; count: number; itemName?: string; label?: string; className?: string;
}) {
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
    // Convert a conventional mouse wheel into horizontal browsing. Let the page
    // continue scrolling at either edge, and preserve native horizontal gestures.
    let wheelEnd: number | undefined;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      const max = element.scrollWidth - element.clientWidth;
      if ((delta > 0 && element.scrollLeft >= max - 2) || (delta < 0 && element.scrollLeft <= 2)) return;
      event.preventDefault();
      // Accumulate small trackpad/wheel deltas before snapping to a card.
      // Mandatory snapping after each tiny delta would keep returning to the start.
      window.clearTimeout(wheelEnd);
      element.style.scrollSnapType = "none";
      element.scrollLeft += delta;
      wheelEnd = window.setTimeout(() => { element.style.scrollSnapType = ""; }, 180);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(element);
    return () => { resize.disconnect(); observer.disconnect(); element.removeEventListener("wheel", wheel); window.clearTimeout(wheelEnd); element.style.scrollSnapType = ""; };
  }, [measure, count]);

  useEffect(() => {
    if (!autoplay || reducedMotion || hovered || !inView || !pageVisible || !canScroll) return;
    const timer = window.setInterval(() => advance(1), 3000);
    return () => window.clearInterval(timer);
  }, [autoplay, reducedMotion, hovered, inView, pageVisible, canScroll, advance]);

  return <div className={`${styles.carousel} ${className}`} role="region" aria-label={label} aria-roledescription="carousel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={(event) => { if (!(event.target as HTMLElement).closest("[data-rotation-control]")) setAutoplay(false); }}>
    <div className={styles.carouselToolbar}>
      <p><span className={styles.liveDot} aria-hidden="true" /> {count} {itemName} to explore {canScroll && <span className={styles.carouselHint}>· Scroll to explore</span>}</p>
      <div className={styles.carouselControls} data-scrollable={canScroll}>
        <button type="button" data-rotation-control aria-controls={id} disabled={!canScroll || reducedMotion}
          aria-label={reducedMotion ? "Automatic scrolling disabled by your motion preference" : autoplay ? "Pause automatic scrolling" : "Start automatic scrolling"}
          onClick={() => setAutoplay((current) => !current)}>
          {autoplay && !reducedMotion ? <Pause size={15} /> : <Play size={15} />}<span>{autoplay && !reducedMotion ? "Pause" : "Play"}</span>
        </button>
        <button type="button" aria-label={`Previous ${itemName}`} aria-controls={id} disabled={!canScroll} onClick={() => { setAutoplay(false); advance(-1); }}><ArrowLeft size={19} /></button>
        <button type="button" aria-label={`Next ${itemName}`} aria-controls={id} disabled={!canScroll} onClick={() => { setAutoplay(false); advance(1); }}><ArrowRight size={19} /></button>
      </div>
    </div>
    <ul id={id} ref={list} className={styles.carouselList} data-sparse={count <= 3} aria-label={label} tabIndex={0} onScroll={measure}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault(); setAutoplay(false); advance(event.key === "ArrowRight" ? 1 : -1);
      }}
      onPointerDown={() => setAutoplay(false)} onWheel={() => setAutoplay(false)}>
      {children}
    </ul>
    <div className={styles.carouselFooter}><span>Find a favourite. Discover something new.</span><span>{range.start}–{range.end} <span className={styles.rangeDivider}>/</span> {count}</span></div>
  </div>;
}
