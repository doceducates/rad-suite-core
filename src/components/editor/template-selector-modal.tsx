'use client';

import { useState } from 'react';
import { CROSS_SECTIONAL_TEMPLATES } from '@/services/ct-mri-templates';
import { HIGH_VOLUME_SLOT_TEMPLATES } from '@/services/slot-templates.data';
import { CrossSectionalTemplate } from '@/types/templates';
import { SlotTemplate } from '@/types/slot-templates';
import { X, Check, Layers, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: CrossSectionalTemplate) => void;
  onApplySlotTemplate?: (template: SlotTemplate, mode: 'suppress' | 'strikethrough') => void;
}

export function TemplateSelectorModal({
  isOpen,
  onClose,
  onApplyTemplate,
  onApplySlotTemplate,
}: TemplateSelectorModalProps) {
  const [engineType, setEngineType] = useState<'standard' | 'subtractive'>('subtractive');
  const [selectedModality, setSelectedModality] = useState<'ALL' | 'CT' | 'MRI'>('ALL');
  const [previewStandard, setPreviewStandard] = useState<CrossSectionalTemplate>(CROSS_SECTIONAL_TEMPLATES[0]);
  const [previewSlot, setPreviewSlot] = useState<SlotTemplate>(HIGH_VOLUME_SLOT_TEMPLATES[0]);

  if (!isOpen) return null;

  const filteredStandard = CROSS_SECTIONAL_TEMPLATES.filter(
    (t) => selectedModality === 'ALL' || t.modality === selectedModality
  );

  const filteredSlots = HIGH_VOLUME_SLOT_TEMPLATES.filter(
    (t) => selectedModality === 'ALL' || t.modality === selectedModality
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-on-primary">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Reporting Templates & Subtractive Slots
              </h3>
              <p className="text-[11px] text-zinc-500">Standardized normal anatomy with automatic slot-level normal suppression</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Engine Switch & Modality Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-zinc-200 dark:bg-zinc-800">
            <button
              onClick={() => setEngineType('subtractive')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                engineType === 'subtractive'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <Zap className="w-3 h-3" /> Subtractive Slot Engine
            </button>
            <button
              onClick={() => setEngineType('standard')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all ${
                engineType === 'standard'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Standard Protocols
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(['ALL', 'CT', 'MRI'] as const).map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModality(mod)}
                className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] transition-all ${
                  selectedModality === mod
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Body Split */}
        <div className="grid grid-cols-5 flex-1 min-h-0 divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* List */}
          <div className="col-span-2 overflow-y-auto p-2 space-y-1.5">
            {engineType === 'subtractive'
              ? filteredSlots.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setPreviewSlot(tpl)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      previewSlot.id === tpl.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">{tpl.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                        {tpl.modality}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">{tpl.slots.length} Organ Slots</span>
                  </button>
                ))
              : filteredStandard.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setPreviewStandard(tpl)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      previewStandard.id === tpl.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">{tpl.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                        {tpl.modality}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">{tpl.subspecialty}</span>
                  </button>
                ))}
          </div>

          {/* Preview Panel */}
          <div className="col-span-3 overflow-y-auto p-3.5 space-y-2.5 bg-zinc-50/40 dark:bg-zinc-950/20">
            {engineType === 'subtractive' ? (
              <>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px]">
                  <strong>⚡ Subtractive Engine:</strong> When findings are dictated, matching organ normal sentences are removed automatically with zero hallucination.
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Technique</span>
                  <p className="text-[11px] text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {previewSlot.technique}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Configured Organ Slots ({previewSlot.slots.length})</span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {previewSlot.slots.map((slot) => (
                      <div key={slot.slotId} className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px]">
                        <div className="flex items-center justify-between mb-0.5">
                          <strong className="text-zinc-900 dark:text-zinc-100">{slot.organName}</strong>
                          <span className="text-[9px] font-mono text-zinc-400">Triggers: {slot.keywords.slice(0, 3).join(', ')}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{slot.normalText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Technique Protocol</span>
                  <p className="text-[11px] text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    {previewStandard.technique}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Normal Findings</span>
                  <ul className="text-[11px] text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1 list-disc list-inside">
                    {previewStandard.normalFindings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {engineType === 'subtractive' && onApplySlotTemplate && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onApplySlotTemplate(previewSlot, 'suppress');
                  notify.info(`Subtractive slot template applied: ${previewSlot.name}`);
                  onClose();
                }}
                className="gap-1 font-semibold text-primary"
              >
                <Zap className="w-3.5 h-3.5" /> Auto-Merge with Dictation
              </Button>
            )}

            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (engineType === 'subtractive' && onApplySlotTemplate) {
                  onApplySlotTemplate(previewSlot, 'suppress');
                  notify.info(`Subtractive slot template applied: ${previewSlot.name}`);
                } else {
                  onApplyTemplate(previewStandard);
                  notify.info(`Template applied: ${previewStandard.name}`);
                }
                onClose();
              }}
              className="gap-1 font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> Apply Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
