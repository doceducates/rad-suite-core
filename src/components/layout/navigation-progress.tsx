'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Lightweight zero-dependency top navigation progress bar.
 * Activates immediately on internal link clicks or `radsuite:nav-start` events,
 * and completes smoothly once Next.js finishes transitioning routes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimers = () => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
    if (finishRef.current) {
      clearTimeout(finishRef.current);
      finishRef.current = null;
    }
  };

  const start = () => {
    clearTimers();
    activeRef.current = true;
    setVisible(true);
    setProgress(18);

    trickleRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const step = prev < 50 ? 9 : prev < 75 ? 4 : 1.5;
        return Math.min(88, prev + step);
      });
    }, 180);

    // Safety cap so a cancelled/aborted transition never leaves the bar stuck
    safetyRef.current = setTimeout(() => {
      done();
    }, 15000);
  };

  const done = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    finishRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  };

  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      try {
        const target = new URL(anchor.href, window.location.href);
        if (target.origin !== window.location.origin) return;
        const current = window.location.pathname + window.location.search;
        const next = target.pathname + target.search;
        if (next === current) return;
        start();
      } catch {
        // Ignore malformed URLs
      }
    };

    const handleCustomStart = () => start();

    document.addEventListener('click', handleClick, true);
    window.addEventListener('radsuite:nav-start', handleCustomStart);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('radsuite:nav-start', handleCustomStart);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary-fixed-dim to-primary transition-all duration-200 ease-out shadow-xs shadow-primary/40"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
