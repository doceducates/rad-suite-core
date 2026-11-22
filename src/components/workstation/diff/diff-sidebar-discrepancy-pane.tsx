'use client';

// Layer 4 (Presentation): Sidebar positive findings vs main report discrepancy pane
// Invariant: Target < 250 lines, max 350 lines.

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { SidebarDiscrepancy } from '@/lib/clinical-diff-engine';

interface DiffSidebarDiscrepancyPaneProps {
  discrepancies: SidebarDiscrepancy[];
}

export function DiffSidebarDiscrepancyPane({ discrepancies }: DiffSidebarDiscrepancyPaneProps) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-secondary flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        <span>Comparing positive findings in sidebar notes vs compiled main report findings and impression.</span>
      </div>
      <div className="space-y-2">
        {discrepancies.map((disc) => (
          <div key={disc.key} className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-on-surface">{disc.label}</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  disc.status === 'synced'
                    ? 'text-emerald-400 border-emerald-500/30'
                    : disc.status === 'conflict'
                    ? 'text-rose-400 border-rose-500/30'
                    : 'text-amber-400 border-amber-500/30'
                }`}
              >
                {disc.status === 'synced' ? 'Synced' : disc.status === 'conflict' ? 'Acuity Mismatch' : 'Not in Report'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-1.5 rounded bg-surface border border-outline-variant/20">
                <span className="text-[10px] text-secondary block font-semibold">Sidebar Finding:</span>
                <span>{disc.sidebarText || '—'}</span>
              </div>
              <div className="p-1.5 rounded bg-surface border border-outline-variant/20">
                <span className="text-[10px] text-secondary block font-semibold">Main Report:</span>
                <span>{disc.reportText || '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
