'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, RotateCcw, FileText, ExternalLink, AlertTriangle, FileDown, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZenReportFooterMenuProps {
  onRevertHmis?: () => void;
  revertingHmis?: boolean;
  onOpenHmisOptions?: () => void;
  onSyncGoogleDoc?: () => void;
  syncingGoogleDoc?: boolean;
  googleDocUrl?: string | null;
  onExportPdf?: () => void;
  exportingPdf?: boolean;
  onExportDocx?: () => void;
  exportingDocx?: boolean;
}

export function ZenReportFooterMenu({
  onRevertHmis,
  revertingHmis = false,
  onOpenHmisOptions,
  onSyncGoogleDoc,
  syncingGoogleDoc = false,
  googleDocUrl,
  onExportPdf,
  exportingPdf = false,
  onExportDocx,
  exportingDocx = false,
}: ZenReportFooterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setIsOpen(false);
        setShowRevertConfirm(false);
      } else if (e instanceof MouseEvent && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRevertConfirm(false);
      }
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleDown);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleDown);
    };
  }, [isOpen]);

  const handleConfirmRevert = () => {
    setShowRevertConfirm(false);
    setIsOpen(false);
    onRevertHmis?.();
  };

  return (
    <div ref={menuRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowRevertConfirm(false);
        }}
        title="More export & sync actions"
        className={cn(
          'h-8 w-8 rounded-xl border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface flex items-center justify-center transition-all cursor-pointer shadow-2xs',
          isOpen && 'bg-surface-container-high border-primary/50 text-primary'
        )}
        aria-label="More reporting actions"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 rounded-xl bg-surface-container-highest/98 backdrop-blur-xl border border-outline-variant/80 shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs text-on-surface animate-in fade-in zoom-in-95 duration-100">
          {/* Export to PDF */}
          {onExportPdf && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportPdf();
              }}
              disabled={exportingPdf}
              className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer disabled:opacity-50 text-left"
            >
              <FileDown className={cn('w-3.5 h-3.5 shrink-0', exportingPdf && 'animate-bounce')} />
              <span className="flex-1">{exportingPdf ? 'Exporting PDF...' : 'Export to PDF'}</span>
            </button>
          )}

          {/* Export to Word (.docx) */}
          {onExportDocx && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportDocx();
              }}
              disabled={exportingDocx}
              className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container text-sky-600 dark:text-sky-400 font-medium transition-colors cursor-pointer disabled:opacity-50 text-left"
            >
              <FileText className={cn('w-3.5 h-3.5 shrink-0', exportingDocx && 'animate-bounce')} />
              <span className="flex-1">{exportingDocx ? 'Exporting Word...' : 'Export to Word (.docx)'}</span>
            </button>
          )}

          {/* Divider between file exports and cloud sync */}
          {(onExportPdf || onExportDocx) && (onOpenHmisOptions || onRevertHmis || onSyncGoogleDoc || googleDocUrl) && (
            <div className="h-px bg-outline-variant/40 my-0.5" />
          )}

          {/* HMIS Options (Dual-Verify & Audit) */}
          {onOpenHmisOptions && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenHmisOptions();
              }}
              className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container text-teal-600 dark:text-teal-400 font-medium transition-colors cursor-pointer text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">HMIS Options (Dual-Verify)...</span>
            </button>
          )}

          {/* Divider between HMIS and Google Docs */}
          {(onOpenHmisOptions || onRevertHmis) && (onSyncGoogleDoc || googleDocUrl) && (
            <div className="h-px bg-outline-variant/40 my-0.5" />
          )}

          {/* Google Docs Sync */}
          {onSyncGoogleDoc && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSyncGoogleDoc();
              }}
              disabled={syncingGoogleDoc}
              className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer disabled:opacity-50 text-left"
            >
              <FileText className={cn('w-3.5 h-3.5 shrink-0', syncingGoogleDoc && 'animate-bounce')} />
              <span className="flex-1">{syncingGoogleDoc ? 'Syncing Drive...' : googleDocUrl ? 'Update Google Doc' : 'Sync to Google Docs'}</span>
            </button>
          )}

          {/* Open Google Doc in new tab */}
          {googleDocUrl && (
            <a
              href={googleDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-surface-container text-blue-600 dark:text-blue-400 font-medium transition-colors cursor-pointer text-left"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">Open in Google Docs</span>
            </a>
          )}

          {/* Divider if HMIS revert exists */}
          {onRevertHmis && (onSyncGoogleDoc || googleDocUrl) && (
            <div className="h-px bg-outline-variant/40 my-0.5" />
          )}

          {/* Revert HMIS with safety confirm step */}
          {onRevertHmis && (
            <div>
              {!showRevertConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowRevertConfirm(true)}
                  disabled={revertingHmis}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium transition-colors cursor-pointer text-left"
                >
                  <RotateCcw className={cn('w-3.5 h-3.5 shrink-0', revertingHmis && 'animate-spin')} />
                  <span className="flex-1">{revertingHmis ? 'Reverting...' : 'Revert HMIS Template'}</span>
                </button>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset HMIS draft?</span>
                  </div>
                  <p className="text-secondary text-[10px] leading-tight">
                    This reverts the online HMIS draft to the default blank/normal template.
                  </p>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRevertConfirm(false)}
                      className="px-2 py-0.5 rounded text-secondary hover:text-foreground hover:bg-surface-container cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRevert}
                      className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                    >
                      Confirm Revert
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
