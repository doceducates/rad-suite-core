'use client';

import React, { useState } from 'react';
import { Network, Wifi, WifiOff, ShieldCheck, RefreshCw, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClinicNodeTelemetry, ClinicActionType } from '@/services/clinic-node.service';

interface ClinicNetworkPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: ClinicNodeTelemetry;
  onAction: (action: ClinicActionType, payload?: any) => Promise<void>;
}

const DURATIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1 Hour', minutes: 60 },
  { label: '2 Hours', minutes: 120 },
];

export function ClinicNetworkPolicyModal({
  isOpen,
  onClose,
  telemetry,
  onAction,
}: ClinicNetworkPolicyModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [loading, setLoading] = useState<string | null>(null);

  const isIsolated = Boolean(telemetry.wifiIsolation?.active);
  const remainingMins = telemetry.wifiIsolation?.remainingMinutes || 0;
  const pacsConnected = Boolean(telemetry.pacsStatus?.connected);

  const handleEnforcePolicy = async () => {
    setLoading('enforce');
    try {
      await onAction('enforce-network-policy');
    } finally {
      setLoading(null);
    }
  };

  const handleIsolate = async () => {
    setLoading('isolate');
    try {
      await onAction('isolate-wifi', { duration: selectedDuration });
      onClose();
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading('restore');
    try {
      await onAction('restore-wifi');
      onClose();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <ModalTitle>Dual-NIC & Air-Gap Network Control</ModalTitle>
          <ModalDescription>Hospital PACS Ethernet Segregation & Timed Wi-Fi Isolation</ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4 text-xs">
          {/* Active Status Card */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Dual-NIC Segregation Status
              </span>
              <Badge className={pacsConnected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'}>
                {pacsConnected ? 'Ethernet Route Locked' : 'PACS Link Checking'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              RadiAnt Viewer & Orthanc communicate with Hospital PACS (<code className="font-mono text-foreground font-semibold">Hospital PACS IP</code>) strictly over the physical Ethernet cable (Metric 1). Internet traffic routes via Wi-Fi (Metric 10).
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Re-apply persistent route & adapter metrics:</span>
              <Button
                size="sm"
                variant="outline"
                disabled={loading !== null}
                onClick={handleEnforcePolicy}
                className="h-7 text-[11px] gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading === 'enforce' ? 'animate-spin' : ''}`} />
                <span>{loading === 'enforce' ? 'Applying...' : 'Enforce Policy'}</span>
              </Button>
            </div>
          </div>

          {/* Wi-Fi Isolation / Air-Gap Controls */}
          <div className={`p-3.5 rounded-xl border transition-all space-y-3 ${
            isIsolated
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-card border-border/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-2">
                {isIsolated ? <WifiOff className="w-4 h-4 text-amber-500" /> : <Wifi className="w-4 h-4 text-primary" />}
                Timed Wi-Fi Air-Gap Isolation
              </span>
              {isIsolated && (
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-mono text-[10px]">
                  ACTIVE (~{remainingMins}m left)
                </Badge>
              )}
            </div>

            {isIsolated ? (
              <div className="space-y-2">
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Wi-Fi is currently disabled and all cloud sync activities are paused. The PC is operating exclusively on the hospital Ethernet network.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  The background watchdog will automatically re-enable Wi-Fi and resume sync when the timer expires.
                </p>
                <Button
                  size="sm"
                  onClick={handleRestore}
                  disabled={loading !== null}
                  className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{loading === 'restore' ? 'Restoring...' : 'Restore Wi-Fi & Resume Sync Now'}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-muted-foreground">
                  Disconnect Wi-Fi and pause all background cloud activities to keep the PC in pure local Ethernet mode during scanning or reporting shifts.
                </p>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                    Select Isolation Duration:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.minutes}
                        type="button"
                        onClick={() => setSelectedDuration(d.minutes)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          selectedDuration === d.minutes
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-muted/50 border-border/60 text-foreground hover:bg-muted'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleIsolate}
                  disabled={loading !== null}
                  className="w-full gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 font-semibold text-xs cursor-pointer mt-1"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>{loading === 'isolate' ? 'Isolating...' : `Isolate to Ethernet for ${selectedDuration}m`}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
