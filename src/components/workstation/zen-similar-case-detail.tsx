'use client';

import React, { useState } from 'react';
import { SimilarCase } from '@/services/similar-cases.service';
import { ArrowLeft, ExternalLink, GripVertical, Plus, Globe } from 'lucide-react';
import { ZenRadiopaediaWebviewModal } from './zen-radiopaedia-webview-modal';

interface ZenSimilarCaseDetailProps {
  caseItem: SimilarCase;
  onBack: () => void;
  onInsertText: (text: string, targetSection: 'findings' | 'impression') => void;
}

export function ZenSimilarCaseDetail({
  caseItem,
  onBack,
  onInsertText,
}: ZenSimilarCaseDetailProps) {
  const [isWebviewOpen, setIsWebviewOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low overflow-hidden select-text">
      {/* Header with Back button and Radiopaedia webview/link buttons */}
      <div className="h-10 px-2.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/40 shrink-0 select-none">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cases</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsWebviewOpen(true)}
            className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded bg-primary/15 hover:bg-primary/25 text-primary transition-colors cursor-pointer"
            title="Open in-app interactive webview"
          >
            <Globe className="w-3 h-3" />
            <span>Webview</span>
          </button>
          <a
            href={caseItem.radiopaediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono text-secondary hover:text-primary transition-colors p-1"
            title="Open on Radiopaedia.org in external tab"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Case Body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-body text-xs text-on-surface">
        {/* Title and Demographics */}
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono mb-1">
            <span className="px-1.5 py-0.5 rounded font-bold bg-primary/15 text-primary">
              {caseItem.modality}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary">
              {caseItem.bodyPart}
            </span>
          </div>
          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight">
            {caseItem.title}
          </h3>
          <p className="mt-1 text-[11px] text-secondary italic">
            {caseItem.demographics}
          </p>
        </div>

        {/* Quick Webview Launch Banner */}
        <button
          type="button"
          onClick={() => setIsWebviewOpen(true)}
          className="w-full py-1.5 px-2.5 rounded-lg bg-surface-container border border-primary/30 hover:border-primary/60 text-primary flex items-center justify-between text-[11px] font-semibold transition-all group cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>Open Interactive Case Webview</span>
          </span>
          <span className="text-[10px] font-mono text-secondary">In-App</span>
        </button>

        {/* Diagnostic Key Findings with Drag & Drop Wording */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-primary">
              Key Diagnostic Findings
            </span>
            <span className="text-[9px] text-secondary font-mono">
              (Drag text or + click)
            </span>
          </div>

          <div className="space-y-1.5">
            {caseItem.keyFindings.map((finding, idx) => (
              <div
                key={idx}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', finding);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="group p-2 rounded-lg bg-surface-container border border-outline-variant/40 hover:border-primary/60 transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing"
                title="Drag text directly into Findings or Impression"
              >
                <div className="flex items-start gap-1.5">
                  <GripVertical className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5 opacity-50 group-hover:opacity-100" />
                  <span className="text-[11px] leading-relaxed flex-1">{finding}</span>
                </div>

                {/* Quick 1-click Insert Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-outline-variant/20 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onInsertText(finding, 'findings')}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-surface-container-high hover:bg-primary/20 text-on-surface hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Findings
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertText(finding, 'impression')}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-surface-container-high hover:bg-primary/20 text-on-surface hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Impression
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Pearl Callout */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-on-surface">
          <span className="text-[10px] font-bold text-amber-500 block uppercase tracking-wider mb-0.5">
            Diagnostic Pearl
          </span>
          <p className="text-[11px] leading-relaxed">{caseItem.diagnosticPearls}</p>
        </div>

        {/* Differential Diagnoses */}
        <div>
          <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-secondary block mb-1.5">
            Differential Diagnoses
          </span>
          <div className="flex flex-wrap gap-1">
            {caseItem.differentialDiagnoses.map((diff, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-high border border-outline-variant/40 text-secondary"
              >
                {diff}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ZenRadiopaediaWebviewModal
        isOpen={isWebviewOpen}
        onClose={() => setIsWebviewOpen(false)}
        caseTitle={caseItem.title}
        radiopaediaUrl={caseItem.radiopaediaUrl}
        caseId={caseItem.radiopaediaId}
      />
    </div>
  );
}
