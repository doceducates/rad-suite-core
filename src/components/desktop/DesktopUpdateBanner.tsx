'use client';

import React from 'react';
import { useDesktopUpdater } from '@/hooks/useDesktopUpdater';
import { Button } from '@/components/ui/button';
import { Sparkles, Download, RefreshCw, X, ArrowUpCircle } from 'lucide-react';

export function DesktopUpdateBanner() {
  const {
    isDesktop,
    updateAvailable,
    updateVersion,
    updateNotes,
    isDownloading,
    downloadProgress,
    downloadAndInstall,
    dismissBanner,
  } = useDesktopUpdater();

  if (!isDesktop || !updateAvailable) return null;

  return (
    <aside
      aria-label="Desktop Update Notification"
      className="fixed bottom-4 right-4 z-50 max-w-md w-full bg-slate-900/95 border border-sky-500/30 text-white rounded-xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 select-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Update Available</span>
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.2 rounded-full">
                v{updateVersion}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {updateNotes || 'A new Alpha patch is ready with improvements for LGH PACS and reporting.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissBanner}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          title="Dismiss update notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isDownloading && (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-300 font-mono">
            <span>Downloading patch...</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissBanner}
          className="text-xs text-slate-400 hover:text-white h-7 px-2.5"
        >
          Later
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={downloadAndInstall}
          disabled={isDownloading}
          className="text-xs h-7 px-3 gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm"
        >
          {isDownloading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Update & Restart
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
