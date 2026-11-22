'use client';

import React, { useState, useEffect } from 'react';
import { Network, RotateCcw, ShieldCheck, Cpu, Save, Check, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { StallWatchdogConfig, PeerCooperationConfig } from '@/services/clinic-node.types';
import { ClinicWifiVault, type KnownWifiNetwork } from './clinic-wifi-vault';

interface ClinicClusterWatchdogCardProps {
  initialPeerCooperation?: PeerCooperationConfig | null;
  initialStallWatchdog?: StallWatchdogConfig | null;
  initialKnownNetworks?: KnownWifiNetwork[] | null;
  onSavePeerCooperation?: (config: PeerCooperationConfig) => Promise<void>;
  onSaveStallWatchdog?: (config: StallWatchdogConfig) => Promise<void>;
  onSaveKnownNetworks?: (networks: KnownWifiNetwork[]) => Promise<void>;
  onChange?: (
    peer: PeerCooperationConfig,
    watchdog: StallWatchdogConfig,
    networks: KnownWifiNetwork[]
  ) => void;
  hideSaveButton?: boolean;
  loading?: boolean;
}

export function ClinicClusterWatchdogCard({
  initialPeerCooperation,
  initialStallWatchdog,
  initialKnownNetworks,
  onSavePeerCooperation,
  onSaveStallWatchdog,
  onSaveKnownNetworks,
  onChange,
  hideSaveButton = false,
  loading = false,
}: ClinicClusterWatchdogCardProps) {
  const [peerEnabled, setPeerEnabled] = useState(initialPeerCooperation?.enabled ?? true);
  const [leaseTtlMinutes, setLeaseTtlMinutes] = useState(initialPeerCooperation?.leaseTtlMinutes ?? 5);
  const [peerMeshRelay, setPeerMeshRelay] = useState(initialPeerCooperation?.peerMeshRelay ?? true);
  const [autoFailover, setAutoFailover] = useState(initialPeerCooperation?.autoFailover ?? true);
  const [watchdogEnabled, setWatchdogEnabled] = useState(initialStallWatchdog?.enabled ?? true);
  const [softRestartMinutes, setSoftRestartMinutes] = useState(initialStallWatchdog?.softRestartMinutes ?? 20);
  const [autoRebootMinutes, setAutoRebootMinutes] = useState(initialStallWatchdog?.autoRebootMinutes ?? 40);
  const [maxRebootsPerDay, setMaxRebootsPerDay] = useState(initialStallWatchdog?.maxRebootsPerDay ?? 2);
  const [networkWatchdogEnabled, setNetworkWatchdogEnabled] = useState(initialStallWatchdog?.networkWatchdogEnabled ?? true);
  const [wifiGraceMinutes, setWifiGraceMinutes] = useState(initialStallWatchdog?.wifiGraceMinutes ?? 45);
  const [wifiCooldownMinutes, setWifiCooldownMinutes] = useState(initialStallWatchdog?.wifiCooldownMinutes ?? 60);
  const [offlineRebootMinutes, setOfflineRebootMinutes] = useState(initialStallWatchdog?.offlineRebootMinutes ?? 180);
  const [knownNetworks, setKnownNetworks] = useState<KnownWifiNetwork[]>(initialKnownNetworks || []);

  useEffect(() => {
    if (initialKnownNetworks) setKnownNetworks(initialKnownNetworks);
  }, [initialKnownNetworks]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  type PolicyOverrides = Partial<{
    peerEnabled: boolean; leaseTtlMinutes: number; peerMeshRelay: boolean; autoFailover: boolean;
    watchdogEnabled: boolean; softRestartMinutes: number; autoRebootMinutes: number;
    maxRebootsPerDay: number; networkWatchdogEnabled: boolean; wifiGraceMinutes: number;
    wifiCooldownMinutes: number; offlineRebootMinutes: number; knownNetworks: KnownWifiNetwork[];
  }>;

  const notify = (overrides?: PolicyOverrides) => {
    const o = overrides || {};
    onChange?.(
      {
        enabled: o.peerEnabled ?? peerEnabled,
        leaseTtlMinutes: o.leaseTtlMinutes ?? leaseTtlMinutes,
        peerMeshRelay: o.peerMeshRelay ?? peerMeshRelay,
        autoFailover: o.autoFailover ?? autoFailover,
      },
      {
        enabled: o.watchdogEnabled ?? watchdogEnabled,
        softRestartMinutes: o.softRestartMinutes ?? softRestartMinutes,
        autoRebootMinutes: o.autoRebootMinutes ?? autoRebootMinutes,
        maxRebootsPerDay: o.maxRebootsPerDay ?? maxRebootsPerDay,
        requireNetworkProbe: true,
        networkWatchdogEnabled: o.networkWatchdogEnabled ?? networkWatchdogEnabled,
        wifiGraceMinutes: o.wifiGraceMinutes ?? wifiGraceMinutes,
        wifiCooldownMinutes: o.wifiCooldownMinutes ?? wifiCooldownMinutes,
        offlineRebootMinutes: o.offlineRebootMinutes ?? offlineRebootMinutes,
      },
      o.knownNetworks ?? knownNetworks
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      if (onSavePeerCooperation) await onSavePeerCooperation({ enabled: peerEnabled, leaseTtlMinutes, peerMeshRelay, autoFailover });
      if (onSaveStallWatchdog) {
        await onSaveStallWatchdog({
          enabled: watchdogEnabled, softRestartMinutes, autoRebootMinutes, maxRebootsPerDay,
          requireNetworkProbe: true, networkWatchdogEnabled, wifiGraceMinutes,
          wifiCooldownMinutes, offlineRebootMinutes,
        });
      }
      if (onSaveKnownNetworks) {
        await onSaveKnownNetworks(knownNetworks);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card shadow-xs">
      <CardHeader className="bg-muted/20 border-b border-border/50 py-3.5 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Cluster Load Sharing &amp; Service Self-Healing</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Cooperative multi-PC deduplication and silent service auto-recovery in Session 0</CardDescription>
          </div>
        </div>
        {!hideSaveButton && (
          <Button size="sm" onClick={handleSave} disabled={saving || loading} className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 h-8 cursor-pointer">
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : savedSuccess ? 'Saved' : 'Save Policies'}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Section 1: Peer Node Load Sharing */}
        <div className="space-y-2.5 p-3.5 rounded-xl border border-border/60 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">LAN Peer Cooperative Load Sharing</span>
              <Badge variant="outline" className={peerEnabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}>
                {peerEnabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={peerEnabled} onChange={(e) => { setPeerEnabled(e.target.checked); notify({ peerEnabled: e.target.checked }); }} className="sr-only peer" />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            When multiple PCs run the clinic agent on the same network, each PC claims in-flight studies in the central lease registry to prevent duplicate uploads.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground block">Study Lease TTL (Minutes)</label>
              <input
                type="number" min={1} max={30} value={leaseTtlMinutes}
                onChange={(e) => { const v = Math.max(1, parseInt(e.target.value) || 5); setLeaseTtlMinutes(v); notify({ leaseTtlMinutes: v }); }}
                disabled={!peerEnabled}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground">Expires dead leases if a peer disconnects</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">LAN Peer Mesh Upload Relay</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={peerMeshRelay}
                    onChange={(e) => { setPeerMeshRelay(e.target.checked); notify({ peerMeshRelay: e.target.checked }); }}
                    disabled={!peerEnabled}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">Secondary PC streams cases from Primary over Gigabit LAN (Port 18042) to double VPS upload speed</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">Automatic Primary Failover</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFailover}
                    onChange={(e) => { setAutoFailover(e.target.checked); notify({ autoFailover: e.target.checked }); }}
                    disabled={!peerEnabled}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">Promotes secondary PC to Primary Harvester if primary node misses heartbeats for &gt; 2.5 minutes</p>
            </div>
          </div>
        </div>

        {/* Section 2: Upload Pipeline Stall Watchdog */}
        <div className="space-y-2.5 p-3.5 rounded-xl border border-border/60 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-foreground">Pipeline Stall Watchdog &amp; Service Auto-Restart</span>
              <Badge variant="outline" className={watchdogEnabled ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'text-muted-foreground'}>
                {watchdogEnabled ? 'Guarded' : 'Off'}
              </Badge>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={watchdogEnabled} onChange={(e) => { setWatchdogEnabled(e.target.checked); notify({ watchdogEnabled: e.target.checked }); }} className="sr-only peer" />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground block">Soft Restart Threshold (Minutes)</label>
              <input
                type="number" min={5} max={60} value={softRestartMinutes}
                onChange={(e) => { const v = Math.max(5, parseInt(e.target.value) || 20); setSoftRestartMinutes(v); notify({ softRestartMinutes: v }); }}
                disabled={!watchdogEnabled}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground">Silently restarts Orthanc &amp; Edge Agent in Session 0</span>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground block">Remediation Policy</label>
              <div className="p-2 rounded-lg bg-background border border-border text-[11px] text-muted-foreground">
                Zero OS Popups: Never interrupts active reporting doctors.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background border border-border/70 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Shared Workstation Protection: Automated OS reboots are permanently disabled. All recoveries recycle background services without screen popups or logout prompts.</span>
          </div>
        </div>

        {/* Section 3: Wi-Fi Self-Healing Watchdog */}
        <div className="space-y-2.5 p-3.5 rounded-xl border border-border/60 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-sky-500" />
              <span className="font-bold text-foreground">Stepwise Wi-Fi &amp; Network Watchdog</span>
              <Badge variant="outline" className={networkWatchdogEnabled ? 'bg-sky-500/10 text-sky-500 border-sky-500/30' : 'text-muted-foreground'}>
                {networkWatchdogEnabled ? 'Guarded' : 'Off'}
              </Badge>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={networkWatchdogEnabled} onChange={(e) => { setNetworkWatchdogEnabled(e.target.checked); notify({ networkWatchdogEnabled: e.target.checked }); }} className="sr-only peer" />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground block">Disconnect Grace Period (Minutes)</label>
              <input
                type="number" min={15} max={120} value={wifiGraceMinutes}
                onChange={(e) => { const v = Math.max(15, parseInt(e.target.value) || 45); setWifiGraceMinutes(v); notify({ wifiGraceMinutes: v }); }}
                disabled={!networkWatchdogEnabled}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground">Observation window before attempting Wi-Fi self-heal</span>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground block">Remediation Cooldown (Minutes)</label>
              <input
                type="number" min={30} max={180} value={wifiCooldownMinutes}
                onChange={(e) => { const v = Math.max(30, parseInt(e.target.value) || 60); setWifiCooldownMinutes(v); notify({ wifiCooldownMinutes: v }); }}
                disabled={!networkWatchdogEnabled}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground">Minimum interval between Wi-Fi profile reconnects</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-background border border-border/70 text-[11px] text-muted-foreground space-y-0.5">
            <span className="font-semibold text-foreground">Safe Remediation:</span> Automatically re-associates with configured clinic Wi-Fi profiles without disrupting the workstation.
          </div>

          {/* Wi-Fi Known Profiles Vault */}
          <ClinicWifiVault
            networks={knownNetworks}
            onChange={(nets) => {
              setKnownNetworks(nets);
              notify({ knownNetworks: nets });
            }}
            disabled={!networkWatchdogEnabled || loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
