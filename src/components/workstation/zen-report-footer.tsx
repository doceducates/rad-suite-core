'use client';

import React, { useState } from 'react';
import { ArrowUp, Lock, Mic, Save } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { LottieWaveform } from '@/components/ui/lottie-waveform';
import { ZenReportFooterMenu } from './zen-report-footer-menu';
import { HmisDispatchOptionsModal } from '@/components/hmis/hmis-dispatch-options-modal';
import { HmisFinalSubmitModal } from '@/components/hmis/hmis-final-submit-modal';

interface ZenReportFooterProps {
  dictationActive: boolean;
  dictationProcessing?: boolean;
  onToggleDictation: () => void;
  onSave: () => void;
  copyReportText?: string | (() => string | Promise<string>);
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void;
  sendingHmis?: boolean;
  onSubmitToHmis?: (options?: { deepVerify?: boolean }) => void;
  submittingHmis?: boolean;
  isFinalSubmitAllowed?: boolean;
  onRevertHmis?: () => void;
  revertingHmis?: boolean;
  onSyncGoogleDoc?: () => void;
  syncingGoogleDoc?: boolean;
  googleDocUrl?: string | null;
  onExportPdf?: () => void;
  exportingPdf?: boolean;
  onExportDocx?: () => void;
  exportingDocx?: boolean;
  notice?: string | null;
  wordCount?: number;
}

