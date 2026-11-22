'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLINICAL_APPLICATIONS,
  getApplicationsForModality,
  resolveStudyDefaultApp,
  type ClinicalApplication,
} from '@/services/clinical-applications.service';

export interface VitreaApplicationSelectorProps {
  modality: string;
  studyDescription?: string;
  bodyPartExamined?: string;
  seriesCount?: number;
  activeAppId?: string;
  onSelectApp: (app: ClinicalApplication) => void;
  className?: string;
}

export function VitreaApplicationSelector({
  modality = 'CT',
  studyDescription = '',
  bodyPartExamined = '',
  seriesCount = 1,
  activeAppId,
  onSelectApp,
  className = '',
}: VitreaApplicationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recommendedApp = resolveStudyDefaultApp({
    modality,
    studyDescription,
    bodyPartExamined,
    seriesCount,
  });

  const activeApp =
    CLINICAL_APPLICATIONS.find((a) => a.id === activeAppId) || recommendedApp;

  const modalityApps = getApplicationsForModality(modality);
  const coreApps = CLINICAL_APPLICATIONS.filter((a) => a.modality === 'ALL');

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left select-none z-30', className)}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 hover:border-primary/50 text-on-surface rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        title={`Clinical Application: ${activeApp.displayName} · Protocol: ${activeApp.protocol}`}
      >
        <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
          {activeApp.iconName}
        </span>
        <span className="font-medium text-on-surface text-[11px] truncate max-w-[130px] sm:max-w-[160px]">
          {activeApp.displayName}
        </span>
        {activeApp.id === recommendedApp.id && (
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-primary/15 text-primary text-[9px] font-bold">
            Auto
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 text-secondary transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {/* Floating Popover Application Directory */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 max-h-96 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 text-white text-xs divide-y divide-zinc-900 animate-in fade-in zoom-in-95 duration-100 z-50 [scrollbar-width:thin]">
          {/* Section: Recommended for this study */}
          <div className="pb-1.5 mb-1">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Recommended Application</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectApp(recommendedApp);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors cursor-pointer',
                activeApp.id === recommendedApp.id
                  ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                  : 'hover:bg-zinc-900 text-zinc-200'
              )}
            >
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                {recommendedApp.iconName}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{recommendedApp.displayName}</span>
                  <span className="px-1 py-0.5 rounded bg-primary/30 text-primary text-[9px] font-mono">
                    {recommendedApp.protocol}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{recommendedApp.description}</p>
              </div>
            </button>
          </div>

          {/* Section: Modality Specialized Apps */}
          <div className="py-1.5">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              {modality.toUpperCase()} Applications
            </div>
            <div className="space-y-0.5">
              {modalityApps
                .filter((a) => a.id !== recommendedApp.id && a.modality !== 'ALL')
                .map((app) => {
                  const isSel = activeApp.id === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        onSelectApp(app);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                        isSel
                          ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                          : 'hover:bg-zinc-900 text-zinc-300 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[16px] text-zinc-400 shrink-0">
                          {app.iconName}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-medium text-zinc-200">{app.displayName}</div>
                          <div className="text-[9px] text-zinc-500 truncate">{app.protocol}</div>
                        </div>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Section: Core Workflows (3D MPR, Lightbox) */}
          <div className="pt-1.5">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              Core Workflows
            </div>
            <div className="space-y-0.5">
              {coreApps.map((app) => {
                const isSel = activeApp.id === app.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      onSelectApp(app);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                      isSel
                        ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                        : 'hover:bg-zinc-900 text-zinc-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[16px] text-zinc-400 shrink-0">
                        {app.iconName}
                      </span>
                      <span className="text-xs font-medium text-zinc-200">{app.displayName}</span>
                    </div>
                    {isSel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
