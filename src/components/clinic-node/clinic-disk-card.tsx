'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, Trash2, ShieldCheck, Save, Sparkles, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClinicDiskMetrics } from '@/services/clinic-node.service';

interface ClinicDiskCardProps {
  disk: ClinicDiskMetrics;
  autoRetention?: { enabled: boolean; ageDays: number };
  onClearCache: () => Promise<void>;
  onSaveCap: (gb: number) => Promise<void>;
  onSaveAutoRetention: (enabled: boolean, ageDays: number) => Promise<void>;
  onPurgeSynced: (days: number) => Promise<void>;
}

export function ClinicDiskCard({
  disk,
  autoRetention = { enabled: false, ageDays: 3 },
  onClearCache,
  onSaveCap,
  onSaveAutoRetention,
  onPurgeSynced,
}: ClinicDiskCardProps) {
  const [clearing, setClearing] = useState(false);
  const [savingCap, setSavingCap] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);
  const [purgingSynced, setPurgingSynced] = useState(false);

  const [storageThreshold, setStorageThreshold] = useState<string>(
    String(disk.maxStorageSizeGb ?? 100)
  );

  const [retentionEnabled, setRetentionEnabled] = useState<boolean>(
    Boolean(autoRetention.enabled)
  );
  const [retentionDays, setRetentionDays] = useState<number>(
    autoRetention.ageDays ?? 3
  );

  // Sync state when telemetry updates from server
  useEffect(() => {
    if (disk.maxStorageSizeGb !== undefined) {
      setStorageThreshold(String(disk.maxStorageSizeGb));
    }
  }, [disk.maxStorageSizeGb]);

  useEffect(() => {
    if (autoRetention) {
      setRetentionEnabled(Boolean(autoRetention.enabled));
      setRetentionDays(autoRetention.ageDays ?? 3);
    }
  }, [autoRetention?.enabled, autoRetention?.ageDays]);

  const handleSaveDiskCap = async () => {
    const val = Number(storageThreshold);
    if (isNaN(val) || val < 10) return;
    setSavingCap(true);
    try {
      await onSaveCap(val);
    } finally {
      setSavingCap(false);
    }
  };

  const handleToggleRetention = async (newEnabled: boolean, newDays = retentionDays) => {
    setRetentionEnabled(newEnabled);
    setRetentionDays(newDays);
    setSavingRetention(true);
    try {
      await onSaveAutoRetention(newEnabled, newDays);
    } finally {
      setSavingRetention(false);
    }
  };

  const handleManualPurge = async (days: number) => {
    setPurgingSynced(true);
    try {
      await onPurgeSynced(days);
    } finally {
      setPurgingSynced(false);
    }
  };

  const isWarning = disk.usedPercent > 80;

  return (
    <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm space-y-4 text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className={`w-4 h-4 ${isWarning ? 'text-amber-500' : 'text-primary'}`} />
          <h3 className="font-bold text-sm text-foreground">Hard Drive Protection &amp; Retention Console</h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
            isWarning ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'
          }`}
        >
          {disk.usedPercent}% Allocated
        </span>
      </div>

      {/* Disk Space Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isWarning ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${disk.usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
          <span>Used: {disk.usedGb} GB</span>
          <span>Free: {disk.freeGb} GB</span>
          <span>Cap: {disk.maxStorageSizeGb || 100} GB (of {disk.totalGb} GB disk)</span>
        </div>
      </div>

      {/* FIFO Storage Limit Controls */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">Orthanc FIFO Cap (MaxStorageSize):</span>
          <div className="flex items-center gap-1.5 font-mono">
            <input
              type="number"
              min="10"
              max="2000"
              value={storageThreshold}
              onChange={(e) => setStorageThreshold(e.target.value)}
              className="w-16 px-2 py-1 rounded border border-border bg-background text-xs text-right font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <span className="text-muted-foreground text-xs font-sans">GB</span>
            <Button
              size="sm"
              variant="outline"
              disabled={savingCap}
              onClick={handleSaveDiskCap}
              className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
              title="Persist disk capacity ceiling to Clinic PC agent-config.json"
            >
              <Save className="w-3 h-3" />
              <span>{savingCap ? 'Saving...' : 'Save Cap'}</span>
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          When this ceiling is reached, local cached slices are automatically purged while permanent backups remain intact in Cloud S3.
        </p>
      </div>

      {/* Configurable Auto-Retention Reaper */}
      <div className="p-3 rounded-xl bg-surface-container/50 border border-border/50 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-foreground font-semibold">
            <input
              type="checkbox"
              checked={retentionEnabled}
              disabled={savingRetention}
              onChange={(e) => handleToggleRetention(e.target.checked, retentionDays)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            <span>Auto-Retention Reaper (Optional)</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Purge after:</span>
            <select
              value={retentionDays}
              disabled={!retentionEnabled || savingRetention}
              onChange={(e) => handleToggleRetention(retentionEnabled, Number(e.target.value))}
              className="px-2 py-0.5 rounded border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none font-medium cursor-pointer disabled:opacity-50"
            >
              <option value="0">Immediately once synced</option>
              <option value="1">1 Day</option>
              <option value="2">2 Days</option>
              <option value="3">3 Days</option>
              <option value="5">5 Days (Recommended)</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Double-Protection: Purges local cache older than {retentionDays} days or when {disk.maxStorageSizeGb || 100} GB FIFO limit is reached. Original records remain permanently on Hospital PACS.
        </p>
      </div>

      {/* 1-Click Manual Cleanup & Purge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local Protection Guard Active</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={purgingSynced}
            onClick={() => handleManualPurge(retentionDays || 5)}
            className="h-7 px-2 text-xs gap-1 border-border hover:bg-surface-container"
            title={`Clean local studies older than ${retentionDays || 5} days`}
          >
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>{purgingSynced ? 'Purging...' : `Purge >${retentionDays || 5}d`}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={purgingSynced}
            onClick={() => handleManualPurge(0)}
            className="h-7 px-2 text-xs gap-1 border-border hover:bg-surface-container"
            title="Clean all local studies that are confirmed safely synced to S3"
          >
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Purge All Synced</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={clearing}
            onClick={async () => {
              setClearing(true);
              try { await onClearCache(); } finally { setClearing(false); }
            }}
            className="h-7 px-2 text-xs gap-1 text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
            title="Force immediate cache sweep of all studies"
          >
            <Trash2 className="w-3 h-3" />
            <span>{clearing ? 'Sweeping...' : 'Force Cache Clear'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
