'use client';

import { useState, useMemo } from 'react';
import { X, Search, Check, Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HmisNormalTemplate } from '@/types/templates';
import { TemplateAddForm } from './template-add-form';
import {
  getAllTemplatesWithCustom,
  addCustomTemplate,
  deleteCustomTemplate,
} from '@/services/template-manager.service';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: HmisNormalTemplate) => void;
  initialModality?: string;
}

export function TemplateManagerModal({
  isOpen,
  onClose,
  onApplyTemplate,
  initialModality = 'ALL',
}: TemplateManagerModalProps) {
  const [modality, setModality] = useState<'ALL' | 'CT' | 'MRI'>(
    initialModality === 'CT' || initialModality === 'MRI' ? initialModality : 'ALL'
  );
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<HmisNormalTemplate[]>(() => getAllTemplatesWithCustom());
  const [selectedTemplate, setSelectedTemplate] = useState<HmisNormalTemplate>(templates[0]);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      const matchMod = modality === 'ALL' || t.modality === modality;
      const matchQ = !q || t.name.toLowerCase().includes(q) || t.subspecialty.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      return matchMod && matchQ;
    });
  }, [templates, modality, search]);

  if (!isOpen) return null;

  const handleCreateCustom = (data: Omit<HmisNormalTemplate, 'id'>) => {
    const created = addCustomTemplate(data);
    const refreshed = getAllTemplatesWithCustom();
    setTemplates(refreshed);
    setSelectedTemplate(created);
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomTemplate(id);
    const refreshed = getAllTemplatesWithCustom();
    setTemplates(refreshed);
    if (selectedTemplate?.id === id) setSelectedTemplate(refreshed[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                HMIS Template Management System
                <Badge variant="outline" className="text-[10px] font-mono">{templates.length} Templates</Badge>
              </h3>
              <p className="text-[11px] text-zinc-500">Official Punjab HMIS & LGH normal reporting protocols</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowAddForm(!showAddForm)} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> {showAddForm ? 'Browse Templates' : 'Add Custom Template'}
            </Button>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showAddForm ? (
          <TemplateAddForm onSave={handleCreateCustom} onCancel={() => setShowAddForm(false)} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates (e.g., KUB, stroke, spine)..."
                  className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                {(['ALL', 'CT', 'MRI'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModality(m)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      modality === m ? 'bg-primary text-primary-foreground' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 flex-1 min-h-0 divide-x divide-zinc-200 dark:divide-zinc-800">
              <div className="col-span-2 overflow-y-auto p-2 space-y-1">
                {filtered.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      selectedTemplate?.id === tpl.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-[11px] truncate">{tpl.name}</div>
                      <span className="text-[9px] text-zinc-400 block">{tpl.subspecialty}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{tpl.modality}</Badge>
                      {tpl.id.startsWith('custom-') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                          className="text-rose-400 hover:text-rose-600 p-0.5"
                          title="Delete Custom Template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-span-3 overflow-y-auto p-3.5 space-y-3 bg-zinc-50/30 dark:bg-zinc-950/20">
                {selectedTemplate && (
                  <>
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{selectedTemplate.name}</h4>
                      <p className="text-[10px] text-zinc-500">{selectedTemplate.description}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Technique</span>
                      <p className="text-[11px] text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        {selectedTemplate.technique}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Normal Findings ({selectedTemplate.normalFindings.length} Statements)
                      </span>
                      <ul className="text-[11px] text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1 list-disc list-inside max-h-48 overflow-y-auto">
                        {selectedTemplate.normalFindings.map((f, i) => (
                          <li key={i} className="leading-relaxed">{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Default Normal Impression</span>
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                        {selectedTemplate.defaultImpression}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (selectedTemplate) onApplyTemplate(selectedTemplate);
                  onClose();
                }}
                className="gap-1 font-semibold"
              >
                <Check className="w-3.5 h-3.5" /> Apply Template to Report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
