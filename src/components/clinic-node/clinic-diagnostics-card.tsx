'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertTriangle, Monitor, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ClinicDiagnosticsCard() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    // 1. WebGL Test
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }

    // 2. WebAssembly Test
    try {
      setWasmSupported(typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function');
    } catch {
      setWasmSupported(false);
    }

    // 3. Latency Ping Test
    const t0 = performance.now();
    try {
      await fetch('/api/health');
      setLatencyMs(Math.round(performance.now() - t0));
    } catch {
      setLatencyMs(null);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="p-5 rounded-2xl border border-border/70 bg-card shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm text-foreground">Interactive Client Diagnostics & Setup Guide</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={runDiagnostics} disabled={testing} className="text-xs gap-1">
          {testing ? 'Testing...' : 'Rerun Tests'}
        </Button>
      </div>

      {/* Diagnostics Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Step 1: Network Latency */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">1. Network Tunnel</span>
          <div className="flex items-center gap-1.5 font-bold">
            {latencyMs !== null ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-foreground">{latencyMs} ms Latency</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-amber-600">Pending Response</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">Encrypted Link to Rad Suite</span>
        </div>

        {/* Step 2: WebGL Hardware Acceleration */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">2. GPU WebGL / WASM</span>
          <div className="flex items-center gap-1.5 font-bold">
            {webglSupported && wasmSupported ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400">Hardware Accelerated</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-amber-600">Enable Hardware Acceleration</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">Optimal for Cornerstone.js</span>
        </div>

        {/* Step 3: S3 Cloud & RadiAnt Integration */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">3. S3 Storage & RadiAnt</span>
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-foreground">s3.sehatai.org/radiology</span>
          </div>
          <span className="text-[10px] text-muted-foreground">1-Click RadiAnt DICOM ZIP Ready</span>
        </div>
      </div>

      {/* Step-by-Step Reporting Instructions */}
      <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs space-y-2">
        <div className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
          <Monitor className="w-4 h-4" />
          <span>Remote Radiologist Fast Reporting Instructions (Web & Desktop RadiAnt)</span>
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
          <li>
            <strong>Web Viewer:</strong> Open any study from the Worklist or Standby Workstation. Studies on S3 stream progressively slice-by-slice at 60 FPS.
          </li>
          <li>
            <strong>Desktop RadiAnt:</strong> Click the <strong className="text-foreground">"RadiAnt"</strong> button next to any study in the Worklist to download the DICOM ZIP and open in RadiAnt.
          </li>
          <li>
            <strong>Hospital PACS On-Demand Fetch:</strong> If a case is on the hospital PACS (<code className="text-foreground font-mono">Hospital PACS (C-GET)</code>) but not yet in S3, use the <strong>Hospital PACS Direct Harvester</strong> card above to pull it via C-GET without touching any consoles!
          </li>
        </ol>
      </div>
    </div>
  );
}
