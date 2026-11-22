'use client';

import React from 'react';
import { useLghPacsStatus } from '@/hooks/useLghPacsStatus';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw } from 'lucide-react';

interface LghPacsStatusBadgeProps {
  showHost?: boolean;
  className?: string;
}

export function LghPacsStatusBadge({ showHost = true, className }: LghPacsStatusBadgeProps) {
  const { isReachable, latencyMs, isProbing, host, port, recheck } = useLghPacsStatus();

  return (
    <button
      type="button"
      onClick={() => recheck()}
      title={
        isReachable
          ? `LGH PACS Active: ${host}:${port} (${latencyMs}ms). Click to re-probe.`
          : `LGH PACS Offsite: ${host}:${port} is unreachable. Connect to LGH Wi-Fi or hospital Ethernet to query live studies.`
      }
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors select-none ${
        isReachable
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted/60'
      } ${className || ''}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isProbing
            ? 'bg-sky-400 animate-ping'
            : isReachable
            ? 'bg-emerald-500 animate-pulse'
            : 'bg-slate-400'
        }`}
      />

      <span className="font-semibold">LGH PACS</span>

      {showHost && (
        <span className="font-mono text-[10px] opacity-75">
          {isReachable ? `${latencyMs}ms` : 'Offsite'}
        </span>
      )}

      {isProbing && <RefreshCw className="w-2.5 h-2.5 animate-spin ml-0.5 opacity-60" />}
    </button>
  );
}
