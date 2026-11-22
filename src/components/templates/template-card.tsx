'use client';

import React from 'react';
import { Eye, Copy, FileText, Check, Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CrossSectionalTemplate } from '@/types/templates';
import { isContrastStudy } from '@/services/template-manager.service';

interface TemplateCardProps {
  template: CrossSectionalTemplate;
  onPreview: (template: CrossSectionalTemplate) => void;
  onUse: (template: CrossSectionalTemplate) => void;
  onEdit?: (template: CrossSectionalTemplate) => void;
  onDelete?: (template: CrossSectionalTemplate) => void;
  copiedId: string | null;
  onCopy: (template: CrossSectionalTemplate) => void;
}

export function TemplateCard({
  template,
  onPreview,
  onUse,
  onEdit,
  onDelete,
  copiedId,
  onCopy,
}: TemplateCardProps) {
  const isContrast = isContrastStudy(template.name + ' ' + template.description + ' ' + template.technique);
  const sectionsCount = template.normalFindings?.length || 0;
  const isCopied = copiedId === template.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPreview(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPreview(template);
        }
      }}
      className="flex flex-col justify-between p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container hover:border-primary/60 hover:shadow-md transition-all duration-200 shadow-xs group cursor-pointer text-left select-none"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary font-mono">
              {template.modality}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container text-secondary">
              {template.subspecialty || 'General'}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-semibold',
                isContrast
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              )}
            >
              {isContrast ? 'Contrast' : 'Plain'}
            </span>
          </div>

          {template.isCustom ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md" title="Departmental template shared with all users">
              <Users className="w-3 h-3" /> Shared
            </span>
          ) : (
            <span className="text-[10px] font-medium text-secondary/70 font-mono">
              LGH Master
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
          {template.name}
        </h4>
        <p className="text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">
          {template.description || template.technique}
        </p>

        {/* Meta details */}
        <div className="flex items-center gap-3 mt-3 text-[11px] text-secondary/80">
          <span>{sectionsCount} anatomical {sectionsCount === 1 ? 'section' : 'sections'}</span>
          <span>•</span>
          <span className="truncate max-w-[140px]" title={template.defaultImpression}>
            {template.defaultImpression.split('\n')[0] || 'Standard normal impression'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-outline-variant/40">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template);
            }}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Preview template"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(template);
            }}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Copy findings"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container-high transition-colors"
              title="Edit template in TipTap editor"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {template.isCustom && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
              className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-surface-container-high transition-colors"
              title="Delete template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUse(template);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary text-xs font-semibold transition-all cursor-pointer shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Use in Report</span>
        </button>
      </div>
    </div>
  );
}
