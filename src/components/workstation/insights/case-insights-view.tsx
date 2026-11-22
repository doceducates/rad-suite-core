'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, ShieldCheck, Zap, Database } from 'lucide-react';
import type {
  CaseInsightsData,
  DifferentialItem,
  RecommendedInvestigation,
} from '@/types/case-insights';
import {
  extractPrecachedInsights,
  formatDifferentialForImpression,
  formatAllDifferentialsForImpression,
  formatInvestigationsForReport,
} from '@/lib/case-insights-format';
import { RankedDifferentialsCard } from './ranked-differentials-card';
import { VivaTalkingPointsCard } from './viva-talking-points-card';
import { RecommendedInvestigationsCard } from './recommended-investigations-card';
import { notify } from '@/services/notification.service';

interface CaseInsightsViewProps {
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
  onInsertImpression: (htmlText: string) => void;
  onUpdateContentJson?: (json: any) => void;
}

export function CaseInsightsView({
  findings,
  clinicalHistory,
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
}: CaseInsightsViewProps) {
  const [insights, setInsights] = useState<CaseInsightsData | null>(() => {
    return extractPrecachedInsights({
      contentJson: initialContentJson,
      clinicalNotes: patientClinicalNotes,
    });
  });
  const [isLoading, setIsLoading] = useState(false);

  // Track current case key to reset when user switches cases
  const currentCaseKey = accessionNumber || studyId || reportId;
  const prevCaseKeyRef = React.useRef(currentCaseKey);

  // When switching cases, immediately reset state to the new case's pre-cache
  useEffect(() => {
    if (prevCaseKeyRef.current !== currentCaseKey) {
      prevCaseKeyRef.current = currentCaseKey;
      const cached = extractPrecachedInsights({
        contentJson: initialContentJson,
        clinicalNotes: patientClinicalNotes,
      });
      setInsights(cached);
      setIsLoading(false);
    }
  }, [currentCaseKey, initialContentJson, patientClinicalNotes]);

  // Sync cache if initialContentJson becomes available for current case
  useEffect(() => {
    if (!insights && initialContentJson?.caseInsights) {
      setInsights({ ...initialContentJson.caseInsights, source: 'cached' });
    }
  }, [initialContentJson, insights]);

  const handleFetchInsights = useCallback(async (forceRefresh = false) => {
    if (!findings.trim()) {
      notify.warning('Please enter findings to generate case insights');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/case-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings,
          modality,
          clinicalHistory,
          studyDescription,
          patientAge,
          patientGender,
          studyId,
          reportId,
          accessionNumber,
          saveToReport: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.insights) {
        setInsights(data.insights);
        if (onUpdateContentJson) {
          onUpdateContentJson({ ...(initialContentJson || {}), caseInsights: data.insights });
        }
        if (forceRefresh) {
          notify.success('Case insights & viva briefing generated');
        }
      } else {
        notify.warning('Using offline clinical differentials');
      }
    } catch (err: any) {
      notify.error(`Could not generate insights: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [findings, modality, clinicalHistory, studyDescription, patientAge, patientGender, studyId, reportId, accessionNumber, isLoading, onUpdateContentJson, initialContentJson]);

  const handleInsertSingleDifferential = (item: DifferentialItem) => {
    const html = formatDifferentialForImpression(item);
    onInsertImpression(html);
    notify.success(`Inserted "${item.diagnosis}" into Impression`);
  };

  const handleInsertAllDifferentials = () => {
    if (!insights) return;
    const html = formatAllDifferentialsForImpression(insights);
    onInsertImpression(html);
    notify.success('All ranked differentials inserted into Impression');
  };

  const handleInsertRecommendations = (invs: RecommendedInvestigation[]) => {
    const html = formatInvestigationsForReport(invs);
    onInsertImpression(html);
    notify.success('Recommended investigations inserted into Report');
  };

  if (isLoading && !insights) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-secondary gap-2.5">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span className="font-medium">Synthesizing clinical differentials & viva talking points...</span>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-secondary gap-3 bg-surface-container-lowest">
        <Sparkles className="w-6 h-6 text-primary opacity-60" />
        <p className="max-w-[240px] leading-relaxed">
          {findings.trim().length > 10
            ? 'Findings ready for deep clinical viva synthesis & ranked differential generation.'
            : 'Document anatomical findings to generate intelligent differentials & viva briefing.'}
        </p>
        <button
          type="button"
          onClick={() => handleFetchInsights(true)}
          disabled={isLoading || findings.trim().length < 5}
          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Analyze & Generate DDx</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs bg-surface-container-lowest select-text">
      {/* Primary Diagnosis & Source Badge Header */}
      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Primary Impression
            </span>
            {insights.source === 'cached' ? (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-container text-secondary flex items-center gap-0.5 border border-outline-variant/40" title="Loaded instantly from report cache">
                <Database className="w-2.5 h-2.5 text-secondary" />
                <span>Cached (0ms)</span>
              </span>
            ) : (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 border border-emerald-500/30">
                <Zap className="w-2.5 h-2.5" />
                <span>AI Live</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleFetchInsights(true)}
            disabled={isLoading}
            className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
            title="Refresh DDx with AI using latest findings"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <p className="font-bold text-on-surface text-xs leading-snug">
          {insights.primaryDifferential}
        </p>
      </div>

      {/* 1. Ranked Differential Diagnosis Card */}
      <RankedDifferentialsCard
        differentials={insights.differentials}
        onInsertDifferential={handleInsertSingleDifferential}
        onInsertAllDifferentials={handleInsertAllDifferentials}
      />

      {/* 2. Clinical Viva / Presentation Talking Points Card */}
      <VivaTalkingPointsCard
        viva={insights.vivaBriefing}
        primaryDiagnosis={insights.primaryDifferential}
      />

      {/* 3. Recommended Investigations Card (Imaging & Lab Markers) */}
      <RecommendedInvestigationsCard
        investigations={insights.recommendedInvestigations}
        onInsertRecommendations={handleInsertRecommendations}
      />
    </div>
  );
}
