'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';

export interface ZenSectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  previewText?: string;
  copyContent?: string;
  copyTitle?: string;
  richHtml?: boolean;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ZenSectionHeader({
  title,
  isCollapsed,
  onToggleCollapse,
  previewText,
  copyContent,
  copyTitle,
  richHtml,
  badge,
  actions,
}: ZenSectionHeaderProps) {
  return (
    <div
      onClick={onToggleCollapse}
      className="flex items-center justify-between shrink-0 pb-0.5 select-none cursor-pointer group"
      title={isCollapsed ? `Click to expand ${title}` : `Click to collapse ${title}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          className="p-0.5 rounded text-primary hover:bg-primary/10 transition-colors"
          aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90 text-muted-foreground' : 'text-primary'
            }`}
          />
        </button>
        <span className="font-headline text-[12px] font-bold uppercase tracking-wider text-primary group-hover:underline">
          {title}
        </span>
        {isCollapsed && (
          <span className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md italic ml-1">
            {previewText || `(Empty ${title.toLowerCase()})`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {badge}
        {copyContent && (
          <CopyButton
            text={copyContent}
            htmlContent={!richHtml}
            richHtml={richHtml}
            variant="ghost"
            size="xs"
            label="Copy"
            className="text-secondary hover:text-primary hover:bg-surface-container px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
            title={copyTitle || `Copy ${title} to clipboard`}
            ariaLabel={`Copy ${title} to clipboard`}
          />
        )}
        {actions}
      </div>
    </div>
  );
}
