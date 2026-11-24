'use client';

import React, { useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { ClinicalEditor } from '@/components/editor/clinical-editor';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { CompanionTab } from '@/hooks/use-companion-panel';
import { HmisNormalTemplate } from '@/types/templates';
import { Sparkles, Loader2, Pencil } from 'lucide-react';
import { notify } from '@/services/notification.service';
import { ImpressionFlavor } from '@/services/two-tier-impression.service';
import { buildFindingsWithTechnique } from '@/lib/clinical-format';
import {
  ImpressionStyleCycler,
  AVAILABLE_IMPRESSION_STYLES,
} from './impression-style-cycler';

interface ZenUnifiedEditorViewProps {
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId: string;
  modality?: string;
  templateRev: number;
  readOnly?: boolean;
  onOpenCompanionTab?: (tab: CompanionTab) => void;
  onApplyTemplate?: (tpl: HmisNormalTemplate) => void;
  onSaveAsTemplate?: () => void;
  onOpenCopilotChat?: () => void;
  onQuickPolishWholeReport?: () => void;
  isPolishingWholeReport?: boolean;
}

export function ZenUnifiedEditorView({
  report,
  setReport,
  studyId,
  modality = 'CT',
  templateRev,
  readOnly = false,
  patientContext: patientContextOverride,
}: ZenUnifiedEditorViewProps & { patientContext?: any }) {
  const patientContext = patientContextOverride || {
    modality,
    clinicalHistory: report.clinicalHistory,
  };

  const [flavor, setFlavor] = useState<ImpressionFlavor>('local_high_yield');
  const [impressionCache, setImpressionCache] = useState<Record<string, string>>({});
  const [isGeneratingImpression, setIsGeneratingImpression] = useState(false);

  const fetchAndApplyImpression = async (targetFlavor: ImpressionFlavor) => {
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
          flavor: targetFlavor,
          patientAge: patientContext?.patientAge,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed generating impression');
      }

      const newImp = data.impressionHtml || data.impressionText;
      setImpressionCache((prev) => ({ ...prev, [targetFlavor]: newImp }));
      setReport((prev) => ({
        ...prev,
        impression: newImp,
      }));

      const activeOption = AVAILABLE_IMPRESSION_STYLES.find((s) => s.id === targetFlavor);
      notify.success(`Generated ${activeOption?.shortLabel || 'Impression'}`);
    } catch (err: any) {
      notify.error(err.message || 'Could not synthesize impression');
    } finally {
      setIsGeneratingImpression(false);
    }
  };

  const handleGenerateImpression = () => fetchAndApplyImpression(flavor);

  const handleCycleFlavor = (direction: 'next' | 'prev') => {
    const currentIdx = Math.max(0, AVAILABLE_IMPRESSION_STYLES.findIndex((s) => s.id === flavor));
    const nextIdx =
      direction === 'next'
        ? (currentIdx + 1) % AVAILABLE_IMPRESSION_STYLES.length
        : (currentIdx - 1 + AVAILABLE_IMPRESSION_STYLES.length) % AVAILABLE_IMPRESSION_STYLES.length;
    const target = AVAILABLE_IMPRESSION_STYLES[nextIdx];
    setFlavor(target.id);

    if (impressionCache[target.id]) {
      setReport((prev) => ({ ...prev, impression: impressionCache[target.id] }));
      notify.info(`Switched to ${target.shortLabel}`);
      return;
    }
    fetchAndApplyImpression(target.id);
  };

  const handleEditImpression = () => {
    const el = document.querySelector('#unified-impression-container .ProseMirror') as HTMLElement;
    if (el) el.focus();
    notify.info('Editing Impression in Clinical Editor');
  };

  const findingsWithTechnique = React.useMemo(() => {
    return buildFindingsWithTechnique(report.findings, report.technique);
  }, [report.findings, report.technique]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 w-full select-text bg-surface">
      <div className="max-w-3xl mx-auto space-y-6 font-body text-[13px] text-on-surface leading-relaxed pb-24">
        {/* Section 1: Clinical History */}
        <section className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30 select-none">
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[12px] font-bold uppercase tracking-wider text-primary">
                Clinical History
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {report.clinicalHistory && (
                <CopyButton
                  text={report.clinicalHistory}
                  htmlContent
                  variant="ghost"
                  size="xs"
                  label="Copy"
                  className="text-secondary hover:text-primary hover:bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                  title="Copy Clinical History to Clipboard"
                />
              )}
            </div>
          </div>
          <div className="pt-1">
            <ClinicalEditor
              key={`unified-history-${studyId}-${templateRev}`}
              content={report.clinicalHistory || ''}
              onChange={(clinicalHistory) => setReport((p) => ({ ...p, clinicalHistory }))}
              placeholder="Enter clinical symptoms, indication, or intake history..."
              minHeight="80px"
              modality={modality}
              activeSection="history"
              viewMode="fullscreen"
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        </section>

        {/* Section 2: Findings */}
        <section className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30 select-none">
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[12px] font-bold uppercase tracking-wider text-primary">
                Findings
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {report.criticalFinding && (
                <span className="font-mono text-[10px] text-error font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  Critical Finding
                </span>
              )}
              {report.findings && (
                <CopyButton
                  text={findingsWithTechnique}
                  richHtml
                  variant="ghost"
                  size="xs"
                  label="Copy"
                  className="text-secondary hover:text-primary hover:bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                  title="Copy Findings (with Technique) to Clipboard"
                />
              )}
            </div>
          </div>
          <div className="pt-1">
            <ClinicalEditor
              key={`unified-findings-${studyId}-${templateRev}`}
              content={report.findings}
              onChange={(findings) => setReport((p) => ({ ...p, findings }))}
              placeholder="Document anatomical findings or type / for AI commands..."
              minHeight="220px"
              modality={modality}
              activeSection="findings"
              viewMode="fullscreen"
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        </section>

        {/* Section 3: Impression */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between pb-1 border-b border-outline-variant/30 select-none gap-2">
            <div className="flex items-center gap-2">
              <span className="font-headline text-[12px] font-bold uppercase tracking-wider text-primary">
                Impression
              </span>

              {/* Multi-Style AI Cycler & Edit Button */}
              {!readOnly && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <ImpressionStyleCycler
                    currentStyle={flavor}
                    onCycle={handleCycleFlavor}
                    loading={isGeneratingImpression}
                  />
                  <button
                    type="button"
                    onClick={handleEditImpression}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-secondary hover:text-primary hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
                    title="Edit impression in Clinical Editor"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateImpression}
                    disabled={isGeneratingImpression}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all disabled:opacity-50 cursor-pointer"
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
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {report.impression && (
                <CopyButton
                  text={report.impression}
                  richHtml
                  variant="ghost"
                  size="xs"
                  label="Copy"
                  className="text-secondary hover:text-primary hover:bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                  title="Copy Impression to Clipboard"
                />
              )}
            </div>
          </div>
          <div className="pt-1" id="unified-impression-container">
            <ClinicalEditor
              key={`unified-impression-${studyId}-${templateRev}`}
              content={report.impression}
              onChange={(impression) => setReport((p) => ({ ...p, impression }))}
              placeholder="Document numbered diagnostic impressions..."
              minHeight="140px"
              modality={modality}
              activeSection="impression"
              viewMode="fullscreen"
              patientContext={patientContext}
              readOnly={readOnly}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
