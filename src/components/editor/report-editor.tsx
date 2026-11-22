'use client';

import { useState, useEffect } from 'react';
import { ReportEditorCanvas } from './report-editor-canvas';
import { DiscrepancyPanel } from './discrepancy-panel';
import { ShadowDifferentialCard } from './shadow-differential-card';
import { Sparkles, Wand2, X, Mic, Square } from 'lucide-react';
import { IdentifiedDiscrepancy } from '@/types/dictation';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { notify } from '@/services/notification.service';

interface ReportEditorProps {
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId: string;
  patientId: string;
  modality?: string;
  pgrName: string;
  externalFindings?: string;
  externalImpression?: string;
  onOpenCommandPalette: () => void;
  onStructure: () => void;
  structuring: boolean;
  structuredNotice: string | null;
  setStructuredNotice: (notice: string | null) => void;
}

export function ReportEditor({
  report,
  setReport,
  studyId,
  modality = 'CT',
  pgrName,
  externalFindings,
  externalImpression,
  onOpenCommandPalette,
  onStructure,
  structuring,
  structuredNotice,
  setStructuredNotice,
}: ReportEditorProps) {
  const [discrepancies, setDiscrepancies] = useState<IdentifiedDiscrepancy[]>([]);
  const [shadowDifferentials, setShadowDifferentials] = useState<string[]>([]);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();

  const handleToggleConsultantMemo = async () => {
    if (isRecording) {
      setIsSavingAudio(true);
      try {
        const res = await stopRecording();
        if (res?.blob) {
          const formData = new FormData();
          formData.append('audio', res.blob, `consultant_${studyId}_${Date.now()}.webm`);
          formData.append('duration', res.duration.toString());
          formData.append('label', `study-${studyId}-memo`);

          const uploadRes = await fetch('/api/media/audio', { method: 'POST', body: formData });
          const data = await uploadRes.json();
          if (data.success) {
            notify.success(`Audio memo saved: ${data.mediaId} (${res.duration}s)`);
          } else {
            notify.info(`Audio memo recorded (${res.duration}s)`);
          }
        }
      } catch {
        notify.warning('Audio memo recorded locally');
      } finally {
        setIsSavingAudio(false);
      }
    } else {
      await startRecording();
    }
  };

  // Feed external dictation / transcripts from drawer
  useEffect(() => {
    if (externalFindings) {
      setReport((p) => ({
        ...p,
        findings: (p.findings ? p.findings + '<p>' : '<p>') + externalFindings + '</p>',
      }));
    }
  }, [externalFindings, setReport]);

  useEffect(() => {
    if (externalImpression) {
      setReport((p) => ({
        ...p,
        impression: (p.impression ? p.impression + '<p>' : '<p>') + externalImpression + '</p>',
      }));
    }
  }, [externalImpression, setReport]);

  const handleApplyDiscrepancyFix = (d: IdentifiedDiscrepancy) => {
    if (d.lateralityConflict) {
      setReport((prev) => {
        let updatedImp = prev.impression;
        if (d.description.includes('Findings describe right') && /left/i.test(updatedImp)) {
          updatedImp = updatedImp.replace(/\bleft\b/gi, 'right');
        } else if (d.description.includes('Findings describe left') && /right/i.test(updatedImp)) {
          updatedImp = updatedImp.replace(/\bright\b/gi, 'left');
        }
        return { ...prev, impression: updatedImp };
      });
    } else if (d.suggestedCorrection) {
      setReport((prev) => ({
        ...prev,
        impression: prev.impression + `<p><em>Refinement: ${d.suggestedCorrection}</em></p>`,
      }));
    }
    setDiscrepancies((p) => p.filter((item) => item.id !== d.id));
  };

  return (
    <div className="flex flex-col h-full space-y-2 min-h-0 text-xs">
      {/* Notice Banner (MedGemma AI Structured) */}
      {structuredNotice && (
        <div className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 rounded-md text-[11px] text-teal-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{structuredNotice}</span>
          </div>
          <button type="button" onClick={() => setStructuredNotice(null)} className="cursor-pointer hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Discrepancy Panel (Only visible if issues detected) */}
      {discrepancies.length > 0 && (
        <div className="shrink-0">
          <DiscrepancyPanel
            discrepancies={discrepancies}
            onDismiss={(id) => setDiscrepancies((p) => p.filter((d) => d.id !== id))}
            onClearAll={() => setDiscrepancies([])}
            onApplyFix={handleApplyDiscrepancyFix}
          />
        </div>
      )}

      {/* Shadow Differential (Only visible if AI differential suggestions active) */}
      {shadowDifferentials.length > 0 && (
        <div className="shrink-0">
          <ShadowDifferentialCard
            shadowDifferentials={shadowDifferentials}
            onInsertToImpression={(txt) =>
              setReport((p) => ({
                ...p,
                impression: (p.impression ? p.impression + '<p>' : '<p>') + txt + '</p>',
              }))
            }
          />
        </div>
      )}

      {/* Core Editor Canvas (Fills the entire available height) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ReportEditorCanvas
          technique={report.technique}
          onTechniqueChange={(tech) => setReport((p) => ({ ...p, technique: tech }))}
          findings={report.findings}
          onFindingsChange={(findings) => setReport((p) => ({ ...p, findings }))}
          impression={report.impression}
          onImpressionChange={(impression) => setReport((p) => ({ ...p, impression }))}
          pgrName={pgrName}
          modality={modality}
          studyId={studyId}
        />
      </div>

      {/* Ultra-thin Bottom Action Strip */}
      <div className="h-7 px-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 bg-muted/10 rounded-b-md">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">⌘K</kbd>
          <span className="text-[10px]">Actions & Templates</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Consultant Audio Memo Recorder */}
          <button
            type="button"
            onClick={handleToggleConsultantMemo}
            disabled={isSavingAudio}
            title={
              isRecording
                ? 'Click to stop and save audio memo'
                : 'Record consultant voice memo (saved with unique industry standard ID)'
            }
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse font-bold'
                : 'text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-2.5 h-2.5 fill-white" />
                <span>{duration}s Stop Memo</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3" />
                <span>Audio Memo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStructure}
            disabled={structuring || (!report.findings && !report.impression)}
            title="Auto-Structure findings & impression with MedGemma AI"
            className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Wand2 className="w-3 h-3" />
            <span>{structuring ? 'Structuring...' : 'Auto-Structure'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
