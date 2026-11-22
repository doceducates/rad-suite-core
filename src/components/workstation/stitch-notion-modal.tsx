'use client';

import React from 'react';
import { ClinicalEditor } from '@/components/editor/clinical-editor';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';

interface StitchNotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  patientName: string;
  studyId: string;
  modality: string;
  onSave: () => void;
}

export function StitchNotionModal({
  isOpen,
  onClose,
  report,
  setReport,
  patientName,
  studyId,
  modality,
  onSave,
}: StitchNotionModalProps) {
  if (!isOpen) return null;

  const patientContext = {
    modality,
    clinicalHistory: report.clinicalHistory,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-all select-none">
      <div className="relative w-full max-w-5xl h-[90vh] bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl border border-outline-variant/60 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Chrome Bar */}
        <div className="h-11 px-4 bg-surface-container-low border-b border-outline-variant/50 flex items-center justify-between shrink-0 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">
              clinical_notes
            </span>
            <div className="flex items-center gap-1 text-secondary text-[11px] font-label">
              <span>Radiology</span>
              <span>/</span>
              <span>Abdomen-Pelvis</span>
              <span>/</span>
              <span className="font-bold text-on-surface">{patientName}</span>
            </div>
            <span className="h-3 w-px bg-outline-variant/60" />
            <span className="font-mono text-[10px] text-tertiary bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/40">
              Draft • Auto-saved
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-secondary">
              <span>Clinical TipTap Canvas</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer"
              title="Close Modal"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Editor Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 select-text">
          <div>
            <span className="font-headline text-sm font-bold uppercase tracking-wider text-primary block pb-1">
              Findings
            </span>
            <ClinicalEditor
              key={`modal-findings-${studyId}`}
              content={report.findings}
              onChange={(findings) => setReport((p) => ({ ...p, findings }))}
              placeholder="Document full findings..."
              minHeight="240px"
              modality={modality}
              activeSection="findings"
              viewMode="floating"
              patientContext={patientContext}
            />
          </div>

          <div className="border-t border-outline-variant/50 pt-4">
            <span className="font-headline text-sm font-bold uppercase tracking-wider text-primary block pb-1">
              Impression
            </span>
            <ClinicalEditor
              key={`modal-impression-${studyId}`}
              content={report.impression}
              onChange={(impression) => setReport((p) => ({ ...p, impression }))}
              placeholder="Document impression..."
              minHeight="140px"
              modality={modality}
              activeSection="impression"
              viewMode="floating"
              patientContext={patientContext}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 px-5 bg-surface-container-low border-t border-outline-variant/50 flex items-center justify-between shrink-0">
          <span className="font-mono text-[11px] text-secondary">Press Esc to close</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/60 font-label text-xs hover:bg-surface-container cursor-pointer"
            >
              Back to Viewport
            </button>
            <button
              type="button"
              onClick={() => {
                onSave();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-label text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
