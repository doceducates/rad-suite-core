'use client';

import React, { useState } from 'react';
import { Terminal, Play, RotateCcw, ArrowUpCircle, CheckCircle2, AlertTriangle, Copy, Check, Trash2, FileText, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import type { ClinicCommandResult } from '@/services/clinic-node.service';

interface ClinicRemoteTerminalCardProps {
  lastOutput?: ClinicCommandResult | null;
  onExecute: (command: string) => Promise<void>;
  onUpdateScript: () => Promise<void>;
  onUninstallAgent?: () => Promise<void>;
  onGetLogs?: (options?: { lines?: number; level?: string; service?: string }) => Promise<void>;
  onPruneLogs?: () => Promise<void>;
  online: boolean;
}

const PRESET_COMMANDS = [
  { label: 'View Today Logs', cmd: 'powershell -Command "Get-Content C:\\MedicalSandbox\\Logs\\clinic-node-*.log -Tail 50"' },
  { label: 'List Logs Dir', cmd: 'dir C:\\MedicalSandbox\\Logs' },
  { label: 'Query Orthanc', cmd: 'sc.exe query Orthanc' },
  { label: 'Check Port 11115', cmd: 'netstat -ano | findstr 11115' },
  { label: 'Process List', cmd: 'tasklist /fi "imagename eq orthanc.exe"' },
  { label: 'Storage Dir', cmd: 'dir C:\\MedicalSandbox\\Orthanc\\Storage' },
  { label: 'Network Config', cmd: 'ipconfig /all' },
];

export function ClinicRemoteTerminalCard({
  lastOutput,
  onExecute,
  onUpdateScript,
  onUninstallAgent,
  onGetLogs,
  onPruneLogs,
  online,
}: ClinicRemoteTerminalCardProps) {
  const [command, setCommand] = useState('sc.exe query Orthanc');
  const [running, setRunning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [pruningLogs, setPruningLogs] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [uninstallModalOpen, setUninstallModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async (cmdToRun?: string) => {
    const targetCmd = (cmdToRun || command).trim();
    if (!targetCmd) return;
    setRunning(true);
    try {
      await onExecute(targetCmd);
    } finally {
      setRunning(false);
    }
  };

  const handleUpdate = async () => {
    if (!confirm('Are you sure you want to trigger an Over-The-Air script update on the Clinic PC?')) return;
    setUpdating(true);
    try {
      await onUpdateScript();
    } finally {
      setUpdating(false);
    }
  };

  const handleCopy = () => {
    const text = [lastOutput?.stdout, lastOutput?.stderr].filter(Boolean).join('\n');
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-4 text-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Remote Command Execution & OTA Agent Manager
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {online ? 'Reverse Tunnel Live' : 'Agent Offline'}
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Execute diagnostic commands or update the edge script remotely over outbound HTTPS (No incoming ports needed)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onGetLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setFetchingLogs(true);
                try { await onGetLogs({ lines: 150 }); } finally { setFetchingLogs(false); }
              }}
              disabled={fetchingLogs || !online}
              className="gap-1.5 text-xs text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
              title="Query the latest structured diagnostic logs from the Clinic PC"
            >
              <FileText className={`w-3.5 h-3.5 ${fetchingLogs ? 'animate-spin' : ''}`} />
              <span>{fetchingLogs ? 'Fetching...' : 'Query Logs'}</span>
            </Button>
          )}

          {onPruneLogs && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setPruningLogs(true);
                try { await onPruneLogs(); } finally { setPruningLogs(false); }
              }}
              disabled={pruningLogs || !online}
              className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              title="Enforce 2-3 days log retention and truncate oversized files"
            >
              <Scissors className={`w-3.5 h-3.5 ${pruningLogs ? 'animate-spin' : ''}`} />
              <span>{pruningLogs ? 'Pruning...' : 'Prune (3d Limit)'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdate}
            disabled={updating || !online}
            className="gap-1.5 text-xs text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            title="Download latest script from VPS and reload agent"
          >
            <ArrowUpCircle className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Updating...' : 'Update Agent Script (OTA)'}</span>
          </Button>

          {onUninstallAgent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUninstallModalOpen(true)}
              disabled={uninstalling || !online}
              className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              title="Stop and uninstall edge agent and all background services from the machine"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Uninstall Agent</span>
            </Button>
          )}
        </div>
      </div>

      {/* Preset Command Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Presets:</span>
        {PRESET_COMMANDS.map((p) => (
          <button
            type="button"
            key={p.label}
            onClick={() => {
              setCommand(p.cmd);
              handleRun(p.cmd);
            }}
            disabled={running || !online}
            className="px-2 py-1 rounded-md text-[11px] font-mono bg-muted/40 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRun();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs select-none">
            &gt;
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type shell or powershell command... (e.g. dir C:\)"
            className="w-full pl-7 pr-3 py-2 text-xs font-mono rounded-xl bg-muted/30 border border-border/80 focus:outline-hidden focus:ring-1 focus:ring-primary text-foreground"
            disabled={!online}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={running || !command.trim() || !online}
          className="gap-1.5 text-xs font-bold bg-primary text-white shrink-0"
        >
          <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Dispatching...' : 'Run Command'}</span>
        </Button>
      </form>

      {/* Terminal Output Console */}
      <div className="rounded-xl border border-border/60 bg-slate-950 text-slate-100 p-3.5 font-mono text-xs space-y-2 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-[11px] text-slate-400 font-semibold">
              {lastOutput?.command ? `Last: ${lastOutput.command}` : 'Session 0 Remote Console'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastOutput && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                lastOutput.exitCode === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                Exit Code: {lastOutput.exitCode}
              </span>
            )}
            {lastOutput?.timestamp && (
              <span className="text-[10px] text-slate-500">
                {new Date(lastOutput.timestamp).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copy output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin select-text">
          {lastOutput?.stdout ? (
            <pre className="text-emerald-400 whitespace-pre-wrap break-words leading-relaxed text-[11px]">
              {lastOutput.stdout}
            </pre>
          ) : null}

          {lastOutput?.stderr ? (
            <pre className="text-rose-400 whitespace-pre-wrap break-words leading-relaxed text-[11px]">
              {lastOutput.stderr}
            </pre>
          ) : null}

          {!lastOutput?.stdout && !lastOutput?.stderr && (
            <div className="text-slate-500 italic py-4 text-center text-[11px]">
              Ready for remote instructions. Output will appear here upon next heartbeat return.
            </div>
          )}
        </div>
      </div>

      {/* Uninstall Agent Confirmation Modal */}
      {onUninstallAgent && (
        <Modal isOpen={uninstallModalOpen} onClose={() => setUninstallModalOpen(false)} size="md">
          <ModalHeader onClose={() => setUninstallModalOpen(false)}>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <ModalTitle>Uninstall Clinic Edge Agent</ModalTitle>
              <ModalDescription>Remote Service Teardown &amp; Decommission</ModalDescription>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                Are you sure you want to stop and uninstall the agent from the edge device?
              </p>
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 space-y-2">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Destructive Remote Teardown Operation
                </p>
                <ul className="text-[11px] space-y-1 list-disc list-inside leading-relaxed text-foreground/80 dark:text-foreground/90">
                  <li>Stops and unregisters <code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuiteEdgeAgent</code> &amp; <code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuiteWatchdog</code></li>
                  <li>Stops and removes the <code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">Orthanc</code> PACS engine service</li>
                  <li>Deletes the immortal scheduled task (<code className="font-mono text-[10px] bg-rose-500/10 px-1 py-0.5 rounded">RadSuite_Immortal_Lifeline</code>)</li>
                  <li>Removes inbound DICOM firewall rules (Port 11115)</li>
                </ul>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Once uninstalled, this node will go offline permanently until re-installed on the edge host.
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUninstallModalOpen(false)}
              disabled={uninstalling}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={uninstalling}
              onClick={async () => {
                setUninstalling(true);
                try {
                  await onUninstallAgent();
                  setUninstallModalOpen(false);
                } finally {
                  setUninstalling(false);
                }
              }}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{uninstalling ? 'Dispatching Teardown...' : 'Confirm & Uninstall Agent'}</span>
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
