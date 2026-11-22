'use client';

import React, { useState } from 'react';
import { Activity, Power, RefreshCw, RotateCcw, AlertTriangle, ShieldCheck, PowerOff, Trash2, Pause, Play, Network, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { ClinicNetworkPolicyModal } from '@/components/clinic-node/clinic-network-policy-modal';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';

interface ClinicPowerCardProps {
  telemetry: ClinicNodeTelemetry;
  onRefresh: () => void;
  onAction: (action: ClinicActionType | any, payload?: any) => Promise<void>;
  loading: boolean;
}

export function ClinicPowerCard({ telemetry, onRefresh, onAction, loading }: ClinicPowerCardProps) {
  const [acting, setActing] = useState<string | null>(null);
  const [rebootModalOpen, setRebootModalOpen] = useState(false);
  const [uninstallModalOpen, setUninstallModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);

  const handleAction = async (action: ClinicActionType | any, payload?: any) => {
    setActing(action);
    try {
      await onAction(action, payload);
    } finally {
      setActing(null);
    }
  };

  const isRunning = telemetry.orthancStatus === 'running';

  return (
    <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${telemetry.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
              Clinic Host Engine
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full uppercase font-bold ${
                telemetry.online ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                {telemetry.online ? 'Agent Online' : 'Agent Offline'}
              </span>
              {telemetry.syncPaused && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full uppercase font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Sync Paused
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">Session 0 Background Daemon • DICOM Port 11115 (RadiAnt Safe)</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Air-Gap / Wi-Fi Isolation Active Alert Banner */}
      {telemetry.wifiIsolation?.active && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Pure Ethernet Air-Gap Active:</strong> Wi-Fi disabled & sync paused (~{telemetry.wifiIsolation.remainingMinutes}m remaining).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={acting !== null}
            onClick={() => handleAction('restore-wifi')}
            className="h-6 text-[11px] px-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer shrink-0 font-semibold"
          >
            Restore Wi-Fi Now
          </Button>
        </div>
      )}

      {/* Engine Status Grid */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Orthanc PACS Service</span>
          <span className={`font-mono font-bold text-sm ${isRunning ? 'text-emerald-500' : 'text-amber-500'}`}>
            {telemetry.orthancStatus.toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Hospital PACS Target</span>
            <button
              type="button"
              disabled={acting === 'ping-pacs'}
              onClick={() => handleAction('ping-pacs')}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
              title="Ping Hospital PACS over Ethernet"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${acting === 'ping-pacs' ? 'animate-spin' : ''}`} />
              {acting === 'ping-pacs' ? 'Testing...' : 'Ping Link'}
            </button>
          </div>
          <span className="font-mono text-xs text-foreground font-semibold block">Hospital PACS (C-GET)</span>
          {telemetry.pacsStatus && (
            <div className={`text-[10px] font-mono mt-1 ${telemetry.pacsStatus.connected ? 'text-emerald-500 font-semibold' : 'text-rose-500'}`}>
              {telemetry.pacsStatus.connected
                ? `● Online (${telemetry.pacsStatus.latencyMs}ms • ${telemetry.pacsStatus.message || 'Ready'})`
                : `● Offline (${telemetry.pacsStatus.message || 'Unreachable'})`}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          size="sm"
          disabled={acting !== null || isRunning}
          onClick={() => handleAction('start')}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          <Power className="w-3.5 h-3.5" />
          <span>{acting === 'start' ? 'Starting...' : 'Start Engine'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null || !isRunning}
          onClick={() => handleAction('stop')}
          className="gap-1.5 text-xs text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
        >
          <Power className="w-3.5 h-3.5" />
          <span>{acting === 'stop' ? 'Stopping...' : 'Stop Engine'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null}
          onClick={() => handleAction('restart')}
          className="gap-1.5 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{acting === 'restart' ? 'Restarting...' : 'Restart Engine'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null}
          onClick={() => handleAction(telemetry.syncPaused ? 'resume-sync' : 'pause-sync')}
          className={`gap-1.5 text-xs font-bold transition-all ${
            telemetry.syncPaused
              ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs'
              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/40'
          }`}
          title={telemetry.syncPaused ? 'Resume automated PACS harvest and S3 background sync' : 'Instantly pause automated PACS harvest and S3 background sync'}
        >
          {telemetry.syncPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{acting === 'pause-sync' ? 'Pausing...' : acting === 'resume-sync' ? 'Resuming...' : telemetry.syncPaused ? 'Resume Sync' : 'Pause Sync'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null}
          onClick={() => setNetworkModalOpen(true)}
          className={`gap-1.5 text-xs font-semibold cursor-pointer ${
            telemetry.wifiIsolation?.active
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
              : ''
          }`}
          title="Configure Dual-NIC traffic routing and timed Wi-Fi isolation"
        >
          {telemetry.wifiIsolation?.active ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Network className="w-3.5 h-3.5 text-primary" />}
          <span>{telemetry.wifiIsolation?.active ? `Air-Gap (${telemetry.wifiIsolation.remainingMinutes}m)` : 'Network Routing'}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null}
          onClick={() => setRebootModalOpen(true)}
          className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
          title="Force reboot the clinic host computer"
        >
          <PowerOff className="w-3.5 h-3.5" />
          <span>Reboot PC</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={acting !== null}
          onClick={() => setUninstallModalOpen(true)}
          className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
          title="Stop and uninstall edge agent and all background services from the machine"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Uninstall Agent</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={acting !== null}
          onClick={() => handleAction('revert-config')}
          className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 ml-auto"
          title="Revert modified orthanc.json to baseline backup"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Revert to Baseline</span>
        </Button>
      </div>

      {/* Reboot PC Confirmation Modal */}
      <Modal isOpen={rebootModalOpen} onClose={() => setRebootModalOpen(false)} size="sm">
        <ModalHeader onClose={() => setRebootModalOpen(false)}>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <PowerOff className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Reboot Clinic PC</ModalTitle>
            <ModalDescription>Remote Hardware Restart</ModalDescription>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              Are you sure you want to reboot the physical host computer for{' '}
              <strong className="text-foreground font-mono">{telemetry.nodeId || 'clinic-pc-primary'}</strong>?
            </p>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-1">
              <p className="font-semibold text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Temporary Node Downtime (1–2 minutes)
              </p>
              <p className="text-[10px] leading-relaxed">
                The operating system will issue a forced restart. All background Session 0 daemons (Orthanc, RadSuiteEdgeAgent, Watchdog) will start automatically upon Windows boot.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRebootModalOpen(false)}
            disabled={acting === 'reboot'}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={acting === 'reboot'}
            onClick={async () => {
              await handleAction('reboot');
              setRebootModalOpen(false);
            }}
            className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>{acting === 'reboot' ? 'Dispatching...' : 'Confirm Reboot'}</span>
          </Button>
        </ModalFooter>
      </Modal>

      {/* Uninstall Agent Confirmation Modal */}
      <Modal isOpen={uninstallModalOpen} onClose={() => setUninstallModalOpen(false)} size="md">
        <ModalHeader onClose={() => setUninstallModalOpen(false)}>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Uninstall Clinic Edge Agent</ModalTitle>
            <ModalDescription>Remote Service Teardown & Decommission</ModalDescription>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              Are you sure you want to stop and completely uninstall the edge agent from{' '}
              <strong className="text-foreground font-mono">{telemetry.name || telemetry.nodeId}</strong>?
            </p>
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2">
              <p className="font-semibold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Destructive Remote Teardown Operation
              </p>
              <ul className="text-[11px] space-y-1 list-disc list-inside leading-relaxed text-foreground/80 dark:text-foreground/90">
                <li>Stops &amp; deletes Windows Services (<code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuiteEdgeAgent</code> &amp; <code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuiteWatchdog</code>)</li>
                <li>Stops &amp; removes the <code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">Orthanc</code> PACS engine service</li>
                <li>Deletes the immortal scheduled task (<code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuite_Immortal_Lifeline</code>)</li>
                <li>Removes inbound DICOM firewall rules (Port 11115)</li>
                <li>Terminates background PACS harvesting and WAN sync</li>
              </ul>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Once uninstalled, the agent on this PC will terminate and go offline permanently.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUninstallModalOpen(false)}
            disabled={acting === 'uninstall-agent'}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={acting === 'uninstall-agent'}
            onClick={async () => {
              await handleAction('uninstall-agent');
              setUninstallModalOpen(false);
            }}
            className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{acting === 'uninstall-agent' ? 'Teardown Dispatched...' : 'Confirm & Uninstall Agent'}</span>
          </Button>
        </ModalFooter>
      </Modal>

      {/* Network Policy & Wi-Fi Air-Gap Modal */}
      <ClinicNetworkPolicyModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        telemetry={telemetry}
        onAction={handleAction}
      />
    </div>
  );
}
