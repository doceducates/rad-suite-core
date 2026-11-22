'use client';

import React from 'react';
import { Activity, Radio, HardDrive, Cpu, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ClinicPowerCard } from '@/components/clinic-node/clinic-power-card';
import { ClinicDiskCard } from '@/components/clinic-node/clinic-disk-card';
import { ClinicTrackerCard } from '@/components/clinic-node/clinic-tracker-card';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';

interface ClinicNodeOverviewTabProps {
  telemetry: ClinicNodeTelemetry;
  nodes: ClinicNodeTelemetry[];
  selectedNodeId: string;
  loading: boolean;
  onRefresh: () => void;
  onAction: (action: ClinicActionType, payload?: any) => Promise<void>;
}

export function ClinicNodeOverviewTab({
  telemetry,
  nodes,
  selectedNodeId,
  loading,
  onRefresh,
  onAction,
}: ClinicNodeOverviewTabProps) {
  const onlineCount = nodes.filter((n) => n.online).length;
  const isClusterActive = nodes.length > 1;
  const peerCoopEnabled = telemetry.peerCooperation?.enabled ?? true;
  const stallWatchdogEnabled = telemetry.stallWatchdog?.enabled ?? true;

  return (
    <div className="space-y-5 text-xs font-sans">
      {/* Cluster Health & Policy Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Node State */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${telemetry.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <Radio className={`w-4 h-4 ${telemetry.online ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Active Node State</div>
              <div className="font-bold text-sm text-foreground flex items-center gap-1.5 mt-0.5">
                <span className="truncate max-w-[150px]">{telemetry.name || telemetry.nodeId}</span>
                <span className={`w-2 h-2 rounded-full ${telemetry.online ? 'bg-emerald-500 shadow-xs' : 'bg-rose-500'}`} />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="truncate max-w-[110px]">ID: {telemetry.nodeId}</span>
                {telemetry.hostname && <span className="shrink-0">• 🖥️ {telemetry.hostname}</span>}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] uppercase font-mono ${telemetry.online ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'}`}>
            {telemetry.online ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Card 2: LAN Peer Cluster Mode */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${peerCoopEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Peer Cooperation</div>
              <div className="font-bold text-sm text-foreground mt-0.5">
                {isClusterActive ? `${onlineCount}/${nodes.length} Nodes Online` : 'Single Node'}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] font-mono ${peerCoopEnabled ? 'border-primary/30 text-primary bg-primary/5' : 'text-muted-foreground'}`}>
            {peerCoopEnabled ? 'Load Sharing ON' : 'Isolated'}
          </Badge>
        </div>

        {/* Card 3: Stall Watchdog Status */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${stallWatchdogEnabled ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Self-Healing Watchdog</div>
              <div className="font-bold text-sm text-foreground mt-0.5">
                {stallWatchdogEnabled ? `${telemetry.stallWatchdog?.softRestartMinutes ?? 20}m Auto-Restart` : 'Disabled'}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] font-mono ${stallWatchdogEnabled ? 'border-amber-500/30 text-amber-500 bg-amber-500/5' : 'text-muted-foreground'}`}>
            {stallWatchdogEnabled ? 'Guarded' : 'Unmanaged'}
          </Badge>
        </div>
      </div>

      {/* Row: Power & Engine Control + Hard Drive Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ClinicPowerCard
          telemetry={telemetry}
          onRefresh={onRefresh}
          onAction={(act) => onAction(act as ClinicActionType)}
          loading={loading}
        />
        <ClinicDiskCard
          disk={telemetry.disk}
          autoRetention={telemetry.autoRetention}
          onClearCache={() => onAction('clear-cache')}
          onSaveCap={(gb) => onAction('set-disk-cap', { gb })}
          onSaveAutoRetention={(enabled, ageDays) => onAction('set-auto-retention', { enabled, ageDays })}
          onPurgeSynced={(days) => onAction('purge-synced-older-than', { days })}
        />
      </div>

      {/* Live Two-Stage PACS & Cloud Upload Tracker */}
      <ClinicTrackerCard telemetry={telemetry} />
    </div>
  );
}
