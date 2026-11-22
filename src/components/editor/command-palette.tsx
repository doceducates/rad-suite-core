'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Sparkles, FileCheck, Zap, Search, Database, Eye } from 'lucide-react';
import { STANDARDIZED_CT_TEMPLATES, STANDARDIZED_MRI_TEMPLATES } from '@/services/ct-mri-templates';
import { CLINICAL_MACROS } from './clinical-macros-bar';
import type { PacsStudyResult } from '@/types/pacs';

export type CommandAction =
  | { type: 'template'; id: string }
  | { type: 'ai'; action: string }
  | { type: 'macro'; text: string }
  | { type: 'action'; action: string };

export interface CommandPaletteProps {
  onAction: (action: CommandAction) => void;
  modality?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type CommandGroup = 'Diagnostic Cases' | 'Templates' | 'AI Actions' | 'Macros' | 'Actions';

interface CommandItem {
  id: string;
  group: CommandGroup;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: CommandAction;
}

export function CommandPalette({ onAction, modality = 'CT', isOpen: controlledIsOpen, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    setInternalIsOpen(val);
  };

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveCases, setLiveCases] = useState<PacsStudyResult[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Search PACS & local archive dynamically when typing
  useEffect(() => {
    if (!isOpen || !query.trim() || query.length < 2) {
      setLiveCases([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/pacs/query?query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && Array.isArray(d.studies)) setLiveCases(d.studies.slice(0, 5));
        })
        .catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen, query]);

  const allItems = useMemo<CommandItem[]>(() => {
    const isMri = modality.toUpperCase() === 'MRI' || modality.toUpperCase() === 'MR';
    const templates = isMri ? STANDARDIZED_MRI_TEMPLATES : STANDARDIZED_CT_TEMPLATES;

    const caseItems: CommandItem[] = liveCases.map((c) => ({
      id: `case-${c.accessionNumber}`,
      group: 'Diagnostic Cases',
      title: `${c.patientName} (${c.modality} • ${c.studyDescription})`,
      subtitle: `ACC: ${c.accessionNumber} • ${c.source === 'local_archive' ? 'Local Storage' : 'Hospital PACS'}`,
      icon: Eye,
      action: { type: 'action', action: `open-case:${c.localCaseId || c.accessionNumber}` },
    }));

    const templateItems: CommandItem[] = templates.map((t) => ({
      id: `tpl-${t.id}`,
      group: 'Templates',
      title: t.name,
      icon: Layers,
      action: { type: 'template', id: t.id },
    }));

    const macroItems: CommandItem[] = CLINICAL_MACROS.map((m) => ({
      id: `macro-${m.label}`,
      group: 'Macros',
      title: m.label,
      icon: FileCheck,
      action: { type: 'macro', text: m.text },
    }));

    const aiItems: CommandItem[] = [
      { id: 'ai-imp', group: 'AI Actions', title: 'Synthesize Impression (Gemini)', icon: Sparkles, action: { type: 'ai', action: 'impression' } },
      { id: 'ai-std', group: 'AI Actions', title: 'Standardize & Clean Style', icon: Sparkles, action: { type: 'ai', action: 'standardize' } },
      { id: 'ai-dis', group: 'AI Actions', title: 'Patient Discharge Summary', icon: Sparkles, action: { type: 'ai', action: 'simplify' } },
      { id: 'ai-str', group: 'AI Actions', title: 'Auto-Structure Report (MedGemma)', icon: Sparkles, action: { type: 'ai', action: 'structure' } },
    ];

    const actionItems: CommandItem[] = [
      { id: 'act-pacs', group: 'Actions', title: 'Search Full PACS Archive (Ctrl+Shift+P)', icon: Database, action: { type: 'action', action: 'pacs-search' } },
      { id: 'act-save', group: 'Actions', title: 'Save Draft Report', icon: Zap, action: { type: 'action', action: 'save' } },
      { id: 'act-fin', group: 'Actions', title: 'Finalize & Sign Report', icon: Zap, action: { type: 'action', action: 'finalize' } },
      { id: 'act-hmis', group: 'Actions', title: 'Send to HMIS Punjab', icon: Zap, action: { type: 'action', action: 'hmis' } },
      { id: 'act-hosp', group: 'Actions', title: 'View Official LGH Report', icon: Zap, action: { type: 'action', action: 'hospital-report' } },
      { id: 'act-rad', group: 'Actions', title: 'Launch External RadiAnt Viewer', icon: Zap, action: { type: 'action', action: 'radiant' } },
    ];

    return [...caseItems, ...templateItems, ...aiItems, ...macroItems, ...actionItems];
  }, [liveCases, modality]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((i) => i.title.toLowerCase().includes(q) || i.group.toLowerCase().includes(q) || i.subtitle?.toLowerCase().includes(q));
  }, [allItems, query]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filteredItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const handleAction = (action: CommandAction) => {
    if (action.type === 'action' && action.action.startsWith('open-case:')) {
      const caseId = action.action.replace('open-case:', '');
      router.push(`/workstation/${encodeURIComponent(caseId)}`);
      setIsOpen(false);
      return;
    }
    onAction(action);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (filteredItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((p) => (p + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((p) => (p - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) handleAction(item.action);
    }
  };

  if (!isOpen) return null;
  let counter = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
    >
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[72vh]">
        <div className="flex items-center px-3 py-2.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Search cases, templates, actions... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2.5 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs">No matching cases or actions</div>
          ) : (
            Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="space-y-1">
                <div className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group}</div>
                {items.map((item) => {
                  const idx = counter++;
                  const isSel = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full flex items-center px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                        isSel ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => handleAction(item.action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <item.icon className={`w-3.5 h-3.5 mr-2 shrink-0 ${isSel ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        {item.subtitle && <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border flex justify-between bg-muted/20">
          <span>Type to filter · Enter to select</span>
          <span>Ctrl+Shift+P for Full PACS Search</span>
        </div>
      </div>
    </div>
  );
}
