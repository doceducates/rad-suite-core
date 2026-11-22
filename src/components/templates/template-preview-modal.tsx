'use client';

// Layer 4 (Presentation): Interactive Template Preview Modal
// Invariant: Target < 250 lines, max 350 lines.

import React, { useState } from 'react';
import { CrossSectionalTemplate } from '@/types/templates';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Sparkles, Copy, Check, FileCheck, X, Pencil } from 'lucide-react';
import { useReportingPreferences } from '@/services/reporting-preferences.service';
import {
  stripOrIntegrateHeading,
  formatImpressionForStyle,
} from '@/services/template-style-engine.service';
import { ReportingStylePicker } from './reporting-style-picker';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CrossSectionalTemplate | null;
  onUse?: (template: CrossSectionalTemplate) => void;
  onEdit?: (template: CrossSectionalTemplate) => void;
}

export function TemplatePreviewModal({
  isOpen,
  onClose,
  template,
  onUse,
  onEdit,
}: TemplatePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const { findingsStyle, impressionStyle } = useReportingPreferences();

  if (!template) return null;

  const displayedImpression = formatImpressionForStyle(
    template.defaultImpression,
    impressionStyle
  );

  const formattedFindingsList = template.normalFindings.map((f) => {
    if (findingsStyle === 'without_headings') {
      return stripOrIntegrateHeading(f);
    }
    return f;
  });

  const handleCopy = () => {
    const findingsBlock = formattedFindingsList.map((f) => `• ${f}`).join('\n\n');
    const fullText = `TECHNIQUE:\n${template.technique}\n\nFINDINGS:\n${findingsBlock}\n\nIMPRESSION:\n${displayedImpression}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToReport = () => {
    if (!onUse) return;
    const styledTemplate: CrossSectionalTemplate = {
      ...template,
      normalFindings: formattedFindingsList,
      defaultImpression: displayedImpression,
    };
    onUse(styledTemplate);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-2xl w-full bg-surface-container-low rounded-2xl border border-outline-variant/60 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/40 flex items-center justify-between shrink-0 bg-surface-container-low">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-on-surface truncate">{template.name}</h3>
              <div className="flex items-center gap-2 text-xs text-secondary mt-0.5 flex-wrap">
                <span className="font-semibold text-primary font-mono uppercase">{template.modality}</span>
                <span>•</span>
                <span>{template.subspecialty || 'General'}</span>
                {template.isCustom && <span>• (Departmental Shared)</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(template);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                title="Edit this template in TipTap rich text editor"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Style Selection Bar */}
        <div className="px-5 py-2.5 bg-surface-container/60 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] font-medium text-secondary">Active Reporting Style:</span>
          <ReportingStylePicker compact />
        </div>

        {/* Clinical Document Preview (LGH Official Stationery Format) */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-on-surface font-sans leading-relaxed">
          {/* Technique */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-outline-variant/40 pb-1 mb-2 font-mono">
              Technique
            </h4>
            <p className="text-secondary leading-relaxed bg-surface-container/40 p-3 rounded-xl border border-outline-variant/30">
              {template.technique}
            </p>
          </div>

          {/* Findings */}
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1 mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                Findings
              </h4>
              <span className="text-[10px] text-secondary font-mono">
                {findingsStyle === 'without_headings' ? 'Without Subheadings (LGH Standard)' : 'With Subheadings'}
              </span>
            </div>
            <div className="space-y-2.5 pl-1">
              {template.normalFindings.map((finding, idx) => {
                if (findingsStyle === 'without_headings') {
                  const cleaned = stripOrIntegrateHeading(finding);
                  return (
                    <div key={idx} className="flex items-start gap-2 text-secondary">
                      <span className="text-primary font-bold select-none">•</span>
                      <p>{cleaned}</p>
                    </div>
                  );
                }

                const colonIdx = finding.indexOf(':');
                if (colonIdx !== -1) {
                  const heading = finding.slice(0, colonIdx);
                  const body = finding.slice(colonIdx + 1);
                  return (
                    <div key={idx} className="flex items-start gap-2 text-secondary">
                      <span className="text-primary font-bold select-none">•</span>
                      <p>
                        <strong className="text-on-surface font-semibold">{heading}:</strong>
                        <span>{body}</span>
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex items-start gap-2 text-secondary">
                    <span className="text-primary font-bold select-none">•</span>
                    <p>{finding}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Impression */}
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-1 mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                Impression
              </h4>
              <span className="text-[10px] text-secondary font-mono">
                {impressionStyle === 'local_high_yield' ? 'Local High-Yield (1-2 Bullets)' : 'Academic ACR Structured'}
              </span>
            </div>
            <div className="bg-surface-container/50 p-3.5 rounded-xl border border-outline-variant/40">
              <p className="font-semibold text-on-surface whitespace-pre-line leading-relaxed">
                {displayedImpression}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/40 bg-surface-container-low flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Full Report</span>
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(template);
                  onClose();
                }}
                className="flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Template</span>
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyToReport}
              className="flex items-center gap-1.5 shadow-xs"
            >
              <FileCheck className="w-4 h-4" />
              <span>Use in Report</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
