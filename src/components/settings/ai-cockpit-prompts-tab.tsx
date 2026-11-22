'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RotateCcw, Save, CheckCircle2, FileCode, Layers } from 'lucide-react';
import {
  DEFAULT_STRUCTURING_PROMPT,
  DEFAULT_POLISH_PROMPT,
  DEFAULT_COPILOT_PROMPT,
} from '@/services/clinical-prompts.service';
import { CLINICAL_REGION_CATALOG } from '@/services/region-prompts.service';

interface AiCockpitPromptsTabProps {
  settings: any;
  onRefresh: () => void;
}

export function AiCockpitPromptsTab({ settings, onRefresh }: AiCockpitPromptsTabProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string>('spine_ls');
  const [regionPrompts, setRegionPrompts] = useState<Record<string, string>>({});
  const [polishPrompt, setPolishPrompt] = useState('');
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      const initialReg: Record<string, string> = {};
      CLINICAL_REGION_CATALOG.forEach((r) => {
        initialReg[r.id] = settings?.customRegionPrompts?.[r.id] || r.defaultPrompt;
      });
      setRegionPrompts(initialReg);
      setPolishPrompt(settings.customPolishPrompt || DEFAULT_POLISH_PROMPT);
      setCopilotPrompt(settings.customCopilotPrompt || DEFAULT_COPILOT_PROMPT);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customRegionPrompts: regionPrompts,
          customPolishPrompt: polishPrompt,
          customCopilotPrompt: copilotPrompt,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defReg: Record<string, string> = {};
    CLINICAL_REGION_CATALOG.forEach((r) => {
      defReg[r.id] = r.defaultPrompt;
    });
    setRegionPrompts(defReg);
    setPolishPrompt(DEFAULT_POLISH_PROMPT);
    setCopilotPrompt(DEFAULT_COPILOT_PROMPT);
  };

  const currentRegion = CLINICAL_REGION_CATALOG.find((r) => r.id === selectedRegionId) || CLINICAL_REGION_CATALOG[0];

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <strong className="flex items-center gap-1.5 text-xs">
            <FileCode className="w-3.5 h-3.5" /> Regional Clinical Prompts & System Instructions
          </strong>
          <p className="text-[11px] text-primary/80 mt-0.5">
            Specialized reporting instructions for Spine (LS, Cervical, Dorsal), Brain, Chest and Abdomen.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={handleResetDefaults} className="text-xs h-7 gap-1">
            <RotateCcw className="w-3 h-3" /> Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Region Selector Pills */}
      <div className="space-y-1.5">
        <label className="font-bold text-on-surface block text-[11px] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" /> Anatomical Region Template:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CLINICAL_REGION_CATALOG.map((r) => {
            const isSelected = selectedRegionId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRegionId(r.id)}
                className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-primary bg-primary/15 text-primary shadow-xs font-semibold'
                    : 'border-outline-variant/60 bg-surface-container-low text-secondary hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{r.label}</span>
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-current opacity-70">
                  {r.modality}
                </Badge>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-secondary mt-0.5">{currentRegion.description}</p>
      </div>

      {/* Selected Region Structuring Prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-bold text-on-surface text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" /> Instructions for {currentRegion.label}:
          </label>
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">Auto-Injected on Study Match</Badge>
        </div>
        <textarea
          value={regionPrompts[selectedRegionId] || ''}
          onChange={(e) => setRegionPrompts({ ...regionPrompts, [selectedRegionId]: e.target.value })}
          rows={9}
          className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] leading-relaxed focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
        />
      </div>

      {/* Polish Prompt Textarea */}
      <div className="space-y-1.5">
        <label className="font-bold text-on-surface text-[11px] block">
          Quick Polish & Standardizer Instructions:
        </label>
        <textarea
          value={polishPrompt}
          onChange={(e) => setPolishPrompt(e.target.value)}
          rows={3}
          className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] leading-relaxed focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
        />
      </div>

      {/* Copilot Prompt Textarea */}
      <div className="space-y-1.5">
        <label className="font-bold text-on-surface text-[11px] block">
          Diagnostic Copilot System Prompt:
        </label>
        <textarea
          value={copilotPrompt}
          onChange={(e) => setCopilotPrompt(e.target.value)}
          rows={2}
          className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface font-mono text-[11px] leading-relaxed focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
        />
      </div>

      {/* Save Action */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          className="gap-1.5 text-xs py-2 px-4"
        >
          <Save className="w-3.5 h-3.5" /> Save Regional System Instructions
        </Button>
        {savedSuccess && (
          <span className="text-primary font-semibold text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Instructions Saved Successfully
          </span>
        )}
      </div>
    </div>
  );
}
