'use client';

import React from 'react';
import { User, Stethoscope, ShieldCheck, HelpCircle } from 'lucide-react';

interface ZenSignoffAttributionProps {
  pgrName: string;
  onPgrNameChange?: (name: string) => void;
  consultantName: string;
  onConsultantNameChange?: (name: string) => void;
  className?: string;
}

export function ZenSignoffAttribution({
  pgrName,
  onPgrNameChange,
  consultantName,
  onConsultantNameChange,
  className = '',
}: ZenSignoffAttributionProps) {
  return (
    <div
      className={`border-t border-outline-variant/40 bg-surface-container-lowest/80 px-3.5 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 select-none ${className}`}
      aria-label="Clinical Sign-off and Attribution"
    >
      {/* Title & Context */}
      <div className="flex items-center gap-1.5 shrink-0 text-secondary">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-on-surface">Clinical Attribution:</span>
        <span
          className="text-[10px] text-secondary/80 hidden sm:inline"
          title="These clinician names will appear on all HMIS dispatches, verified hospital sheets, and exported PDF/DOCX reports."
        >
          (Persisted for your rotation)
        </span>
      </div>

      {/* Attribution Inputs */}
      <div className="flex-1 w-full md:w-auto flex flex-wrap items-center gap-2">
        {/* Reporting Resident / PGR */}
        <div className="flex-1 min-w-[170px] flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/60 shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <User className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-secondary leading-none">
              Reporting Resident
            </span>
            <input
              type="text"
              value={pgrName}
              onChange={(e) => onPgrNameChange?.(e.target.value)}
              placeholder="e.g. Dr. Resident Name (PGR)"
              className="bg-transparent text-[11px] font-semibold text-on-surface focus:outline-none w-full placeholder:text-secondary/50 pt-0.5"
              title="Reporting Resident / PGR Radiologist Name"
            />
          </div>
        </div>

        {/* Supervising Consultant */}
        <div className="flex-1 min-w-[200px] flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/60 shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Stethoscope className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-secondary leading-none">
              Supervising Consultant
            </span>
            <input
              type="text"
              value={consultantName}
              onChange={(e) => onConsultantNameChange?.(e.target.value)}
              placeholder="e.g. Dr. Consultant Name (FCPS)"
              className="bg-transparent text-[11px] font-semibold text-on-surface focus:outline-none w-full placeholder:text-secondary/50 pt-0.5"
              title="Supervising Consultant Radiologist Name (Used in verified sign-off)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
