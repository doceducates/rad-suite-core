'use client';

import React, { useState } from 'react';
import { Settings2, Save, Check, Clock, Filter, Calendar, ShieldCheck } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import type { HarvestDateScope } from '@/services/clinic-node.types';

interface PacsHarvestConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const ALL_MODALITIES = ['MR', 'CT', 'XR', 'CR', 'US', 'XA'];

export function PacsHarvestConfigModal({
  isOpen,
  onClose,
  onSaved,
}: PacsHarvestConfigModalProps) {
  const [modalities, setModalities] = useState<string[]>(['MR']);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [scope, setScope] = useState<HarvestDateScope>('last_2_days');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bypassKeywords, setBypassKeywords] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const toggleModality = (m: string) => {
    setModalities((prev) =>
      prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const normalizedCustomDate = customDate.replace(/-/g, '');
      // 1. Update Harvest Schedule
      const schedRes = await fetch('/api/clinic-node', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-harvest-schedule',
          payload: {
            enabled: intervalMinutes > 0,
            intervalMinutes,
            modalities,
            scope,
            customDate: scope === 'custom' ? normalizedCustomDate : undefined,
            bypassKeywords,
          },
        }),
      });
      if (!schedRes.ok) throw new Error('Failed saving harvest schedule');

      notify.success('Hospital PACS harvesting rules saved. Clinic PC will poll PACS using single-date × single-modality queries.');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      notify.error(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Settings2 className="w-4 h-4" />
        </div>
        <div>
          <ModalTitle>Hospital PACS Harvester &amp; Sync Rules</ModalTitle>
          <ModalDescription>
            Single-Date × Single-Modality C-FIND polling with Double-Tap Warm-Up verification.
          </ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4 py-4 text-xs">
        {/* Modalities Selection */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground flex items-center justify-between">
            <span>Harvest Modalities</span>
            <span className="text-[11px] text-muted-foreground font-normal">Queried sequentially (1 modality per C-FIND)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ALL_MODALITIES.map((mod) => {
              const selected = modalities.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModality(mod)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                      : 'border-border bg-card text-muted-foreground hover:bg-surface-container'
                  }`}
                >
                  <span>{mod}</span>
                  {selected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Date Scope */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground flex items-center justify-between">
            <span>Calendar Date Scope</span>
            <span className="text-[11px] text-muted-foreground font-normal">Queried 1 date at a time (YYYYMMDD)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope('last_2_days')}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer text-left transition-all ${
                scope === 'last_2_days'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-surface-container'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Last 2 Days</div>
                <div className="text-[10px] text-muted-foreground">Today + Yesterday (Recommended)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('today')}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer text-left transition-all ${
                scope === 'today'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-surface-container'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Today Only</div>
                <div className="text-[10px] text-muted-foreground">Current calendar day</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('yesterday')}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer text-left transition-all ${
                scope === 'yesterday'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-surface-container'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Yesterday Only</div>
                <div className="text-[10px] text-muted-foreground">Previous calendar day</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('custom')}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer text-left transition-all ${
                scope === 'custom'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-surface-container'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold">Custom Date</div>
                <div className="text-[10px] text-muted-foreground">Specific calendar date</div>
              </div>
            </button>
          </div>

          {scope === 'custom' && (
            <div className="pt-1">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-mono"
              />
            </div>
          )}
        </div>

        {/* Harvest Frequency */}
        <div className="space-y-1.5">
          <label className="font-semibold text-foreground flex items-center justify-between">
            <span>Auto-Harvest Polling Interval [X]</span>
            <span className="text-[11px] text-muted-foreground font-normal">How often Clinic PC polls PACS</span>
          </label>
          <select
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
          >
            <option value={1}>Every 1 minute (Ultra-fast continuous)</option>
            <option value={2}>Every 2 minutes (Rapid polling)</option>
            <option value={5}>Every 5 minutes (Recommended real-time)</option>
            <option value={10}>Every 10 minutes</option>
            <option value={15}>Every 15 minutes (Standard)</option>
            <option value={30}>Every 30 minutes</option>
            <option value={60}>Every 1 hour</option>
            <option value={0}>Disabled (Manual on-demand only)</option>
          </select>
        </div>

        {/* Multi-Tap Warm-Up Info Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Multi-Tap PACS Warm-Up &amp; LAN Pre-Cache:</span>{' '}
            Issues Pass 1 to wake the PACS daemon, Pass 2 to capture studies, and Pass 3 confirmation if studies are still streaming. Downloads all Today + Yesterday scans directly into local SSD to prevent rush-hour delays.
          </div>
        </div>

        {/* Keyword Filter Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-surface-container/50">
          <div className="space-y-0.5 pr-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Ingest All Studies (No Keyword Filter)</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {bypassKeywords
                ? 'Harvests all matching studies regardless of anatomical description keywords.'
                : 'Only harvests studies containing brain, spine, lumbar, cervical keywords.'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={bypassKeywords}
            onChange={(e) => setBypassKeywords(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
          />
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'Saving...' : 'Apply & Sync to Clinic PC'}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
