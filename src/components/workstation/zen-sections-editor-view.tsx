'use client';

import React, { useState } from 'react';
import { ClinicalEditor } from '@/components/editor/clinical-editor';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { useReportSectionSizes } from '@/hooks/use-report-section-sizes';
import { ZenSectionResizer } from './zen-section-resizer';
import { ZenSectionHeader } from './zen-section-header';
import { CompanionTab } from '@/hooks/use-companion-panel';
import { HmisNormalTemplate } from '@/types/templates';
import { Sparkles, Loader2, Zap, Globe } from 'lucide-react';
import { notify } from '@/services/notification.service';
import { ImpressionFlavor } from '@/services/two-tier-impression.service';
import { buildFindingsWithTechnique } from '@/lib/clinical-format';

interface ZenSectionsEditorViewProps {
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId: string;
  modality?: string;
  studyDescription?: string;
  templateRev: number;
  readOnly?: boolean;
  onOpenCompanionTab?: (tab: CompanionTab) => void;
  onApplyTemplate?: (tpl: HmisNormalTemplate) => void;
  onSaveAsTemplate?: () => void;
  patientAge?: number | string;
  patientContext?: any;
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ZenSectionsEditorView({
  report,
  setReport,
  studyId,
  modality = 'CT',
  templateRev,
  readOnly = false,
  onApplyTemplate,
  onSaveAsTemplate,
  patientAge,
  patientContext: patientContextOverride,
}: ZenSectionsEditorViewProps) {
  const [flavor, setFlavor] = useState<ImpressionFlavor>('local_high_yield');
  const [isGeneratingImpression, setIsGeneratingImpression] = useState(false);

  const handleGenerateImpression = async () => {
    const cleanFindings = (report.findings || '').replace(/<[^>]*>/g, '').trim();
    if (!cleanFindings) {
      notify.warning('Please document or dictate findings before synthesizing an impression.');
      return;
    }

    setIsGeneratingImpression(true);
    try {
      const res = await fetch('/api/ai/impression-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: report.findings,
          modality,
          flavor,
          patientAge: patientAge || patientContextOverride?.patientAge,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed generating impression');
      }

      setReport((prev) => ({
        ...prev,
        impression: data.impressionHtml || data.impressionText,
      }));

      notify.success(
        flavor === 'local_high_yield'
          ? 'Generated Local High-Yield Impression'
          : 'Generated Academic ACR Structured Impression'
      );
    } catch (err: any) {
      notify.error(err.message || 'Could not synthesize impression');
    } finally {
      setIsGeneratingImpression(false);
    }
  };

  const {
    historyHeight,
    impressionHeight,
    isHistoryCollapsed,
    isFindingsCollapsed,
    isImpressionCollapsed,
    toggleHistoryCollapse,
    toggleFindingsCollapse,
    toggleImpressionCollapse,
    resizeHistory,
    resizeImpression,
    resetSizes,
  } = useReportSectionSizes();

  const patientContext = {
    modality,
    clinicalHistory: report.clinicalHistory,
  };

  const historyPreview = stripHtml(report.clinicalHistory);
  const findingsPreview = stripHtml(report.findings);
  const impressionPreview = stripHtml(report.impression);

  const findingsWithTechnique = React.useMemo(() => {
    return buildFindingsWithTechnique(report.findings, report.technique);
  }, [report.findings, report.technique]);

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-2 flex flex-col min-h-0 overflow-hidden font-body text-[13px] text-on-surface leading-relaxed">
      {/* Section 1: Clinical History */}
      <div
        style={isHistoryCollapsed ? undefined : { height: `${historyHeight}px` }}
        className={`flex flex-col min-h-0 shrink-0 ${isHistoryCollapsed ? 'py-1' : 'pb-1'}`}
      >
        <ZenSectionHeader
          title="History"
          isCollapsed={isHistoryCollapsed}
          onToggleCollapse={toggleHistoryCollapse}
          previewText={historyPreview}
          copyContent={report.clinicalHistory}
          copyTitle="Copy Clinical History to Clipboard"
        />
        {!isHistoryCollapsed && (
          <div className="flex-1 min-h-0">
            <ClinicalEditor
              key={`history-${studyId}-${templateRev}`}
              content={report.clinicalHistory || ''}
              onChange={(clinicalHistory) => setReport((p) => ({ ...p, clinicalHistory }))}
              placeholder="Enter clinical symptoms, indication, or intake history..."
              minHeight="100%"
              modality={modality}
              activeSection="history"
              viewMode="split"
              className="h-full"
              studyId={studyId}
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Resizer Handle between History and Findings */}
      {!isHistoryCollapsed && !isFindingsCollapsed && (
        <ZenSectionResizer
          onDelta={resizeHistory}
          onReset={resetSizes}
          title="Drag up/down to resize History & Findings (Double click to reset)"
        />
      )}

      {/* Section 2: Findings */}
      <div
        className={`flex flex-col min-h-0 overflow-hidden ${
          isFindingsCollapsed ? 'shrink-0 py-1' : 'flex-1 min-h-[120px] pt-1 pb-1'
        }`}
      >
        <ZenSectionHeader
          title="Findings"
          isCollapsed={isFindingsCollapsed}
          onToggleCollapse={toggleFindingsCollapse}
          previewText={findingsPreview}
          copyContent={findingsWithTechnique}
          richHtml={true}
          copyTitle="Copy Findings (with Technique) to Clipboard"
          badge={
            report.criticalFinding ? (
              <span className="font-mono text-[10px] text-error font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                Critical Finding Present
              </span>
            ) : undefined
          }
        />
        {!isFindingsCollapsed && (
          <div className="flex-1 min-h-0">
            <ClinicalEditor
              key={`findings-${studyId}-${templateRev}`}
              content={report.findings}
              onChange={(findings) => setReport((p) => ({ ...p, findings }))}
              placeholder="Document anatomical findings or type / for AI commands..."
              minHeight="100%"
              modality={modality}
              activeSection="findings"
              viewMode="split"
              className="h-full"
              studyId={studyId}
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Resizer Handle between Findings and Impression */}
      {!isFindingsCollapsed && !isImpressionCollapsed && (
        <ZenSectionResizer
          onDelta={resizeImpression}
          onReset={resetSizes}
          title="Drag up/down to resize Findings & Impression (Double click to reset)"
        />
      )}

      {/* Section 3: Impression */}
      <div
        style={isImpressionCollapsed ? undefined : { height: `${impressionHeight}px` }}
        className={`flex flex-col min-h-0 shrink-0 overflow-hidden ${
          isImpressionCollapsed ? 'py-1' : 'pt-1'
        }`}
      >
        <ZenSectionHeader
          title="Impression"
          isCollapsed={isImpressionCollapsed}
          onToggleCollapse={toggleImpressionCollapse}
          previewText={impressionPreview}
          copyContent={report.impression}
          richHtml={true}
          copyTitle="Copy Impression to Clipboard"
          actions={
            !readOnly && (
              <div className="flex items-center gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
                <div className="inline-flex items-center rounded-md border border-outline-variant/40 bg-surface-container-low p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setFlavor('local_high_yield')}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium transition-all ${
                      flavor === 'local_high_yield'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-muted-foreground hover:text-on-surface'
                    }`}
                    title="Ultra-concise high-yield impression, age-appropriate, predominant levels"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Local High-Yield</span>
                    <span className="sm:hidden">Local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlavor('international_structured')}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium transition-all ${
                      flavor === 'international_structured'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-muted-foreground hover:text-on-surface'
                    }`}
                    title="ACR/RSNA standard structured impression with formal stenosis grading"
                  >
                    <Globe className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Academic ACR</span>
                    <span className="sm:hidden">ACR</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateImpression}
                  disabled={isGeneratingImpression}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all disabled:opacity-50"
                  title="Synthesize structured impression from current findings without hallucination"
                >
                  {isGeneratingImpression ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5" />
                  )}
                  <span>{isGeneratingImpression ? 'Synthesizing...' : 'Generate'}</span>
                </button>
              </div>
            )
          }
        />
        {!isImpressionCollapsed && (
          <div className="flex-1 min-h-0">
            <ClinicalEditor
              key={`impression-${studyId}-${templateRev}`}
              content={report.impression}
              onChange={(impression) => setReport((p) => ({ ...p, impression }))}
              placeholder="Document numbered diagnostic impressions..."
              minHeight="100%"
              modality={modality}
              activeSection="impression"
              viewMode="split"
              className="h-full"
              studyId={studyId}
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}
