'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Search } from 'lucide-react';

interface LocalCaseItem {
  id: string;
  patientName: string;
  patientId: string;
  accessionNumber?: string;
  modality?: string;
  studyDescription: string;
  seriesCount: number;
}

interface StitchCasesDropdownProps {
  currentCaseId?: string;
  onOpenPacsSearch?: () => void;
}

export function StitchCasesDropdown({ currentCaseId, onOpenPacsSearch }: StitchCasesDropdownProps) {
  const router = useRouter();
  const [localCases, setLocalCases] = useState<LocalCaseItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch('/api/cases')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.cases)) setLocalCases(d.cases);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-primary font-mono text-[11px] font-semibold transition-colors cursor-pointer"
        title="Switch active case or search PACS archive"
      >
        <span className="material-symbols-outlined text-[14px]">folder_open</span>
        <span>Cases ({localCases.length})</span>
        <span className="material-symbols-outlined text-[14px]">expand_more</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-outline-variant/40 flex items-center justify-between">
            <span>Diagnostic Case Registry</span>
            <span className="text-[9px] text-primary">Local Storage</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/30">
            {localCases.map((c) => {
              const isCurrent = currentCaseId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/workspace/${encodeURIComponent(c.id)}`);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-container text-on-surface flex items-center justify-between transition-colors ${
                    isCurrent ? 'bg-primary/10 border-l-2 border-primary font-bold' : ''
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-[11px] text-on-surface flex items-center gap-1.5">
                      {c.modality && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container-high text-primary font-mono font-bold">
                          {c.modality}
                        </span>
                      )}
                      <span className="truncate">{c.patientName}</span>
                    </div>
                    <div className="text-[10px] text-secondary truncate">{c.studyDescription}</div>
                  </div>
                  <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                    {c.seriesCount} ser
                  </span>
                </button>
              );
            })}
          </div>

          {onOpenPacsSearch && (
            <div className="p-1 border-t border-outline-variant/40 bg-surface-container/40">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenPacsSearch();
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-primary text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>Search Full PACS Archive (⌘⇧P)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
