'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BookmarkPlus, Trash2, FileText, ChevronDown, Search } from 'lucide-react';
import { HmisNormalTemplate } from '@/types/templates';
import { getTemplatesByModality, deleteCustomTemplate } from '@/services/template-manager.service';
import { mergeCrossSectionalTemplates } from '@/services/template-merger.service';
import { notify } from '@/services/notification.service';

interface ZenTemplateSelectorProps {
  modality: string;
  studyDescription?: string;
  onApplyTemplate: (tpl: HmisNormalTemplate) => void;
  onOpenSaveTemplate?: () => void;
  className?: string;
}

export function ZenTemplateSelector({
  modality,
  studyDescription,
  onApplyTemplate,
  onOpenSaveTemplate,
  className = '',
}: ZenTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-fetch templates on external save event
  useEffect(() => {
    const handleReload = () => setRefreshKey((k) => k + 1);
    window.addEventListener('radsuite:template-saved', handleReload);
    return () => window.removeEventListener('radsuite:template-saved', handleReload);
  }, []);

  const availableTemplates = useMemo(() => {
    const mod = modality?.toUpperCase() === 'MRI' || modality?.toUpperCase() === 'MR' ? 'MRI' : 'CT';
    return getTemplatesByModality(mod);
  }, [modality, refreshKey]);

  // Set default initial template selection based on study description & modality
  useEffect(() => {
    if (selectedIds.length === 0 && availableTemplates.length > 0) {
      const desc = (studyDescription || '').toUpperCase();
      let matched = availableTemplates[0];
      if (desc.includes('SPINE') || desc.includes('LS') || desc.includes('LUMBAR')) {
        const spineTpl = availableTemplates.find((t) => t.id.includes('spine') || t.id.includes('ls') || t.name.toUpperCase().includes('SPINE') || t.name.toUpperCase().includes('LUMB'));
        if (spineTpl) matched = spineTpl;
      } else if (desc.includes('CERVICAL') || desc.includes('CS')) {
        const csTpl = availableTemplates.find((t) => t.id.includes('cervical') || t.name.toUpperCase().includes('CERVICAL'));
        if (csTpl) matched = csTpl;
      } else if (desc.includes('KNEE')) {
        const kneeTpl = availableTemplates.find((t) => t.id.includes('knee') || t.name.toUpperCase().includes('KNEE'));
        if (kneeTpl) matched = kneeTpl;
      } else if (desc.includes('BRAIN') || desc.includes('HEAD')) {
        const brainTpl = availableTemplates.find((t) => t.id.includes('brain') || t.name.toUpperCase().includes('BRAIN'));
        if (brainTpl) matched = brainTpl;
      }
      setSelectedIds([matched.id]);
    }
  }, [availableTemplates, selectedIds.length, studyDescription]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return availableTemplates;
    const q = search.toLowerCase().trim();
    return availableTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subspecialty.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [availableTemplates, search]);

  const handleToggleTemplate = (tpl: HmisNormalTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    let newSelected: string[];
    if (isCtrlOrMeta) {
      // Toggle in multi-select mode
      newSelected = selectedIds.includes(tpl.id)
        ? selectedIds.filter((id) => id !== tpl.id)
        : [...selectedIds, tpl.id];
      if (newSelected.length === 0) newSelected = [tpl.id];
    } else {
      // Single click select
      newSelected = [tpl.id];
    }

    setSelectedIds(newSelected);
    applySelected(newSelected);
    if (!isCtrlOrMeta) setIsOpen(false);
  };

  const applySelected = (ids: string[]) => {
    const chosen = availableTemplates.filter((t) => ids.includes(t.id));
    if (chosen.length === 1) {
      onApplyTemplate(chosen[0]);
    } else if (chosen.length > 1) {
      try {
        const merged = mergeCrossSectionalTemplates(chosen);
        onApplyTemplate(merged);
      } catch (err) {
        console.warn('[TemplateSelector] Merge failed:', err);
      }
    }
  };

  const displayTitle = useMemo(() => {
    if (selectedIds.length === 1) {
      const found = availableTemplates.find((t) => t.id === selectedIds[0]);
      return found?.name || 'Select Reporting Template';
    }
    if (selectedIds.length > 1) {
      return `Multi-Template (${selectedIds.length} combined)`;
    }
    return 'Select Reporting Template';
  }, [selectedIds, availableTemplates]);

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between gap-1.5 bg-surface-container hover:bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/50 shadow-2xs transition-colors cursor-pointer text-left max-w-[140px] sm:max-w-[190px]"
        title={`Active Template: ${displayTitle}\nClick to choose · Ctrl+Click to combine`}
      >
        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-headline text-[11px] font-semibold text-on-surface truncate">
          {displayTitle}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu: Spacious & Unclipped */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-[360px] sm:w-[420px] max-w-[95vw] bg-surface-container-low rounded-xl border border-outline-variant/60 shadow-2xl p-2.5 max-h-[420px] flex flex-col gap-2 select-none animate-in fade-in zoom-in-95 duration-100">
          {/* Header & Count */}
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
            <span className="text-[11px] font-headline font-bold text-primary uppercase tracking-wider">
              Clinical Reporting Templates
            </span>
            <span className="text-[9px] font-mono text-secondary">
              {filteredTemplates.length} available
            </span>
          </div>

          {/* Search Field */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates (e.g., brain, spine, chest)..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant/40 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-none focus:border-primary shadow-inner"
              autoFocus
            />
          </div>

          {/* Scrollable Templates List */}
          <div className="overflow-y-auto space-y-1 max-h-[250px] pr-1">
            {filteredTemplates.length === 0 ? (
              <div className="py-6 text-center text-xs text-secondary italic">
                No templates matching &quot;{search}&quot;
              </div>
            ) : (
              filteredTemplates.map((t) => {
                const isChecked = selectedIds.includes(t.id);
                const isCustom = t.id.startsWith('custom-');
                return (
                  <div
                    key={t.id}
                    onClick={(e) => handleToggleTemplate(t, e)}
                    className={`group flex items-start justify-between gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-primary/10 text-primary border border-primary/25'
                        : 'hover:bg-surface-container text-on-surface border border-transparent'
                    }`}
                    title={t.description}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="mt-0.5 w-3.5 h-3.5 accent-primary cursor-pointer shrink-0 pointer-events-none"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[12px] leading-tight text-on-surface">
                            {t.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface border border-outline-variant/30 text-secondary shrink-0">
                            {t.subspecialty}
                          </span>
                        </div>
                        {t.description && (
                          <span className="text-[10px] text-secondary/80 line-clamp-1 mt-0.5">
                            {t.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {isCustom && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Custom
                        </span>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomTemplate(t.id);
                            setRefreshKey((k) => k + 1);
                            notify.info(`Deleted custom template "${t.name}"`);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-secondary hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                          title="Delete this custom template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Multi-Select Hint & Save Action */}
          <div className="pt-1.5 border-t border-outline-variant/30 flex items-center justify-between gap-2">
            <span className="text-[9px] text-secondary/70 italic truncate">
              Tip: Ctrl+Click to combine multi-templates
            </span>
            {onOpenSaveTemplate && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSaveTemplate();
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer shrink-0"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Save New...</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
