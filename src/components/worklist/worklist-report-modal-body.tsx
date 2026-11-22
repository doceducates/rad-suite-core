'use client';

import React, { useMemo } from 'react';
import { Layers, AlertTriangle, Sparkles, ListPlus } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { getTemplatesByModality } from '@/services/template-manager.service';
import { buildFindingsWithTechnique } from '@/lib/clinical-format';

interface WorklistReportModalBodyProps {
  errorMessage: string | null;
  history: string;
  setHistory: (v: string) => void;
  technique: string;
  setTechnique: (v: string) => void;
  findings: string;
  setFindings: React.Dispatch<React.SetStateAction<string>>;
  impression: string;
  setImpression: React.Dispatch<React.SetStateAction<string>>;
  criticalFinding: boolean;
  setCriticalFinding: (v: boolean) => void;
  savedTime: string | null;
  onApplyTemplate: (tplKey: string) => void;
  modality?: string;
}

function formatFindingsText(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');
}

function formatImpressionText(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let counter = 1;
  const formatted = lines.map((line) => {
    const clean = line.replace(/^\d+[\.\)]\s*/, '').replace(/^[•\-\*]\s*/, '').trim();
    return `${counter++}. ${clean}`;
  });
  return formatted.join('\n');
}

export function WorklistReportModalBody({
  errorMessage,
  history,
  setHistory,
  technique,
  setTechnique,
  findings,
  setFindings,
  impression,
  setImpression,
  criticalFinding,
  setCriticalFinding,
  savedTime,
  onApplyTemplate,
  modality = 'CT',
}: WorklistReportModalBodyProps) {
  const isMr = modality?.toUpperCase() === 'MRI' || modality?.toUpperCase() === 'MR';
  const cleanModality: 'CT' | 'MRI' = isMr ? 'MRI' : 'CT';

  const highVolumePills = useMemo(() => {
    if (cleanModality === 'CT') {
      return [
        { label: 'Brain', key: 'CT Brain (Plain / Trauma)' },
        { label: 'Chest', key: 'CT Chest (Routine / CECT)' },
        { label: 'Abdomen & Pelvis', key: 'CT Abdomen & Pelvis (CECT)' },
        { label: 'KUB', key: 'CT KUB (Plain)' },
        { label: 'C-Spine', key: 'CT Cervical Spine' },
        { label: 'L-Spine', key: 'CT Lumbar Spine' },
      ];
    }
    return [
      { label: 'Brain', key: 'MRI Brain (Routine)' },
      { label: 'C-Spine', key: 'MRI Cervical Spine' },
      { label: 'L-Spine', key: 'MRI Lumbosacral Spine' },
      { label: 'Knee', key: 'MRI Knee Joint' },
      { label: 'Shoulder', key: 'MRI Shoulder Joint' },
      { label: 'MRCP', key: 'MRCP (Cholangiopancreatography)' },
    ];
  }, [cleanModality]);

  const allModalityTemplates = useMemo(() => {
    return getTemplatesByModality(cleanModality);
  }, [cleanModality]);

  const findingsWithTechnique = React.useMemo(() => {
    return buildFindingsWithTechnique(findings, technique);
  }, [findings, technique]);

  const handleAddBullet = () => {
    setFindings((prev) => (prev ? `${prev.trimEnd()}\n• ` : '• '));
  };

  const handleFormatFindings = () => {
    if (findings.trim()) {
      setFindings(formatFindingsText(findings));
    }
  };

  const handleAddNumber = () => {
    const count = (impression.match(/^\d+\./gm) || []).length;
    const nextNum = count + 1;
    setImpression((prev) => (prev ? `${prev.trimEnd()}\n${nextNum}. ` : `${nextNum}. `));
  };

  const handleFormatImpression = () => {
    if (impression.trim()) {
      setImpression(formatImpressionText(impression));
    }
  };

  return (
    <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Structured Template Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-secondary flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5 text-primary" /> {cleanModality} Quick:
          </span>
          {highVolumePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => onApplyTemplate(pill.key)}
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-outline-variant hover:border-primary text-secondary hover:text-on-surface bg-surface-container cursor-pointer transition-colors shadow-2xs"
              title={`Apply ${pill.key}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Full Catalog Selector Dropdown */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onApplyTemplate(e.target.value);
              e.target.value = '';
            }
          }}
          defaultValue=""
          className="px-2 py-0.5 rounded text-[10px] font-medium border border-outline-variant bg-surface-container text-secondary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary max-w-[210px]"
          title="Select from all templates"
        >
          <option value="" disabled>
            All {cleanModality} Templates ({allModalityTemplates.length})...
          </option>
          {allModalityTemplates.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-secondary uppercase">Clinical Indication / History</label>
            {history && <CopyButton text={history} size="xs" title="Copy Clinical History" />}
          </div>
          <input
            type="text"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Clinical indications, presentation, reason for exam..."
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-secondary uppercase">Technique / Protocol</label>
            {technique && <CopyButton text={technique} size="xs" title="Copy Technique" />}
          </div>
          <input
            type="text"
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="Scan technique, contrast info, reconstruction parameters..."
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Findings with Formatting Toolbar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-secondary uppercase">Findings</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddBullet}
                className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container border border-outline-variant/60 text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Add bullet point"
              >
                <ListPlus className="w-2.5 h-2.5" />
                <span>Bullet</span>
              </button>
              <button
                type="button"
                onClick={handleFormatFindings}
                className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container border border-outline-variant/60 text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Format anatomical headings and bullets"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Format</span>
              </button>
            </div>
          </div>
          {findings && (
            <CopyButton
              text={findingsWithTechnique}
              richHtml
              size="xs"
              title="Copy Findings (with Technique) to Clipboard"
            />
          )}
        </div>
        <textarea
          rows={9}
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Detailed organ-by-organ anatomical findings..."
          className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-[13px] text-on-surface leading-relaxed outline-none focus:ring-1 focus:ring-primary font-sans resize-y whitespace-pre-wrap"
        />
      </div>

      {/* Impression with Formatting Toolbar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-secondary uppercase">Impression / Conclusion</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddNumber}
                className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container border border-outline-variant/60 text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Add numbered conclusion item"
              >
                <ListPlus className="w-2.5 h-2.5" />
                <span>Number</span>
              </button>
              <button
                type="button"
                onClick={handleFormatImpression}
                className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container border border-outline-variant/60 text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Format numbered list sequentially"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                <span>Format</span>
              </button>
            </div>
          </div>
          {impression && <CopyButton text={impression} richHtml size="xs" title="Copy Impression" />}
        </div>
        <textarea
          rows={4}
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          placeholder="1. Summary of primary clinical diagnosis..."
          className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-[13px] text-on-surface font-semibold leading-relaxed outline-none focus:ring-1 focus:ring-primary resize-y whitespace-pre-wrap font-sans"
        />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/40">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={criticalFinding}
            onChange={(e) => setCriticalFinding(e.target.checked)}
            className="rounded border-outline-variant text-rose-500 focus:ring-rose-500"
          />
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Critical / STAT Alert Finding
          </span>
        </label>
        {savedTime && <span className="text-[11px] text-secondary font-mono">Saved at {savedTime}</span>}
      </div>
    </div>
  );
}