export function ZenReportFooter({
  dictationActive,
  dictationProcessing = false,
  onToggleDictation,
  onSave,
  copyReportText,
  onSendToHmis,
  sendingHmis = false,
  onSubmitToHmis,
  submittingHmis = false,
  isFinalSubmitAllowed = false,
  onRevertHmis,
  revertingHmis = false,
  onSyncGoogleDoc,
  syncingGoogleDoc = false,
  googleDocUrl,
  onExportPdf,
  exportingPdf = false,
  onExportDocx,
  exportingDocx = false,
  notice,
  wordCount,
}: ZenReportFooterProps) {
  const [isHmisOptionsOpen, setIsHmisOptionsOpen] = useState(false);
  const [isFinalSubmitModalOpen, setIsFinalSubmitModalOpen] = useState(false);
  const hasSecondaryActions = Boolean(onRevertHmis || onSyncGoogleDoc || googleDocUrl || onExportPdf || onExportDocx || onSendToHmis);

  return (
    <div className="px-3 py-2 bg-surface-container-low border-t border-outline-variant/50 flex items-center justify-between gap-2 shrink-0 select-none">
      {/* Zone 1: Left Telemetry & Copy */}
      <div className="flex items-center gap-2 font-mono text-[10px] text-secondary min-w-0 shrink-0">
        <span className="shrink-0 font-medium">
          {wordCount !== undefined ? `${wordCount} words` : 'Report Ready'}
        </span>
        {notice && (
          <span
            className="text-[10px] font-sans px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-[200px] hidden sm:inline-block"
            title={notice}
          >
            {notice}
          </span>
        )}
        {copyReportText && (
          <CopyButton
            text={copyReportText}
            variant="outline"
            size="sm"
            label="Copy"
            copiedLabel="Copied"
            title="Copy full formatted radiology report to clipboard"
            className="h-7 px-2 rounded-xl border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold"
          />
        )}
      </div>

      {/* Zone 2: Center Primary Clinical Actions Hub with VoiceStudio Dictation */}
      <div className="flex items-center gap-1.5 mx-auto justify-center">
        {/* VoiceStudio GPU Voice Dictation Microphone */}
        <button
          type="button"
          onClick={onToggleDictation}
          disabled={dictationProcessing}
          title={
            dictationProcessing
              ? 'VoiceStudio transcribing & structuring report on GPU...'
              : dictationActive
              ? 'Stop Dictation & Auto-Structure (Alt+D)'
              : 'Start VoiceStudio CUDA Dictation (Alt+D)'
          }
          className={`h-8 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer text-[11px] font-semibold active:scale-95 ${
            dictationProcessing
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 animate-pulse'
              : dictationActive
              ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-500/30 animate-pulse'
              : 'bg-surface-container text-on-surface border-outline-variant/40 hover:text-teal-500 hover:border-teal-500/40 hover:bg-surface-container-high'
          }`}
        >
          <Mic className={`w-3.5 h-3.5 ${dictationActive ? 'fill-current' : ''}`} />
          {dictationProcessing && (
            <span>Structuring...</span>
          )}
          {dictationActive && !dictationProcessing && (
            <>
              <LottieWaveform active={dictationActive} className="w-8 h-4 -my-1" />
              <span>Recording</span>
            </>
          )}
          {!dictationActive && !dictationProcessing && (
            <span>VoiceStudio</span>
          )}
        </button>

        {/* Local Workstation Save */}
        <button
          type="button"
          onClick={onSave}
          title="Save Report Locally (Ctrl+S)"
          className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Draft</span>
        </button>

        {/* HMIS Portal Quick Background Draft Dispatch */}
        {onSendToHmis && (
          <button
            type="button"
            onClick={() => {
              onSave();
              onSendToHmis({ deepVerify: false });
            }}
            disabled={sendingHmis}
            title="Quickly dispatch draft to Punjab HMIS Gateway via background queue (Safe to navigate or switch cases)"
            className="h-8 px-3 rounded-xl border border-teal-500/40 bg-teal-500/15 hover:bg-teal-500/25 text-teal-600 dark:text-teal-400 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <ArrowUp className={`w-3.5 h-3.5 ${sendingHmis ? 'animate-bounce' : ''}`} />
            <span>{sendingHmis ? 'Sending HMIS...' : 'HMIS Draft'}</span>
          </button>
        )}

        {/* HMIS Portal Final Submit (Only if integration active) */}
        {onSubmitToHmis && (
          <button
            type="button"
            disabled={!isFinalSubmitAllowed || submittingHmis}
            aria-disabled={!isFinalSubmitAllowed || submittingHmis}
            onClick={isFinalSubmitAllowed ? () => setIsFinalSubmitModalOpen(true) : undefined}
            title={
              isFinalSubmitAllowed
                ? 'Finalize and submit report directly to Punjab HMIS Gateway'
                : 'HMIS Final Submission is locked pending clinical verification. Only draft saves are currently permitted.'
            }
            className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold select-none transition-all ${
              isFinalSubmitAllowed
                ? 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 cursor-pointer active:scale-95 shadow-2xs'
                : 'border-outline-variant/30 bg-surface-container/40 text-secondary/60 cursor-not-allowed opacity-60 shadow-none pointer-events-none'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-secondary/60 shrink-0" />
            <span>{submittingHmis ? 'Submitting...' : 'HMIS Submit'}</span>
            {!isFinalSubmitAllowed && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-surface-container-high text-secondary/70 uppercase tracking-wider">
                Locked
              </span>
            )}
          </button>
        )}

        {/* Secondary Actions Dropdown (Export PDF/DOCX, Google Docs, HMIS Options) */}
        {hasSecondaryActions && (
          <ZenReportFooterMenu
            onRevertHmis={onRevertHmis}
            revertingHmis={revertingHmis}
            onOpenHmisOptions={onSendToHmis ? () => setIsHmisOptionsOpen(true) : undefined}
            onSyncGoogleDoc={onSyncGoogleDoc}
            syncingGoogleDoc={syncingGoogleDoc}
            googleDocUrl={googleDocUrl}
            onExportPdf={onExportPdf}
            exportingPdf={exportingPdf}
            onExportDocx={onExportDocx}
            exportingDocx={exportingDocx}
          />
        )}
      </div>

      {onSendToHmis && (
        <HmisDispatchOptionsModal
          isOpen={isHmisOptionsOpen}
          onClose={() => setIsHmisOptionsOpen(false)}
          caseCount={1}
          onConfirm={(opts) => {
            setIsHmisOptionsOpen(false);
            onSave();
            onSendToHmis(opts);
          }}
        />
      )}

      {onSubmitToHmis && (
        <HmisFinalSubmitModal
          isOpen={isFinalSubmitModalOpen}
          onClose={() => setIsFinalSubmitModalOpen(false)}
          onConfirm={async (opts) => {
            setIsFinalSubmitModalOpen(false);
            await onSubmitToHmis?.(opts);
          }}
          submitting={submittingHmis}
        />
      )}

      {/* Zone 3: Right Spacer for Balance */}
      <div className="w-12 shrink-0 hidden sm:block" />
    </div>
  );
}
