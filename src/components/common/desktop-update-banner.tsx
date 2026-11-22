'use client';

import React from 'react';
import { Download, Sparkles, X, ArrowRight } from 'lucide-react';
import { useDesktopUpdate } from '@/hooks/use-desktop-update';
import { Button } from '@/components/ui/button';

export function DesktopUpdateBanner() {
  const { updateAvailable, latestRelease, dismissUpdate } = useDesktopUpdate();

  if (!updateAvailable || !latestRelease) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full p-4 rounded-2xl bg-surface-container-high/95 backdrop-blur-md border border-primary/30 shadow-xl shadow-black/20 animate-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <Sparkles className="w-4 h-4" />
          <span>New Desktop Update Available</span>
        </div>
        <button
          type="button"
          onClick={dismissUpdate}
          className="text-secondary hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
          aria-label="Dismiss update notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-2 space-y-1.5 text-xs">
        <div className="font-semibold text-on-surface">
          Rad Suite v{latestRelease.version} is now ready
        </div>
        <p className="text-secondary text-[11px] leading-relaxed line-clamp-2">
          {latestRelease.releaseNotes?.[0] || 'Performance improvements and bug fixes.'}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={dismissUpdate} className="text-xs h-7 px-2.5 text-secondary">
          Later
        </Button>
        <a href="/api/download/desktop" className="inline-flex">
          <Button size="sm" className="text-xs h-7 gap-1 px-3 bg-primary text-on-primary font-semibold">
            <Download className="w-3 h-3" />
            <span>Update Now</span>
          </Button>
        </a>
      </div>
    </div>
  );
}
