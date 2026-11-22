'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Search, Users, Zap, ExternalLink, X, ArrowUpDown } from 'lucide-react';
import { ReportSectionDots, ReportSectionsState } from './report-section-dots';
import { usePatientQueue } from '@/hooks/use-patient-queue';
import { useNextCasePrewarm } from '@/hooks/use-next-case-prewarm';
import { ZenPatientQueueItem } from './zen-patient-queue-item';
import type { PacsStudyResult } from '@/types/pacs';

interface ZenPatientQueueDropdownProps {
  currentAccession?: string;
  currentCaseId?: string;
  currentPatientName?: string;
  currentSections?: ReportSectionsState;
  currentUserId?: string;
  onOpenPacsSearch?: () => void;
}

export function ZenPatientQueueDropdown({
  currentAccession,
  currentCaseId,
  currentPatientName,
  currentSections,
  currentUserId,
  onOpenPacsSearch,
}: ZenPatientQueueDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    cases,
    filteredCases,
    loading,
    search,
    setSearch,
    scope,
    setScope,
    sortField,
    sortOrder,
    toggleSort,
    nextCase,
    nextIncompleteCase,
    activeDisplaySections,
  } = usePatientQueue({
    isOpen,
    currentAccession,
    currentCaseId,
    currentSections,
    currentUserId,
  });

  // Predictive Next-Case Pre-Warming: Pre-loads next case manifest and first slice during idle
  useNextCasePrewarm({ nextCase });

  // Close dropdown on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectCase = (target: PacsStudyResult) => {
    setIsOpen(false);
    const identifier = target.accessionNumber || target.localCaseId || target.studyId || target.studyInstanceUid;
    if (identifier) {
      const savedMode = typeof window !== 'undefined' ? localStorage.getItem('radsuite_reporting_mode') : null;
      const query = savedMode ? `?mode=${savedMode}` : '';
      router.push(`/workspace/${encodeURIComponent(identifier)}${query}`);
    }
  };

  const handleNextClick = () => {
    const target = nextCase;
    if (target) handleSelectCase(target);
  };

  return (
    <div className="relative shrink-0 flex items-center gap-1" ref={dropdownRef}>
      {/* Primary Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 hover:border-primary/50 text-on-surface text-xs font-semibold transition-all shadow-2xs group cursor-pointer"
        title="Open Patient Queue & Switch Case (Shows History, Findings, Impression status)"
      >
        <Users className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
        <span className="font-medium truncate max-w-[130px] hidden sm:inline">
          {currentPatientName && currentPatientName !== 'No Study Loaded' ? currentPatientName : 'Patient Queue'}
        </span>
        {/* 3 Indicator Dots for Active Case */}
        <ReportSectionDots sections={activeDisplaySections} size="xs" showLabels={false} />
        <ChevronDown className={`w-3.5 h-3.5 text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Fast 1-Click Next Patient Shortcut */}
      {nextCase && (
        <button
          type="button"
          onClick={handleNextClick}
          className="hidden md:inline-flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-surface-container hover:bg-primary hover:text-on-primary text-secondary border border-outline-variant/50 hover:border-primary transition-all cursor-pointer shadow-2xs group"
          title={`Next patient in queue (${sortField} ${sortOrder}): ${nextCase.patientName} (${nextCase.modality})`}
        >
          <span>Next</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-84 sm:w-96 bg-surface-container-lowest border border-outline-variant/70 rounded-xl shadow-2xl py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Search */}
          <div className="px-3 pb-2 border-b border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-bold text-xs text-on-surface">
                  Taken Up Cases
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-surface-container-high text-secondary">
                  {filteredCases.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
                title="Close queue menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by patient, MRN, accession..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-secondary/60 border border-outline-variant/50 focus:border-primary focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Scope Filter Chips */}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${scope === 'mine' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:text-on-surface'}`}
                title="Taken up from today and yesterday (last 48 hours)"
              >
                48 Hours
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${scope === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:text-on-surface'}`}
                title="All backlog cases assigned to you"
              >
                All Backlog
              </button>
              <button
                type="button"
                onClick={() => setScope('incomplete')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${scope === 'incomplete' ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary hover:text-on-surface'}`}
                title="Cases missing history, findings, or impression"
              >
                Incomplete
              </button>
            </div>
          </div>

          {/* Interactive Column Sort Header Bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-surface-container/60 border-b border-outline-variant/30 text-[10px] font-semibold text-secondary select-none">
            <button
              type="button"
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1 hover:text-on-surface transition-colors cursor-pointer ${sortField === 'name' ? 'text-primary font-bold' : ''}`}
              title="Sort by patient name (A-Z / Z-A)"
            >
              <span>Patient</span>
              {sortField === 'name' ? (
                <span className="text-[9px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-35" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleSort('date')}
              className={`flex items-center gap-1 hover:text-on-surface transition-colors cursor-pointer ${sortField === 'date' ? 'text-primary font-bold' : ''}`}
              title="Sort by scan / claim date (Newest / Oldest)"
            >
              <span>Time</span>
              {sortField === 'date' ? (
                <span className="text-[9px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-35" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleSort('status')}
              className={`flex items-center gap-1 hover:text-on-surface transition-colors cursor-pointer ${sortField === 'status' ? 'text-primary font-bold' : ''}`}
              title="Sort by completion status (History, Findings, Impression)"
            >
              <span>Status (HFI)</span>
              {sortField === 'status' ? (
                <span className="text-[9px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
              ) : (
                <ArrowUpDown className="w-2.5 h-2.5 opacity-35" />
              )}
            </button>
          </div>

          {/* Quick Jump Action Banner */}
          {nextIncompleteCase && (
            <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Next Unreported Patient
                </span>
                <div className="text-xs font-semibold text-on-surface truncate">{nextIncompleteCase.patientName}</div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectCase(nextIncompleteCase)}
                className="px-2.5 py-1 rounded bg-primary text-on-primary text-[10px] font-bold hover:bg-primary/90 transition-colors shrink-0"
              >
                Report ↗
              </button>
            </div>
          )}

          {/* Scrollable Patient List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20">
            {loading && cases.length === 0 ? (
              <div className="py-6 text-center text-xs text-secondary">Loading patient queue...</div>
            ) : filteredCases.length === 0 ? (
              <div className="py-6 text-center px-4 space-y-2">
                <p className="text-xs text-secondary">
                  {scope === 'mine'
                    ? 'No taken up cases from today or yesterday.'
                    : scope === 'all'
                    ? 'No cases found in your backlog.'
                    : 'All assigned cases have reports completed!'}
                </p>
                {scope === 'mine' && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-[11px] text-primary font-semibold border border-outline-variant/60 cursor-pointer"
                    >
                      View All Backlog (Mine)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsOpen(false); router.push('/worklist'); }}
                      className="px-2 py-1 rounded bg-primary text-on-primary text-[11px] font-semibold hover:bg-primary/90 cursor-pointer"
                    >
                      Take Up in HMIS ↗
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredCases.map((c) => {
                const isCur =
                  (currentAccession && c.accessionNumber?.toUpperCase() === currentAccession.toUpperCase()) ||
                  (currentCaseId && (c.localCaseId === currentCaseId || c.studyId === currentCaseId || c.studyInstanceUid === currentCaseId));

                return (
                  <ZenPatientQueueItem
                    key={c.accessionNumber || c.localCaseId || c.studyInstanceUid}
                    study={c}
                    isCurrent={Boolean(isCur)}
                    onSelect={handleSelectCase}
                  />
                );
              })
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-3 pt-2 mt-1 border-t border-outline-variant/40 flex items-center justify-between text-xs">
            {onOpenPacsSearch && (
              <button
                type="button"
                onClick={() => { setIsOpen(false); onOpenPacsSearch(); }}
                className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>Search Archive (⌘K)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsOpen(false); router.push('/worklist?tab=my_cases'); }}
              className="text-secondary hover:text-on-surface text-[11px] font-medium flex items-center gap-1 ml-auto cursor-pointer"
              title="Open HMIS Patients worklist filtered to your taken up cases"
            >
              <span>Taken Up Worklist</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
