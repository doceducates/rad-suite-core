'use client';

// Layer 4 (Presentation): Multi-Study Popover Badge (<110 lines)
import React, { useState, useRef, useEffect } from 'react';

export interface WorklistMultiStudyBadgeProps {
  count?: number;
  companionStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
    isFilmCharges?: boolean;
  }[];
  onSelectMrn?: () => void;
}

export function WorklistMultiStudyBadge({
  count,
  companionStudies,
  onSelectMrn,
}: WorklistMultiStudyBadgeProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 inline-flex items-center gap-1 cursor-pointer hover:bg-sky-500/25 transition-colors shadow-2xs"
        title={`This patient has ${count || 2} orders/studies. Click to view companion exams.`}
      >
        <span>📚</span>
        <span>{count || 2} Studies</span>
      </button>

      {open && companionStudies && companionStudies.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-72 p-2.5 bg-card border border-outline-variant/80 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
          <div className="text-[11px] font-bold text-on-surface mb-1 flex items-center justify-between">
            <span>Companion Studies ({companionStudies.length})</span>
            {onSelectMrn && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelectMrn();
                }}
                className="text-[10px] text-primary hover:underline cursor-pointer font-normal"
              >
                Filter table
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {companionStudies.map((cs) => (
              <a
                key={cs.accessionNumber}
                href={`/workspace/${encodeURIComponent(cs.accessionNumber)}`}
                className="block p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-primary group-hover:underline">
                    {cs.accessionNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    {cs.isFilmCharges && (
                      <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        Film
                      </span>
                    )}
                    <span className="text-[9px] text-secondary capitalize">{cs.status || 'scheduled'}</span>
                  </div>
                </div>
                <div className="text-[10px] text-on-surface truncate mt-0.5">
                  {cs.modality ? `[${cs.modality}] ` : ''}{cs.studyDescription}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
