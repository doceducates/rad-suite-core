'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PositiveFindingsCards } from './positive-findings-cards';
import { ConsultantPatcherPanel } from './consultant-patcher-panel';
import { SignoutDrawerHeader } from './signout-drawer-header';
import { getSignoutTemplate, isSectionPositive } from '@/services/templates/signout-templates.data';
import { SignoutTemplate, ExtractedPositiveSection, ConsultantPatchResult } from '@/types/signout';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { notify } from '@/services/notification.service';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface SignoutWorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  modality?: string;
  studyDescription?: string;
  pgrName: string;
  initialFocusedSectionId?: string | null;
}

export function SignoutWorkspaceDrawer({
  isOpen,
  onClose,
  report,
  setReport,
  modality = 'MRI',
  studyDescription = 'MRI Lumbosacral Spine',
  pgrName,
  initialFocusedSectionId = null,
}: SignoutWorkspaceDrawerProps) {
  const isMobile = useIsMobile();
  const template: SignoutTemplate = useMemo(() => {
    return getSignoutTemplate(`${modality} ${studyDescription}`);
  }, [modality, studyDescription]);

  const [layoutMode, setLayoutMode] = useState<'dock' | 'modal'>('dock');
  const [activeTab, setActiveTab] = useState<'positive' | 'formatted'>('positive');
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(initialFocusedSectionId);

  // Initialize layout mode from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('radsuite_signout_layout') as 'dock' | 'modal' | null;
    if (saved === 'dock' || saved === 'modal') {
      setLayoutMode(saved);
    }
  }, []);

  const handleToggleLayoutMode = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'dock' ? 'modal' : 'dock';
      if (typeof window !== 'undefined') {
        localStorage.setItem('radsuite_signout_layout', next);
      }
      return next;
    });
  }, []);

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Section texts state
  const [sectionTexts, setSectionTexts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    template.sections.forEach((s) => {
      map[s.id] = s.normalStandardized;
    });
    return map;
  });

  const [impressionList, setImpressionList] = useState<string[]>(() => [...template.normalImpression]);

  // Hydrate sections from incoming report findings
  useEffect(() => {
    if (!isOpen) return;
    const cleanFindings = report.findings || '';
    if (cleanFindings) {
      setSectionTexts((prev) => {
        const next = { ...prev };
        template.sections.forEach((sec) => {
          const regex = new RegExp(`(?:<strong>)?${sec.heading}:?(?:<\\/strong>)?\\s*([^<]+)`, 'i');
          const match = cleanFindings.match(regex);
          if (match) {
            next[sec.id] = match[1].trim();
          }
        });
        return next;
      });
    }
    if (initialFocusedSectionId) {
      setFocusedSectionId(initialFocusedSectionId);
    }
  }, [isOpen, report.findings, template, initialFocusedSectionId]);

  // Sync back to report
  const syncToReportEditor = (updatedSections: Record<string, string>, updatedImp: string[]) => {
    const findingsHtml = template.sections
      .map((s) => `<p><strong>${s.heading}:</strong> ${updatedSections[s.id] || s.normalStandardized}</p>`)
      .join('');

    const signatureHtml = pgrName && pgrName.trim() && pgrName.trim() !== 'Resident Radiologist'
      ? `<p><br></p><p><strong>Reported by: </strong><em>${pgrName.trim()}</em></p>`
      : '';
    const impHtml = updatedImp.map((i) => `<p>• ${i}</p>`).join('') + signatureHtml;

    setReport((prev) => ({
      ...prev,
      findings: findingsHtml,
      impression: impHtml,
    }));
  };

  const positiveSections: ExtractedPositiveSection[] = useMemo(() => {
    return template.sections
      .map((sec) => ({
        ...sec,
        currentText: sectionTexts[sec.id] || sec.normalStandardized,
        isPositive: isSectionPositive(sectionTexts[sec.id] || sec.normalStandardized, sec),
        baselineNormal: sec.normalStandardized,
      }))
      .filter((s) => s.isPositive);
  }, [template, sectionTexts]);

  const positiveSectionIds = useMemo(() => new Set(positiveSections.map((s) => s.id)), [positiveSections]);

  const handleMarkNormal = (sectionId: string) => {
    const sec = template.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const next = { ...sectionTexts, [sectionId]: sec.normalStandardized };
    setSectionTexts(next);

    const remainingPositives = template.sections.filter((s) => isSectionPositive(next[s.id], s));
    const nextImp =
      remainingPositives.length > 0 ? remainingPositives.map((s) => next[s.id]) : [...template.normalImpression];
    setImpressionList(nextImp);
    syncToReportEditor(next, nextImp);
    notify.info(`Reverted "${sec.shortLabel || sec.heading}" to normal baseline.`);
  };

  const handleApplyPatch = (patch: ConsultantPatchResult) => {
    setSectionTexts(patch.patchedSections);
    setImpressionList(patch.patchedImpression);
    syncToReportEditor(patch.patchedSections, patch.patchedImpression);
  };

  if (!isOpen) return null;

  const isDock = layoutMode === 'dock' && !isMobile;

  return (
    <div
      className={
        isDock
          ? 'fixed inset-0 z-50 pointer-events-none select-text text-xs'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 select-text text-xs'
      }
    >
      {/* Backdrop for click dismissal */}
      <div
        onClick={onClose}
        className={
          isDock
            ? 'absolute inset-0 bg-black/15 pointer-events-auto transition-opacity'
            : 'absolute inset-0'
        }
      />

      {/* Main Drawer / Modal Container */}
      <div
        className={
          isDock
            ? 'absolute inset-y-0 right-0 w-full sm:w-[680px] lg:w-[740px] xl:w-[820px] bg-surface border-l border-outline-variant/60 shadow-2xl flex flex-col h-full pointer-events-auto animate-in slide-in-from-right duration-200 overflow-hidden'
            : 'relative w-full max-w-6xl bg-surface border border-outline-variant/60 rounded-2xl shadow-2xl flex flex-col h-[90vh] max-h-[920px] overflow-hidden animate-in fade-in zoom-in-95 duration-150'
        }
      >
        <SignoutDrawerHeader
          templateTitle={template.title}
          layoutMode={layoutMode}
          onToggleLayoutMode={handleToggleLayoutMode}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          positiveCount={positiveSections.length}
          totalSections={template.sections.length}
          onClose={onClose}
          isMobile={isMobile}
        />

        {/* Content Body: Two columns on wider screens, single column scroll on narrow screens */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-outline-variant/40 overflow-hidden">
          {/* Column 1 (Left 7 Cols): Two-Tab Report / Positive Extractor */}
          <div className="lg:col-span-7 p-3 sm:p-4 overflow-y-auto space-y-3">
            {activeTab === 'positive' ? (
              <PositiveFindingsCards
                positiveSections={positiveSections}
                allSections={template.sections}
                onTextChange={(id, txt) => {
                  const next = { ...sectionTexts, [id]: txt };
                  setSectionTexts(next);
                  syncToReportEditor(next, impressionList);
                }}
                onMarkNormal={handleMarkNormal}
                onSelectAbnormality={(id: string, text: string, imp?: string) => {
                  const next = { ...sectionTexts, [id]: text };
                  setSectionTexts(next);
                  const impText = imp || text;
                  const nextImp = [...impressionList.filter((i) => !template.normalImpression.includes(i)), impText];
                  setImpressionList(nextImp);
                  syncToReportEditor(next, nextImp);
                }}
                onFocusSectionInPatcher={(id: string) => setFocusedSectionId(id)}
              />
            ) : (
              <div className="space-y-2">
                {template.sections.map((sec) => {
                  const isPos = positiveSectionIds.has(sec.id);
                  return (
                    <div
                      key={sec.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isPos ? 'border-amber-500/40 bg-amber-500/10' : 'border-outline-variant/40 bg-surface-container-lowest'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-on-surface">{sec.heading}</span>
                        {isPos && <span className="text-[10px] font-bold text-amber-400">Positive Finding</span>}
                      </div>
                      <textarea
                        rows={2}
                        value={sectionTexts[sec.id] || ''}
                        onChange={(e) => {
                          const next = { ...sectionTexts, [sec.id]: e.target.value };
                          setSectionTexts(next);
                          syncToReportEditor(next, impressionList);
                        }}
                        className="w-full bg-transparent border-0 p-0 text-xs text-on-surface focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2 (Right 5 Cols): Consultant AI Patcher */}
          <div className="lg:col-span-5 p-3 sm:p-4 overflow-y-auto bg-surface-container-lowest/40">
            <ConsultantPatcherPanel
              sections={template.sections}
              positiveSectionIds={positiveSectionIds}
              sectionTexts={sectionTexts}
              impressionList={impressionList}
              focusedSectionId={focusedSectionId}
              onSelectFocusedSection={setFocusedSectionId}
              onApplyPatch={handleApplyPatch}
              modalityTitle={template.title}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-outline-variant/40 bg-surface-container-low flex items-center justify-between shrink-0">
          <span className="text-[11px] text-secondary font-mono truncate mr-2">
            {positiveSections.length} abnormal findings synced to report
          </span>
          <Button size="sm" variant="primary" onClick={onClose} className="font-semibold text-xs gap-1.5 shrink-0">
            <Check className="w-3.5 h-3.5" /> Return to Editor
          </Button>
        </div>
      </div>
    </div>
  );
}
