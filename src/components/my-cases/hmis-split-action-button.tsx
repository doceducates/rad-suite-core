'use client';

// Layer 4 (Presentation): HMIS Split-Action Button using Reusable DropdownMenu Primitive
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { CloudUpload, ChevronDown, RotateCcw } from 'lucide-react';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface HmisSplitActionButtonProps {
  onSaveDrafts: () => void;
  onRevertToBlank: () => void;
  onSubmitFinal?: () => void;
  isFinalSubmitAllowed?: boolean;
}

export function HmisSplitActionButton({
  onSaveDrafts,
  onRevertToBlank,
  onSubmitFinal,
  isFinalSubmitAllowed = false,
}: HmisSplitActionButtonProps) {
  const items: DropdownMenuItem[] = [
    {
      id: 'draft',
      label: 'Save Drafts',
      sublabel: 'Background queue dispatch',
      icon: <CloudUpload className="w-3.5 h-3.5 text-primary shrink-0" />,
      onClick: onSaveDrafts,
    },
    {
      id: 'revert',
      label: 'Revert to Blank',
      sublabel: 'Reset online HMIS drafts',
      icon: <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      className: 'hover:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      onClick: onRevertToBlank,
    },
    {
      id: 'submit',
      label: 'Submit HMIS',
      sublabel: isFinalSubmitAllowed ? 'Finalize & publish to HMIS' : 'Safety policy locked',
      locked: !isFinalSubmitAllowed,
      badge: isFinalSubmitAllowed ? undefined : 'Locked',
      onClick: isFinalSubmitAllowed ? onSubmitFinal : undefined,
    },
  ];

  return (
    <div className="inline-flex items-center rounded-lg shadow-2xs shrink-0">
      {/* Primary 1-Click Action: Save HMIS Drafts */}
      <button
        type="button"
        onClick={onSaveDrafts}
        className="flex items-center gap-1.5 h-7.5 sm:h-8 px-2.5 rounded-l-lg bg-primary hover:bg-primary/90 text-white font-semibold text-xs cursor-pointer transition-colors"
        title="Save report drafts to HMIS in background for all selected cases"
      >
        <CloudUpload className="w-3.5 h-3.5" />
        <span>Draft</span>
      </button>

      {/* Reusable Dropdown Menu for Chevron Trigger */}
      <DropdownMenu
        trigger={
          <button
            type="button"
            aria-label="More HMIS actions"
            className="flex items-center justify-center h-7.5 sm:h-8 px-1.5 rounded-r-lg bg-primary/90 hover:bg-primary text-white border-l border-white/20 cursor-pointer transition-colors"
            title="More HMIS options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        }
        items={items}
        direction="up"
        align="left"
        header="HMIS Actions"
      />
    </div>
  );
}
