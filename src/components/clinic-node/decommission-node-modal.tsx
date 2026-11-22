'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  Trash2,
  Terminal,
  Check,
  Copy,
  ShieldCheck,
  ShieldAlert,
  ServerOff,
} from 'lucide-react';
import { notify } from '@/services/notification.service';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.types';

interface DecommissionNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: ClinicNodeTelemetry | null;
  onConfirm: (nodeId: string, options: { uninstallAgent: boolean }) => Promise<void>;
  loading?: boolean;
}

const EMERGENCY_MANUAL_CMD =
  'cmd /c "schtasks /Delete /TN RadSuite_Immortal_Lifeline /F & sc stop RadSuiteEdgeAgent & sc delete RadSuiteEdgeAgent & sc stop RadSuiteWatchdog & sc delete RadSuiteWatchdog & sc stop Orthanc & sc delete Orthanc"';

export function DecommissionNodeModal({
  isOpen,
  onClose,
  node,
  onConfirm,
  loading = false,
}: DecommissionNodeModalProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [showManualCmd, setShowManualCmd] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!node) return null;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(EMERGENCY_MANUAL_CMD);
    setCopiedCmd(true);
    notify.success('Emergency teardown command copied to clipboard');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const handleExecute = async (uninstallAgent: boolean) => {
    setProcessing(true);
    try {
      await onConfirm(node.nodeId, { uninstallAgent });
      onClose();
    } catch {
      // Errors handled by parent notify
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader onClose={onClose}>
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <ModalTitle>Decommission Clinic Node</ModalTitle>
          <ModalDescription>
            {node.name || node.nodeId} ({node.hostname || 'Unknown Host'})
          </ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3.5">
        {/* Status & Connection Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container/60">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                node.online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-xs text-on-surface">
              {node.online ? 'Node is currently Online' : 'Node is currently Offline'}
            </span>
          </div>
          <Badge
            variant="outline"
            className={
              node.online
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
            }
          >
            {node.online ? 'Instant Teardown' : 'Queued Teardown'}
          </Badge>
        </div>

        <p className="text-secondary text-[11px] leading-relaxed">
          {node.online
            ? 'Because this edge node is connected, queuing an uninstall will stop its background daemons and remove services on its next heartbeat (~5 seconds).'
            : 'This node is currently offline. An immortal teardown directive will be held in the durable vault. The instant this machine turns on or reconnects, it will immediately wipe its agent services.'}
        </p>

        {/* Protection & Safety Invariants Card */}
        <Card className="border-outline-variant/60 bg-surface-container-low/40">
          <CardContent className="p-3 space-y-2 text-[11px]">
            <div className="font-semibold text-on-surface flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Automated Safety & Teardown Scope:
            </div>
            <ul className="space-y-1 list-disc list-inside text-secondary">
              <li>Stops and unregisters <code className="font-mono text-[10px]">RadSuiteEdgeAgent</code> & <code className="font-mono text-[10px]">Orthanc</code> Windows Services.</li>
              <li>Deletes scheduled watchdog tasks and firewall rule 11115.</li>
              <li>Purges medical sandbox in <code className="font-mono text-[10px]">C:\MedicalSandbox\Orthanc</code>.</li>
              <li className="font-medium text-emerald-600 dark:text-emerald-400">
                Hospital PACS archive and original clinical cases are 100% untouched.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Fail-safe / What if it fails to uninstall section */}
        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/30 p-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] text-on-surface flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              Emergency Fallback Script
            </span>
            <button
              type="button"
              onClick={() => setShowManualCmd(!showManualCmd)}
              className="text-[10px] text-primary hover:underline font-mono"
            >
              {showManualCmd ? 'Hide command' : 'View manual command'}
            </button>
          </div>

          {showManualCmd && (
            <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
              <p className="text-[10px] text-secondary">
                If the machine never reconnects or has corrupted permissions, paste this into an Administrator Command Prompt on the PC:
              </p>
              <div className="relative">
                <pre className="p-2 bg-neutral-900 text-neutral-100 rounded-lg text-[9px] font-mono overflow-x-auto whitespace-pre-wrap break-all pr-8">
                  {EMERGENCY_MANUAL_CMD}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={processing || loading} className="text-xs h-8">
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExecute(false)}
          disabled={processing || loading}
          className="text-xs h-8 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
        >
          <ServerOff className="w-3.5 h-3.5" />
          Dashboard Only
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleExecute(true)}
          disabled={processing || loading}
          className="text-xs h-8 gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {processing ? 'Queuing Teardown...' : 'Uninstall Agent & Decommission'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
