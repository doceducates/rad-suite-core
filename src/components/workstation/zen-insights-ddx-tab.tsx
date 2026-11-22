'use client';

import React, { useState } from 'react';
import { CaseInsightsView } from './insights/case-insights-view';
import { CopilotGuidanceTab } from './copilot-guidance-tab';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';
import { Stethoscope, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZenInsightsDdxTabProps {
  findings: string;
  impression?: string;
  clinicalHistory?: string;
  modality?: string;
  studyDescription?: string;
  patientAge?: string | number;
  patientGender?: string;
  studyId?: string;
  reportId?: string;
  accessionNumber?: string;
  initialContentJson?: any;
  patientClinicalNotes?: string;
  onInsertImpression: (text: string) => void;
  onUpdateContentJson?: (json: any) => void;
  ddxResult?: DifferentialDiagnosisResult | null;
  isLoadingDdx?: boolean;
  onRefreshDdx?: () => void;
}

export function ZenInsightsDdxTab({
  findings,
  impression = '',
  clinicalHistory = '',
  modality = 'CT',
  studyDescription,
  patientAge,
  patientGender,
  studyId,
  reportId,
  accessionNumber,
  initialContentJson,
  patientClinicalNotes,
  onInsertImpression,
  onUpdateContentJson,
  ddxResult,
  isLoadingDdx,
  onRefreshDdx,
}: ZenInsightsDdxTabProps) {
  const [subView, setSubView] = useState<'insights' | 'guidance'>('insights');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
      {/* Sub-view selector strip */}
      <div className="h-8 px-2 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSubView('insights')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer',
              subView === 'insights'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Ranked differentials, similar cases, and viva briefing"
          >
            <Stethoscope className="w-3 h-3 text-amber-500" />
            <span>Differentials & Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('guidance')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer',
              subView === 'guidance'
                ? 'bg-primary/15 text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Evidence-based classification criteria (Fleischner, Bosniak, LI-RADS)"
          >
            <BookOpen className="w-3 h-3 text-primary" />
            <span>Reference Pearls</span>
          </button>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline">
          {modality} AI
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {subView === 'insights' ? (
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
            initialContentJson={initialContentJson}
            patientClinicalNotes={patientClinicalNotes}
            onInsertImpression={onInsertImpression}
            onUpdateContentJson={onUpdateContentJson}
          />
        ) : (
          <CopilotGuidanceTab
            pearls={ddxResult?.knowledgePearls}
            onInsertImpression={onInsertImpression}
            modality={modality}
          />
        )}
      </div>
    </div>
  );
}
