'use client';

import React, { useState } from 'react';
import { Database, DownloadCloud, Settings2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';

interface PacsSandboxQuickBannerProps {
  onOpenConfig: () => void;
  onRefreshTable: () => Promise<void>;
  totalStudiesInSandbox?: number;
}

export function PacsSandboxQuickBanner({
  onOpenConfig,
  onRefreshTable,
  totalStudiesInSandbox,
}: PacsSandboxQuickBannerProps) {
  const [isPrefetching, setIsPrefetching] = useState(false);

  const handlePrefetch = async () => {
    setIsPrefetching(true);
    notify.info('Triggered Multi-Tap Pre-fetch for Today & Yesterday cases into Medical Sandbox...');
    try {
      const res = await fetch('/api/pacs/hospital-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'last_2_days',
          modality: 'MR',
          bypassKeywords: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('C-GET Pre-fetch active on Clinic PC. Cases are being stored directly in local SSD.');
        await onRefreshTable();
      } else {
        throw new Error(data.error || 'Failed triggering harvest');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error triggering Medical Sandbox pre-fetch');
    } finally {
      setIsPrefetching(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-teal-500/25 bg-teal-500/5 text-xs font-sans">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Medical Sandbox Pre-Cache</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>5m Auto-Poll Active</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Today + Yesterday scans are pre-fetched directly into local SSD (Orthanc) for zero retrieval latency during rush hours.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrefetch}
          disabled={isPrefetching}
          className="gap-1.5 text-xs font-semibold border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer h-8"
          title="Pre-fetch all today and yesterday MRI scans directly from PACS to local SSD"
        >
          <DownloadCloud className={`w-3.5 h-3.5 ${isPrefetching ? 'animate-spin' : ''}`} />
          <span>{isPrefetching ? 'Pre-fetching...' : 'Pre-fetch Today & Yesterday'}</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenConfig}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer h-8"
          title="Configure automated harvest schedule and modalities"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Harvest Rules</span>
        </Button>
      </div>
    </div>
  );
}
