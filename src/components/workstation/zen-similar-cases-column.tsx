'use client';

// Layer 4 (Presentation): Case Insights, Radiopaedia & Positive Findings Right Rail
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  Lightbulb,
  CheckSquare,
} from 'lucide-react';
import { RightColTab } from '@/hooks/use-three-column-layout';
import { CaseInsightsView } from './insights/case-insights-view';
import { ZenRadiopaediaPane } from './zen-radiopaedia-pane';
import { ZenPositiveFindingsRail } from './zen-positive-findings-rail';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';

export interface ZenSimilarCasesColumnProps {
  modality?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onInsertText?: (text: string, targetSection: 'findings' | 'impression') => void;
  isResizing?: boolean;
  activeTab?: RightColTab;
  onSelectTab?: (tab: RightColTab) => void;
  onOpenTab?: (tab: RightColTab) => void;
  // Case & Report Data for Insights
  findings?: string;
  impression?: string;
  clinicalHistory?: string;
  studyDescription?: string;
  patientAge?: string | number;
  patientGender?: string;
  studyId?: string;
  reportId?: string;
  accessionNumber?: string;
  contentJson?: any;
  patientClinicalNotes?: string;
  onUpdateContentJson?: (json: any) => void;
  // Full Report & Discussion Sync Props
  report?: ReportEditorState;
  setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  pgrName?: string;
  onSave?: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  currentVersion?: number;
}

export function ZenSimilarCasesColumn({
  modality = 'CT',
  isCollapsed,
  onToggleCollapse,
  width,
  onInsertText,
  isResizing = false,
  activeTab = 'insights_ddx',
  onSelectTab,
  onOpenTab,
  findings = '',
  impression = '',
  clinicalHistory = '',
  studyDescription,
  patientAge,
  patientGender,
  studyId,
  reportId,
  accessionNumber,
  contentJson,
  patientClinicalNotes,
  onUpdateContentJson,
  report,
  setReport,
  pgrName,
  onSave,
  currentVersion,
}: ZenSimilarCasesColumnProps) {
  const currentTab = activeTab || 'insights_ddx';

  const handleOpenSpecificTab = (tab: RightColTab) => {
    if (onOpenTab) {
      onOpenTab(tab);
    } else {
      if (onSelectTab) onSelectTab(tab);
      if (isCollapsed) onToggleCollapse();
    }
  };

  // Collapsed Rail View (48px wide with 1-click direct launchers)
  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-surface-container-low border-l border-outline-variant/50 flex flex-col items-center py-2 shrink-0 select-none transition-all duration-200">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Expand Right Academic Rail"
        >
          <PanelRightOpen className="w-4 h-4 text-primary" />
        </button>

        <div className="mt-4 flex flex-col items-center gap-3">
          {/* 1-Click Launch Positive Findings */}
          <button
            type="button"
            onClick={() => handleOpenSpecificTab('findings')}
            className={cn(
              'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
              currentTab === 'findings'
                ? 'bg-primary/15 text-primary shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-container'
            )}
            title="1-Click: Open Positive Findings (70%) & Additional Notes (30%)"
          >
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </button>

          {/* 1-Click Launch Case Insights & DDx */}
          <button
            type="button"
            onClick={() => handleOpenSpecificTab('insights_ddx')}
            className={cn(
              'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
              currentTab === 'insights_ddx'
                ? 'bg-primary/15 text-primary shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-container'
            )}
            title="1-Click: Open Case Insights & Viva Briefing"
          >
            <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" />
          </button>

          {/* 1-Click Launch Radiopaedia */}
          <button
            type="button"
            onClick={() => handleOpenSpecificTab('radiopaedia')}
            className={cn(
              'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
              currentTab === 'radiopaedia'
                ? 'bg-primary/15 text-primary shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-container'
            )}
            title="1-Click: Open Radiopaedia Webview"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <span className="text-[10px] font-mono text-secondary rotate-90 whitespace-nowrap mt-12 tracking-wider uppercase font-semibold">
            {currentTab === 'findings' ? 'Positive Findings' : currentTab === 'insights_ddx' ? 'Case Insights' : 'Radiopaedia'}
          </span>
        </div>
      </div>
    );
  }

  // Expanded Responsive Triple-Tab View
  return (
    <div
      style={{ width: `${width}px` }}
      className={cn(
        'h-full bg-surface-container-low border-l border-outline-variant/50 flex flex-col shrink-0 select-none overflow-hidden relative',
        isResizing ? 'transition-none' : 'transition-[width] duration-150'
      )}
    >
      {/* Top Header with Tab Switcher */}
      <div className="h-10 px-2 bg-surface-container flex items-center justify-between border-b border-outline-variant/40 shrink-0">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-container-high border border-outline-variant/40 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('findings')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap',
              currentTab === 'findings'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-secondary hover:text-on-surface'
            )}
            title="Positive Findings (70%) & Additional Notes (30%)"
          >
            <CheckSquare className={cn('w-3 h-3', currentTab === 'findings' ? 'text-on-primary' : 'text-amber-400')} />
            <span>Positive Findings</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('insights_ddx')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap',
              currentTab === 'insights_ddx'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-secondary hover:text-on-surface'
            )}
            title="Ranked differentials, viva talking points, and recommended investigations"
          >
            <Lightbulb className={cn('w-3 h-3', currentTab === 'insights_ddx' ? 'text-amber-300' : 'text-amber-500')} />
            <span>Insights</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('radiopaedia')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap',
              currentTab === 'radiopaedia'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-secondary hover:text-on-surface'
            )}
            title="Browse cases and articles on Radiopaedia"
          >
            <BookOpen className="w-3 h-3" />
            <span>Radiopaedia</span>
          </button>
        </div>

        {/* Quick Window Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Collapse Right Rail"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Stage: Positive Findings (70/30) vs Case Insights vs Radiopaedia */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {currentTab === 'findings' ? (
          <ZenPositiveFindingsRail
            report={report}
            setReport={setReport}
            studyId={studyId}
            reportId={reportId}
            accessionNumber={accessionNumber}
            modality={modality}
            pgrName={pgrName}
            onSave={onSave}
            currentVersion={currentVersion}
            initialFindings={findings}
          />
        ) : currentTab === 'insights_ddx' ? (
          <CaseInsightsView
            findings={findings}
            impression={impression}
            clinicalHistory={clinicalHistory}
            modality={modality}
            studyDescription={studyDescription}
            patientAge={patientAge}
            patientGender={patientGender}
            studyId={studyId}
            reportId={reportId}
            accessionNumber={accessionNumber}
            initialContentJson={contentJson}
            patientClinicalNotes={patientClinicalNotes}
            onInsertImpression={(html) => onInsertText?.(html, 'impression')}
            onUpdateContentJson={onUpdateContentJson}
          />
        ) : (
          <ZenRadiopaediaPane isResizing={isResizing} />
        )}
      </div>
    </div>
  );
}
