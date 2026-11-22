'use client';

// Layer 4 (Presentation): Prior Studies Popover Badge (<100 lines)
import React, { useState, useRef, useEffect } from 'react';
import { formatDicomDateTime } from '@/lib/utils';

export interface WorklistPriorBadgeProps {
  priorStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
    reportId?: string;
  }[];
  onSelectMrn?: () => void;
}

export function WorklistPriorBadge({
  priorStudies = [],
  onSelectMrn,
}: WorklistPriorBadgeProps) {
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

  if (!priorStudies || priorStudies.length === 0) return null;
  const count = priorStudies.length;

  return (
    <div className="relative inline-block" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 cursor-pointer hover:bg-amber-500/25 transition-colors shadow-2xs"
        title={`Patient has ${count} prior examination${count > 1 ? 's' : ''}. Click to view prior history.`}
      >
        <span>📜</span>
        <span>{count} Prior{count > 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 p-2.5 bg-card border border-outline-variant/80 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
          <div className="text-[11px] font-bold text-on-surface mb-1 flex items-center justify-between">
            <span>Prior Examinations ({count})</span>
            {onSelectMrn && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelectMrn();
                }}
                className="text-[10px] text-primary hover:underline cursor-pointer font-normal"
              >
                Filter patient history
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {priorStudies.map((ps) => (
              <a
                key={ps.accessionNumber}
                href={`/workspace/${encodeURIComponent(ps.accessionNumber)}`}
                className="block p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[10px] text-primary group-hover:underline">
                    {ps.accessionNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    {ps.studyDate && (
                      <span className="text-[9px] text-secondary font-mono">
                        {formatDicomDateTime(ps.studyDate)}
                      </span>
                    )}
                    <span className="text-[8px] px-1 rounded bg-surface-container-highest text-secondary capitalize font-semibold">
                      {ps.status || 'final'}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-on-surface truncate mt-0.5">
                  {ps.modality ? `[${ps.modality}] ` : ''}{ps.studyDescription}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
