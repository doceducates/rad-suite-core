'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Zap, Search, Layers, ChevronDown, Check, Sparkles } from 'lucide-react';
import { CrossSectionalTemplate } from '@/types/templates';
import {
  STANDARDIZED_CT_TEMPLATES,
  STANDARDIZED_MRI_TEMPLATES,
  mergeCrossSectionalTemplates,
} from '@/services/ct-mri-templates';

interface QuickTemplateBarProps {
  modality?: string;
  onApplyTemplate: (template: CrossSectionalTemplate) => void;
  onOpenFullModal: () => void;
}

export function QuickTemplateBar({
  modality = 'CT',
  onApplyTemplate,
  onOpenFullModal,
}: QuickTemplateBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [combineMode, setCombineMode] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<CrossSectionalTemplate[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cleanModality = modality.toUpperCase() === 'MRI' ? 'MRI' : 'CT';

  const availableTemplates = useMemo(() => {
    return cleanModality === 'MRI' ? STANDARDIZED_MRI_TEMPLATES : STANDARDIZED_CT_TEMPLATES;
  }, [cleanModality]);

  // High-volume quick action pills
  const topPills = useMemo(() => {
    if (cleanModality === 'CT') {
      return availableTemplates.filter((t) =>
        ['ct-brain-plain', 'ct-chest-cect', 'ct-abdomen-pelvis-cect', 'ct-kub-plain', 'ct-cervical-spine', 'ct-pulmonary-angiogram'].includes(t.id)
      );
    }
    return availableTemplates.filter((t) =>
      ['mri-brain-routine', 'mri-brain-stroke', 'mri-lumbar-spine', 'mri-knee', 'mri-shoulder', 'mrcp'].includes(t.id)
    );
  }, [cleanModality, availableTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableTemplates;
    return availableTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subspecialty.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [availableTemplates, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to open template search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTemplate = (template: CrossSectionalTemplate) => {
    if (combineMode) {
      const exists = selectedForCombine.some((t) => t.id === template.id);
      if (exists) {
        setSelectedForCombine((p) => p.filter((t) => t.id !== template.id));
      } else {
        setSelectedForCombine((p) => [...p, template]);
      }
      return;
    }

    onApplyTemplate(template);
    setIsOpen(false);
    setSearch('');
  };

  const handleExecuteCombine = () => {
    if (selectedForCombine.length === 0) return;
    const merged = mergeCrossSectionalTemplates(selectedForCombine);
    onApplyTemplate(merged);
    setSelectedForCombine([]);
    setCombineMode(false);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 bg-zinc-50/90 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-xs">
      {/* Left: Quick Search Combobox */}
      <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-primary text-zinc-800 dark:text-zinc-200 font-medium text-[11px] transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-primary fill-primary/20" />
          <span>Quick Template</span>
          <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">(Ctrl+K)</span>
          <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-96">
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${cleanModality} templates (e.g. brain, chest, spine)...`}
                className="w-full bg-transparent text-xs focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            {/* Combine Mode Toggle */}
            <div className="px-2.5 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 text-primary font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={combineMode}
                  onChange={(e) => {
                    setCombineMode(e.target.checked);
                    if (!e.target.checked) setSelectedForCombine([]);
                  }}
                  className="rounded text-primary focus:ring-0"
                />
                Multi-Region Combine (e.g. Chest + Abdomen)
              </label>

              {combineMode && selectedForCombine.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteCombine}
                  className="px-2 py-0.5 bg-primary text-on-primary rounded text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Merge ({selectedForCombine.length})
                </button>
              )}
            </div>

            {/* Template List */}
            <div className="overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 flex-1">
              {filteredTemplates.length === 0 ? (
                <div className="p-4 text-center text-zinc-400 text-xs">No matching templates found</div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = selectedForCombine.some((c) => c.id === t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTemplate(t)}
                      className={`w-full text-left p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-start justify-between gap-2 ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          {t.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">{t.description}</div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {t.subspecialty}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center/Right: High-frequency Quick Action Pills */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-full">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mr-0.5 hidden lg:inline">
          Top:
        </span>
        {topPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onApplyTemplate(pill)}
            className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-primary hover:text-primary text-zinc-700 dark:text-zinc-300 text-[10px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1"
            title={`One-click inject: ${pill.name}`}
          >
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            {pill.name.replace(/\(.*\)/, '').replace(/CT |MRI /, '').trim()}
          </button>
        ))}

        <button
          type="button"
          onClick={onOpenFullModal}
          className="ml-1 text-[11px] text-primary hover:underline flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
        >
          <Layers className="w-3 h-3" /> All
        </button>
      </div>
    </div>
  );
}
