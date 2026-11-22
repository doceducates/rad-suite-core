'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, Save, Filter, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClinicS3Status, ClinicSyncRules } from '@/services/clinic-node.service';

interface ClinicS3SyncCardProps {
  s3Status?: ClinicS3Status;
  initialRules?: ClinicSyncRules;
  onTestS3: () => Promise<void>;
  onSaveRules?: (rules: ClinicSyncRules) => Promise<void>;
  onChange?: (rules: ClinicSyncRules) => void;
  hideSaveButton?: boolean;
  loading?: boolean;
}

const MODALITY_OPTIONS = [
  { code: 'MR', label: 'MRI (Magnetic Resonance)', desc: 'High priority multi-sequence' },
  { code: 'CT', label: 'CT (Computed Tomography)', desc: 'Cross-sectional imaging' },
  { code: 'CR', label: 'X-Ray (CR/DX)', desc: 'Planar projection radiography' },
  { code: 'US', label: 'Ultrasound', desc: 'Sonography studies' },
];

const SPINE_PRESET = [
  'spine', 'cervical', 'dorsal', 'thoracic', 'lumbar', 'lumbosacral',
  'ls', 'lss', 'cs', 'css', 'ds', 'dss', 'dl'
];

export function ClinicS3SyncCard({
  s3Status,
  initialRules,
  onTestS3,
  onSaveRules,
  onChange,
  hideSaveButton = false,
  loading = false,
}: ClinicS3SyncCardProps) {
  const [modalities, setModalities] = useState<string[]>(initialRules?.allowedModalities || ['MR']);
  const [keywords, setKeywords] = useState<string[]>(initialRules?.descriptionKeywords || SPINE_PRESET);
  const [bypassKeywords, setBypassKeywords] = useState<boolean>(initialRules?.bypassKeywords || false);
  const [newKeyword, setNewKeyword] = useState('');
  const [syncMode, setSyncMode] = useState<'auto_filtered' | 'manual'>(initialRules?.syncMode || 'auto_filtered');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialRules) {
      if (initialRules.allowedModalities) setModalities(initialRules.allowedModalities);
      if (initialRules.descriptionKeywords) setKeywords(initialRules.descriptionKeywords);
      if (initialRules.bypassKeywords !== undefined) setBypassKeywords(initialRules.bypassKeywords);
      if (initialRules.syncMode) setSyncMode(initialRules.syncMode);
    }
  }, [initialRules]);

  const notify = (nextMods: string[], nextKws: string[], nextBypass: boolean, nextMode: 'auto_filtered' | 'manual') => {
    onChange?.({ allowedModalities: nextMods, descriptionKeywords: nextKws, bypassKeywords: nextBypass, syncMode: nextMode });
  };

  const applySpinePreset = () => {
    setKeywords(SPINE_PRESET);
    setBypassKeywords(false);
    notify(modalities, SPINE_PRESET, false, syncMode);
  };

  const toggleModality = (code: string) => {
    setModalities((prev) => {
      const next = prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code];
      notify(next, keywords, bypassKeywords, syncMode);
      return next;
    });
  };

  const addKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      const next = [...keywords, trimmed];
      setKeywords(next);
      setNewKeyword('');
      notify(modalities, next, bypassKeywords, syncMode);
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => {
      const next = prev.filter((k) => k !== kw);
      notify(modalities, next, bypassKeywords, syncMode);
      return next;
    });
  };

  const handleBypassChange = (val: boolean) => {
    setBypassKeywords(val);
    notify(modalities, keywords, val, syncMode);
  };

  const handleModeChange = (mode: 'auto_filtered' | 'manual') => {
    setSyncMode(mode);
    notify(modalities, keywords, bypassKeywords, mode);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTestS3();
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveRules) return;
    setSaving(true);
    try {
      await onSaveRules({
        allowedModalities: modalities,
        descriptionKeywords: keywords,
        bypassKeywords,
        syncMode,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Tier 2: Medical Sandbox &rarr; Rad Suite Cloud Selective Sync
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                radiology.sehatai.org
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Filter incoming scans from local Medical Sandbox before uploading to Cloud VPS to conserve bandwidth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing || loading}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Probing...' : 'Test Cloud Upload'}</span>
          </Button>
        </div>
      </div>

      {/* Sync Mode Selector */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Edge Ingestion Strategy</span>
          <span className="font-semibold text-foreground">
            {syncMode === 'auto_filtered' ? 'Automatic Filtered Sync' : 'Manual On-Demand Sync Only'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('auto_filtered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              syncMode === 'auto_filtered'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-card text-muted-foreground border border-border/60 hover:text-foreground'
            }`}
          >
            Auto Filtered
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              syncMode === 'manual'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-card text-muted-foreground border border-border/60 hover:text-foreground'
            }`}
          >
            Manual On-Demand
          </button>
        </div>
      </div>

      {/* Modality Filter Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-primary" /> Allowed Modalities for Cloud Upload
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODALITY_OPTIONS.map((opt) => {
            const active = modalities.includes(opt.code);
            return (
              <button
                type="button"
                key={opt.code}
                onClick={() => toggleModality(opt.code)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{opt.code}</span>
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyword Filter Tags */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" /> Study Description Keyword Filter
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={applySpinePreset}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
            >
              + Apply Spine Preset (LS, CS, DS)
            </button>
            <button
              type="button"
              onClick={() => setKeywords([])}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/30 transition-all cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Bypass Toggle */}
        <label className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 border border-border/40 text-[11px] cursor-pointer">
          <input
            type="checkbox"
            checked={bypassKeywords}
            onChange={(e) => handleBypassChange(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
          />
          <span className="font-semibold text-foreground">
            Bypass keyword filter (Upload all studies of selected modalities to Cloud)
          </span>
        </label>

        {!bypassKeywords && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-medium"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="hover:text-destructive cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Add keyword + Enter..."
                className="px-2.5 py-1 text-xs rounded-lg bg-muted/30 border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-primary font-mono text-foreground"
              />
              <Button size="sm" variant="secondary" onClick={addKeyword} className="h-7 px-2 text-[11px]">
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button (Optional when master save bar active) */}
      {!hideSaveButton && (
        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 text-xs font-bold bg-primary text-white"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Rules...' : 'Apply Sync Rules to Clinic PC'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
