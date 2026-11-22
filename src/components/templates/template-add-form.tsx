'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { HmisNormalTemplate } from '@/types/templates';

interface TemplateAddFormProps {
  onSave: (template: Omit<HmisNormalTemplate, 'id'>) => void;
  onCancel: () => void;
}

export function TemplateAddForm({ onSave, onCancel }: TemplateAddFormProps) {
  const [title, setTitle] = useState('');
  const [modality, setModality] = useState<'CT' | 'MRI'>('CT');
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      name: title.trim(),
      modality,
      subspecialty: 'Abdominal',
      description: 'Custom user-defined HMIS reporting template',
      technique: technique.trim() || 'Standard volumetric cross-sectional protocol.',
      normalFindings: findings.split('\n').map((l) => l.trim()).filter(Boolean),
      defaultImpression: impression.trim() || 'Normal study without acute pathology.',
    });
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto flex-1">
      <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" /> Ingest New HMIS Normal Template
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Template Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., CT KUB without Contrast or MRI Brain with Contrast"
            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Modality</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value as 'CT' | 'MRI')}
            className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs cursor-pointer"
          >
            <option value="CT">CT Scan</option>
            <option value="MRI">MRI</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-400">Technique Description</label>
        <input
          type="text"
          value={technique}
          onChange={(e) => setTechnique(e.target.value)}
          placeholder="e.g. Non-contrast CT KUB performed with axial acquisition..."
          className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-400">Normal Findings (One statement per line)</label>
        <textarea
          rows={5}
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Bilateral kidneys are normal in size...&#10;Bilateral ureters are not dilated...&#10;Urinary bladder is unremarkable..."
          className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-400">Default Normal Impression</label>
        <input
          type="text"
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          placeholder="e.g., Normal study without evidence of acute pathology."
          className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleSubmit} disabled={!title.trim()}>
          Save Template
        </Button>
      </div>
    </div>
  );
}
