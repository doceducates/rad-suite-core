'use client';

import React, { useState } from 'react';
import { ClinicalEditor } from './clinical-editor';
import { Sparkles, Copy, Check } from 'lucide-react';
import { htmlToClinicalText } from '@/lib/clinical-format';

interface ReportEditorCanvasProps {
  technique: string;
  onTechniqueChange: (tech: string) => void;
  findings: string;
  onFindingsChange: (findings: string) => void;
  impression: string;
  onImpressionChange: (impression: string) => void;
  pgrName: string;
  modality?: string;
  studyId?: string;
}

export function ReportEditorCanvas({
  technique,
  onTechniqueChange,
  findings,
  onFindingsChange,
  impression,
  onImpressionChange,
  pgrName,
  modality = 'CT',
  studyId = 'active-study',
}: ReportEditorCanvasProps) {
  const patientContext = {
    modality,
  };
  const [copiedSection, setCopiedSection] = useState<'findings' | 'impression' | null>(null);

  const handleCopySection = async (section: 'findings' | 'impression', content: string) => {
    const plain = htmlToClinicalText(content);
    if (!plain) return;
    try {
      await navigator.clipboard.writeText(plain);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 1800);
    } catch (e) {
      console.error('Copy section failed:', e);
    }
  };

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      {/* Technique Row (Ultra-compact) */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          Technique:
        </span>
        <input
          type="text"
          value={technique}
          onChange={(e) => onTechniqueChange(e.target.value)}
          placeholder="Scan parameters, contrast agent, slice thickness..."
          className="flex-1 py-1 px-2 text-xs rounded border border-border/60 bg-muted/20 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <div className="flex items-center gap-1 text-[10px] text-primary font-mono bg-primary/10 px-2 py-0.5 rounded shrink-0">
          <Sparkles className="w-3 h-3" />
          <span>AI Clinical Canvas</span>
        </div>
      </div>

      {/* Findings Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Findings
            </span>
            <button
              type="button"
              onClick={() => handleCopySection('findings', findings)}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title="Copy plain findings to clipboard"
            >
              {copiedSection === 'findings' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            Type / for templates or Tab to accept AI
          </span>
        </div>
        <div className="flex-1 min-h-[220px] overflow-hidden flex flex-col">
          <ClinicalEditor
            key={`findings-clinical-${studyId}`}
            content={findings}
            onChange={onFindingsChange}
            placeholder="Document anatomical findings or type / for clinical templates..."
            minHeight="200px"
            modality={modality}
            activeSection="findings"
            viewMode="split"
            studyId={studyId}
            patientContext={patientContext}
          />
        </div>
      </div>

      {/* Impression Section */}
      <div className="min-h-0">
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Impression
            </span>
            <span className="text-[10px] font-mono text-primary font-medium">
              {pgrName}
            </span>
            <button
              type="button"
              onClick={() => handleCopySection('impression', impression)}
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title="Copy plain impression to clipboard"
            >
              {copiedSection === 'impression' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            Numbered diagnostic conclusions
          </span>
        </div>
        <div className="min-h-[120px] overflow-hidden flex flex-col">
          <ClinicalEditor
            key={`impression-clinical-${studyId}`}
            content={impression}
            onChange={onImpressionChange}
            placeholder="Numbered diagnostic conclusions or type /impression..."
            minHeight="110px"
            modality={modality}
            activeSection="impression"
            viewMode="split"
            studyId={studyId}
            patientContext={patientContext}
          />
        </div>
      </div>
    </div>
  );
}
