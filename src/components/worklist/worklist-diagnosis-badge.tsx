'use client';

// Layer 4 (Presentation): High-Yield Clinical Diagnosis Highlight Badge
import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';

interface WorklistDiagnosisBadgeProps {
  highlight?: string;
  status?: string;
  className?: string;
}

export function WorklistDiagnosisBadge({
  highlight,
  status,
  className = '',
}: WorklistDiagnosisBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  if (!highlight || !highlight.trim()) {
    return null;
  }

  const clean = highlight.trim();

  // Highlight is relevant for studies that have reporting activity
  const isReported =
    !status ||
    status === 'draft' ||
    status === 'preliminary' ||
    status === 'submitted' ||
    status === 'reported' ||
    status === 'final' ||
    status === 'finalized' ||
    status === 'amended' ||
    status === 'in-progress';

  if (!isReported) {
    return null;
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setExpanded(!expanded);
      }}
      title={clean}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9.5px] leading-tight transition-all cursor-pointer select-none bg-primary/10 hover:bg-primary/15 border-primary/25 text-primary ${
        expanded
          ? 'whitespace-normal shadow-xs max-w-[230px]'
          : 'truncate max-w-[160px] sm:max-w-[185px]'
      } ${className}`}
    >
      <span className="shrink-0 flex items-center text-primary/80">
        <Target className="w-2.5 h-2.5 text-primary" />
      </span>

      <span className={`font-medium ${expanded ? 'break-words' : 'truncate'}`}>
        {clean}
      </span>

      <span className="shrink-0 text-primary/60 hover:text-primary">
        {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
      </span>
    </div>
  );
}
