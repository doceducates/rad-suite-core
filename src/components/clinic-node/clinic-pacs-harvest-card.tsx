'use client';

import React, { useState, useEffect } from 'react';
import { Database, DownloadCloud, Clock, CheckCircle2, Save, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClinicHarvestSchedule, HarvestDateScope } from '@/services/clinic-node.types';

interface ClinicPacsHarvestCardProps {
  initialSchedule?: ClinicHarvestSchedule | null;
  onSaveSchedule?: (schedule: ClinicHarvestSchedule) => Promise<void>;
  onHarvestNow: (modalities: string[], scope?: string) => Promise<void>;
  onChange?: (schedule: ClinicHarvestSchedule) => void;
  hideSaveButton?: boolean;
  loading?: boolean;
}

const MODALITIES = [
  { code: 'MR', label: 'MRI', desc: 'Pre-cache all MRI sequences' },
  { code: 'CT', label: 'CT Scans', desc: 'Cross-sectional multi-slice' },
  { code: 'CR', label: 'X-Ray (CR/DX)', desc: 'Planar radiography' },
  { code: 'US', label: 'Ultrasound', desc: 'Sonography studies' },
];

export function ClinicPacsHarvestCard({
  initialSchedule,
  onSaveSchedule,
  onHarvestNow,
  onChange,
  hideSaveButton = false,
  loading = false,
}: ClinicPacsHarvestCardProps) {
  const [modalities, setModalities] = useState<string[]>(
    initialSchedule?.modalities && initialSchedule.modalities.length > 0
      ? initialSchedule.modalities
      : ['MR']
  );
  const [intervalMinutes, setIntervalMinutes] = useState<number>(
    initialSchedule?.intervalMinutes ?? 15
  );
  const [scope, setScope] = useState<HarvestDateScope>(
    initialSchedule?.scope || 'last_2_days'
  );
  const [bypassKeywords, setBypassKeywords] = useState<boolean>(
    initialSchedule?.bypassKeywords !== undefined ? initialSchedule.bypassKeywords : false
  );
  const [saving, setSaving] = useState(false);
  const [harvesting, setHarvesting] = useState(false);

  useEffect(() => {
    if (initialSchedule) {
      if (initialSchedule.modalities && initialSchedule.modalities.length > 0) {
        setModalities(initialSchedule.modalities);
      }
      if (initialSchedule.intervalMinutes !== undefined) {
        setIntervalMinutes(initialSchedule.intervalMinutes);
      }
      if (initialSchedule.scope) {
        setScope(initialSchedule.scope);
      }
      if (initialSchedule.bypassKeywords !== undefined) {
        setBypassKeywords(initialSchedule.bypassKeywords);
      }
    }
  }, [initialSchedule]);

  // Notify parent of state changes
  const notifyChange = (
    nextModalities: string[],
    nextInterval: number,
    nextScope: HarvestDateScope,
    nextBypass: boolean
  ) => {
    if (onChange) {
      onChange({
        enabled: nextInterval > 0,
        intervalMinutes: nextInterval,
        modalities: nextModalities,
        scope: nextScope,
        bypassKeywords: nextBypass,
      });
    }
  };

  const toggleModality = (code: string) => {
    setModalities((prev) => {
      const next = prev.includes(code)
        ? (prev.length > 1 ? prev.filter((m) => m !== code) : prev)
        : [...prev, code];
      notifyChange(next, intervalMinutes, scope, bypassKeywords);
      return next;
    });
  };

  const handleIntervalChange = (val: number) => {
    setIntervalMinutes(val);
    notifyChange(modalities, val, scope, bypassKeywords);
  };

  const handleScopeChange = (val: HarvestDateScope) => {
    setScope(val);
    notifyChange(modalities, intervalMinutes, val, bypassKeywords);
  };

  const handleBypassChange = (val: boolean) => {
    setBypassKeywords(val);
    notifyChange(modalities, intervalMinutes, scope, val);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveSchedule) return;
    setSaving(true);
    try {
      await onSaveSchedule({
        enabled: intervalMinutes > 0,
        intervalMinutes,
        modalities,
        scope,
        bypassKeywords,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManualHarvest = async () => {
    setHarvesting(true);
    try {
      await onHarvestNow(modalities, scope);
    } finally {
      setHarvesting(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Tier 1: Hospital PACS &rarr; Medical Sandbox Ingestion
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-mono">
                Hospital PACS (C-GET)
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Directly pre-cache completed scans from central PACS to local SSD (C:\MedicalSandbox) over Gigabit LAN
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualHarvest}
            disabled={harvesting || loading}
            className="gap-1.5 text-xs font-semibold border-teal-500/30 text-teal-600 hover:bg-teal-500/10 cursor-pointer"
          >
            <DownloadCloud className={`w-3.5 h-3.5 ${harvesting ? 'animate-spin' : ''}`} />
            <span>{harvesting ? 'Harvesting...' : `Harvest ${modalities.join('/')} Now`}</span>
          </Button>
        </div>
      </div>

      {/* Modality Chips */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Modalities to Pre-Cache in Sandbox
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODALITIES.map((opt) => {
            const active = modalities.includes(opt.code);
            return (
              <button
                type="button"
                key={opt.code}
                onClick={() => toggleModality(opt.code)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>{opt.code}</span>
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column: Download Mode & Polling Interval */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Ingestion Filter Mode */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sandbox Ingestion Filter</span>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={bypassKeywords}
              onChange={(e) => handleBypassChange(e.target.checked)}
              className="rounded border-border text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
            />
            <span>Download All Studies (Unfiltered)</span>
          </label>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {bypassKeywords
              ? 'Downloads every study of selected modalities into local SSD without keyword filtering.'
              : 'Selective keyword mode: Only downloads studies matching your configured keywords to keep port 8040 unchoked.'}
          </p>
        </div>

        {/* Polling Interval & Scope */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Polling Interval</span>
            <select
              value={intervalMinutes}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-border bg-background text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value={1}>Every 1 min (Rapid)</option>
              <option value={2}>Every 2 min</option>
              <option value={5}>Every 5 min</option>
              <option value={10}>Every 10 min (Standard)</option>
              <option value={15}>Every 15 min (Safe &amp; Recommended)</option>
              <option value={0}>Disabled (Manual only)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Date Scope</span>
            <select
              value={scope}
              onChange={(e) => handleScopeChange(e.target.value as HarvestDateScope)}
              className="px-2 py-1 rounded border border-border bg-background text-xs font-semibold text-foreground cursor-pointer"
            >
              <option value="today">Today Only</option>
              <option value="last_2_days">Last 2 Days (Today + Yesterday)</option>
              <option value="yesterday">Yesterday Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button (Optional when master save bar active) */}
      {!hideSaveButton && (
        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving Rules...' : 'Apply PACS Ingestion Rules to Clinic PC'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
