'use client';

import React, { useState } from 'react';
import {
  Download,
  Cable,
  Wifi,
  RefreshCw,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { ClinicDiagnosticProbes } from './clinic-diagnostic-probes';
import type { ClinicNodeTelemetry } from '@/services/clinic-node.service';

interface ClinicSetupGuideCardProps {
  telemetry: ClinicNodeTelemetry;
  onRunDiagnostics?: () => void;
  loading?: boolean;
}

export function ClinicSetupGuideCard({
  telemetry,
  onRunDiagnostics,
  loading = false,
}: ClinicSetupGuideCardProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  const diag = telemetry.diagnostics;
  const isOnline = telemetry.online;
  const pacsConnected = diag?.hospitalPacs.status === 'pass' || Boolean(telemetry.pacsStatus?.connected);
  const s3Connected = diag?.s3Write.status === 'pass' || Boolean(telemetry.s3Status?.connected);
  const orthancPass = diag?.orthancHttp.status === 'pass' || telemetry.orthancStatus === 'running';

  const allPassed = isOnline && pacsConnected && s3Connected && orthancPass;
  const isDeployed = Boolean(telemetry.lastHeartbeat || telemetry.scriptVersion || (telemetry.localStudies && telemetry.localStudies.length > 0));

  return (
    <Card className="border-border/70 bg-card shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/50 py-3.5 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              Clinic Edge Setup & Live Diagnostic Wizard
              {allPassed ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                  100% OPERATIONAL
                </Badge>
              ) : isOnline ? (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-mono">
                  ACTION NEEDED
                </Badge>
              ) : isDeployed ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-mono">
                  STANDBY / OFFLINE (PC OFF)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">
                  NOT DEPLOYED YET
                </Badge>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Follow these 4 physical steps to deploy your silent edge gateway on the clinic PC.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRunDiagnostics && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRunDiagnostics}
              disabled={loading || !isOnline}
              className="text-xs h-7 gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Run Full Diagnostics
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { step: 1, title: '1. Package Bundle', desc: 'Download / USB' },
            { step: 2, title: '2. Dual-NIC Wiring', desc: 'Air-Gap Routing' },
            { step: 3, title: '3. Silent Install', desc: 'Session 0 Service' },
            { step: 4, title: '4. Live Verification', desc: 'Pre-Flight Probes' },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeStep === item.step
                  ? 'border-primary bg-primary/5 text-primary shadow-xs'
                  : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
              }`}
            >
              <div className="text-[11px] font-bold">{item.title}</div>
              <div className="text-[10px] opacity-80">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab 1: Download & Bundle */}
        {activeStep === 1 && (
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-primary" />
                  Step 1: Download Self-Contained Deployment Package
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Contains <code>install.bat</code>, <code>Orthanc.exe</code>, edge daemon, Lua hooks, and network priority scripts.
                </p>
              </div>
              <a href="/api/clinic-node/bundle" download="clinic-node-package.zip">
                <Button size="sm" className="gap-1.5 text-xs shrink-0">
                  <Download className="w-3.5 h-3.5" />
                  Download Bundle (.zip)
                </Button>
              </a>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border/60 text-[11px] space-y-1.5 text-muted-foreground">
              <div className="font-semibold text-foreground">💡 How to take this to the Clinic PC:</div>
              <div>1. Download the ZIP file above to a USB flash drive or directly on the Clinic PC.</div>
              <div>2. Extract the ZIP to any folder (or directly to <code>C:\MedicalSandbox</code>).</div>
              <div>3. Zero external developer software (Node.js, Python, Git) is required.</div>
            </div>
          </div>
        )}

        {/* Tab 2: Dual-NIC Wiring */}
        {activeStep === 2 && (
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Cable className="w-4 h-4 text-primary" />
              Step 2: Plug In Dual Network Adapters (Air-Gap Isolation)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <Cable className="w-4 h-4 shrink-0" />
                  <span>Ethernet Cable (Hospital LAN)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Plug into hospital wall jack. Connects to <code>Hospital PACS (Port 8040/104)</code>.
                </p>
                <div className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                  Metric: 100 (No internet leakage)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-primary">
                  <Wifi className="w-4 h-4 shrink-0" />
                  <span>Wi-Fi / 4G Dongle (Internet)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Connect to clinic Wi-Fi. Uploads scans to <code>Cloud / S3 Storage</code>.
                </p>
                <div className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                  Metric: 10 (100% of Internet & S3)
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60 text-[11px] flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Permanent PACS static route command:</span>
              <CopyButton
                text="route -p add <hospital-subnet> mask <subnet-mask> <gateway-ip> metric 1"
                label="Copy Route Command"
                size="xs"
              />
            </div>
          </div>
        )}

        {/* Tab 3: 1-Click Silent Install */}
        {activeStep === 3 && (
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-primary" />
              Step 3: Run 1-Click Silent Setup
            </h4>
            <div className="p-3 rounded-xl bg-card border border-border/70 text-xs space-y-2">
              <div className="font-semibold text-foreground">Installation Instruction:</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                <li>
                  Right-click <strong>install.bat</strong> and select <strong className="text-foreground">"Run as administrator"</strong>.
                </li>
                <li>Wait 30–60 seconds while the installer deploys Orthanc and the Edge Agent.</li>
                <li>
                  <strong>Reboot Persistence:</strong> Both services register with <code>SERVICE_AUTO_START</code>. They launch automatically whenever the PC powers on, even before anyone logs into Windows!
                </li>
                <li>
                  <strong>Zero Interruption:</strong> Runs in Windows Session 0—zero CMD popups or taskbar icons for other doctors.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 4: Live Pre-Flight Health Checklist */}
        {activeStep === 4 && (
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <h4 className="font-bold text-xs text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                Step 4: Live Subsystem Health & Diagnostics
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Node: {telemetry.nodeId}
              </span>
            </h4>

            <ClinicDiagnosticProbes
              telemetry={telemetry}
              isOnline={isOnline}
              pacsConnected={pacsConnected}
              s3Connected={s3Connected}
              orthancPass={orthancPass}
              allPassed={allPassed}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
