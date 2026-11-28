'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface DesktopHistoryControlsProps {
  className?: string;
  showHome?: boolean;
}

export function DesktopHistoryControls({
  className = '',
  showHome = true,
}: DesktopHistoryControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(true);
  const isMobile = useIsMobile();

  const isAtlas = typeof window !== 'undefined' && window.location.hostname.includes('atlas');
  const homeRoute = isAtlas ? '/dashboard' : '/hmis';

  // Keyboard shortcut listener: Alt+Left for Back, Alt+Right for Forward, Ctrl+R for Reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an active input/textarea
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        window.history.back();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        window.history.forward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBack = () => {
    try {
      // Allow active components (e.g. Atlas slice viewer) to intercept Back and close overlays/sub-views
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('radsuite:history-back', { cancelable: true });
        const wasHandled = !window.dispatchEvent(event);
        if (wasHandled) return;
      }

      if (pathname?.startsWith('/workstation/') || pathname?.startsWith('/workspace/')) {
        router.push(homeRoute);
      } else if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        router.push(homeRoute);
      }
    } catch {
      router.push(homeRoute);
    }
  };

  const handleForward = () => {
    try {
      window.history.forward();
    } catch {
      // Ignore
    }
  };

  const handleReload = () => {
    try {
      if (
        typeof window !== 'undefined' &&
        (document.title.toLowerCase().includes('404') ||
          document.title.toLowerCase().includes('not found') ||
          document.title.toLowerCase().includes('error'))
      ) {
        router.push(homeRoute);
        return;
      }
      window.location.reload();
    } catch {
      router.push(homeRoute);
    }
  };

  if (isMobile) {
    return null;
  }

  return (
    <div
      role="navigation"
      aria-label="Desktop History Navigation"
      className={`hidden md:inline-flex items-center gap-0.5 bg-surface-container/60 border border-outline-variant/60 rounded-lg p-0.5 select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleBack}
        title="Go Back (Alt + Left Arrow)"
        aria-label="Go back"
        className="p-1.5 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleForward}
        title="Go Forward (Alt + Right Arrow)"
        aria-label="Go forward"
        className="p-1.5 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
      >
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleReload}
        title="Reload Viewport (Ctrl + R)"
        aria-label="Reload current view"
        className="p-1.5 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {showHome && pathname !== homeRoute && (
        <>
          <div className="h-3 w-px bg-outline-variant/60 mx-0.5" />
          <button
            type="button"
            onClick={() => router.push(homeRoute)}
            title={isAtlas ? 'Academy Command Center' : 'Hospital Worklist'}
            aria-label="Navigate to home"
            className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
