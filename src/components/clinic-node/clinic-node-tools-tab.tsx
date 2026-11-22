'use client';

import React from 'react';
import Link from 'next/link';
import { HardDrive, ArrowRight, Wrench, Terminal, Activity, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClinicDiagnosticsCard } from '@/components/clinic-node/clinic-diagnostics-card';
import { ClinicRemoteTerminalCard } from '@/components/clinic-node/clinic-remote-terminal-card';
import { ClinicSetupGuideCard } from '@/components/clinic-node/clinic-setup-guide-card';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';

interface ClinicNodeToolsTabProps {
  telemetry: ClinicNodeTelemetry;
  selectedNodeId: string;
  loading: boolean;
  onAction: (action: ClinicActionType, payload?: any) => Promise<void>;
}

export function ClinicNodeToolsTab({
  telemetry,
  selectedNodeId,
  loading,
  onAction,
}: ClinicNodeToolsTabProps) {
  return (
    <div className="space-y-5 text-xs font-sans">
      {/* PACS Harvester Dedicated Workspace Banner */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Dedicated Hospital PACS Harvester &amp; Workstation</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct hospital PACS C-FIND/C-GET search (Hospital PACS Archive), 48-hour database indexing, on-demand streaming, and bulk S3 cloud synchronization are available in the dedicated workspace.
            </p>
          </div>
        </div>
        <Link href="/pacs">
          <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
            <span>Open Hospital PACS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Remote Command Terminal & OTA Script Manager */}
      <ClinicRemoteTerminalCard
        lastOutput={telemetry.lastCommandOutput}
        onExecute={(command) => onAction('exec', { command })}
        onUpdateScript={() => onAction('update-script')}
        onUninstallAgent={() => onAction('uninstall-agent')}
        onGetLogs={(options) => onAction('get-logs', options || { lines: 150 })}
        onPruneLogs={() => onAction('prune-logs')}
        online={telemetry.online}
      />

      {/* Network & Infrastructure Diagnostics Probes */}
      <ClinicDiagnosticsCard />

      {/* Clinic Setup & Live Diagnostic Wizard */}
      <ClinicSetupGuideCard
        telemetry={telemetry}
        onRunDiagnostics={() => onAction('run-diagnostics')}
        loading={loading}
      />
    </div>
  );
}
