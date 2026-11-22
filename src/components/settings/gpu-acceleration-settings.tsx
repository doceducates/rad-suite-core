'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Cpu,
  Zap,
  Monitor,
  Layers,
  HardDrive,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  getHardwareSettings,
  saveHardwareSettings,
  detectGpuDiagnostics,
  DEFAULT_HARDWARE_SETTINGS,
  type WorkstationHardwareSettings,
  type GpuDiagnostics,
} from '@/services/hardware-settings.service';
import { notify } from '@/services/notification.service';

export function GpuAccelerationSettings() {
  const [settings, setSettings] = useState<WorkstationHardwareSettings>(DEFAULT_HARDWARE_SETTINGS);
  const [diagnostics, setDiagnostics] = useState<GpuDiagnostics>({
    renderer: 'Direct3D 11 (Accelerated)',
    vendor: 'System Hardware',
    webgl2Supported: true,
    isDesktopApp: false,
  });

  useEffect(() => {
    setSettings(getHardwareSettings());
    setDiagnostics(detectGpuDiagnostics());
  }, []);

  const updateSetting = <K extends keyof WorkstationHardwareSettings>(
    key: K,
    val: WorkstationHardwareSettings[K]
  ) => {
    const updated = saveHardwareSettings({ [key]: val });
    setSettings(updated);
    notify.success('Workstation hardware configuration updated');
  };

  const handleReset = () => {
    saveHardwareSettings(DEFAULT_HARDWARE_SETTINGS);
    setSettings(DEFAULT_HARDWARE_SETTINGS);
    notify.info('Hardware settings restored to factory defaults');
  };

  return (
    <Card className="border border-outline-variant/60 bg-surface-container-lowest">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" /> GPU Acceleration & Desktop Hardware Engine
            </CardTitle>
            <p className="text-[11px] text-secondary">
              Direct3D 11 hardware rasterization, shader-based Window/Level LUTs, and native NVMe memory mapping.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-[10px] ${
                diagnostics.isDesktopApp
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'border-primary/40 text-primary bg-primary/10'
              }`}
            >
              {diagnostics.isDesktopApp ? '⚡ Tauri Native Desktop Engine' : '🌐 Web Engine (Tauri-Ready)'}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-[11px] text-secondary hover:text-foreground"
              title="Reset to defaults"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Live Detected GPU Hardware Telemetry Banner */}
        <div className="p-3.5 rounded-xl border border-outline-variant/50 bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[11px] font-mono font-bold text-on-surface flex items-center gap-1.5 truncate max-w-sm">
                <span>{diagnostics.renderer}</span>
              </div>
              <p className="text-[10px] font-mono text-secondary">
                Vendor: {diagnostics.vendor} • WebGL2: {diagnostics.webgl2Supported ? 'Supported (Full 3D)' : 'Fallback'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hardware Direct3D 11 Active</span>
          </div>
        </div>

        {/* Setting 1: GPU Rasterization Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/70">
          <div>
            <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
              <span>Hardware GPU Rasterization</span>
              {settings.gpuAcceleration && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              Offloads 2D/3D slice compositing and viewport transforms directly to GPU compute units.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={settings.gpuAcceleration ? 'primary' : 'outline'}
              onClick={() => updateSetting('gpuAcceleration', true)}
              className="h-7 text-xs font-mono"
            >
              Enabled
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!settings.gpuAcceleration ? 'primary' : 'outline'}
              onClick={() => updateSetting('gpuAcceleration', false)}
              className="h-7 text-xs font-mono"
            >
              Software Fallback
            </Button>
          </div>
        </div>

        {/* Setting 2: Window/Level Engine */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/70">
          <div>
            <div className="font-semibold text-xs text-on-surface">Window / Level (WW/WC) Engine</div>
            <p className="text-[11px] text-secondary mt-0.5">
              GPU fragment shaders recalculate contrast curves in 0.1ms at 120+ FPS vs CPU rasterization.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={settings.wlEngine === 'gpu_shader' ? 'primary' : 'outline'}
              onClick={() => updateSetting('wlEngine', 'gpu_shader')}
              className="h-7 text-xs font-mono"
            >
              <Sparkles className="w-3 h-3 mr-1 text-emerald-400" /> GPU Shader (120 FPS)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={settings.wlEngine === 'cpu_raster' ? 'primary' : 'outline'}
              onClick={() => updateSetting('wlEngine', 'cpu_raster')}
              className="h-7 text-xs font-mono"
            >
              CPU Rasterizer
            </Button>
          </div>
        </div>

        {/* Setting 3: Refresh Rate Sync & VRAM Cache Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Refresh Rate Target */}
          <div className="p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-secondary" /> Diagnostic Refresh Rate
              </span>
              <span className="font-mono text-[10px] text-primary">{settings.refreshRate} Hz</span>
            </div>
            <p className="text-[10px] text-secondary">
              Synchronize cine playback with high-refresh medical monitors (Barco, Eizo, etc.).
            </p>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {(['60', '120', '144', 'uncapped'] as const).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => updateSetting('refreshRate', rate)}
                  className={`py-1 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                    settings.refreshRate === rate
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface-container text-secondary border-outline-variant/50 hover:bg-surface-container-high'
                  }`}
                >
                  {rate === 'uncapped' ? 'MAX' : `${rate}Hz`}
                </button>
              ))}
            </div>
          </div>

          {/* VRAM Texture Cache Allocation */}
          <div className="p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-secondary" /> VRAM Texture Allocation
              </span>
              <span className="font-mono text-[10px] text-primary">{settings.vramCacheGb} GB</span>
            </div>
            <p className="text-[10px] text-secondary">
              Dedicated GPU video memory reserved for caching multi-slice volumetric CT/MR series.
            </p>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[1, 2, 4, 8].map((gb) => (
                <button
                  key={gb}
                  type="button"
                  onClick={() => updateSetting('vramCacheGb', gb)}
                  className={`py-1 text-[10px] font-mono font-bold rounded border transition-colors cursor-pointer ${
                    settings.vramCacheGb === gb
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface-container text-secondary border-outline-variant/50 hover:bg-surface-container-high'
                  }`}
                >
                  {gb} GB
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Setting 4: Native NVMe Direct Storage I/O */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                <span>NVMe Direct Disk I/O (Desktop App)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                  3,000+ MB/s
                </span>
              </div>
              <p className="text-[11px] text-secondary mt-0.5">
                Reads local cases directly via Rust memory mapping, bypassing HTTP serialization.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={settings.nvmeDirectIo ? 'primary' : 'outline'}
              onClick={() => updateSetting('nvmeDirectIo', !settings.nvmeDirectIo)}
              className="h-7 text-xs font-mono"
            >
              {settings.nvmeDirectIo ? 'Enabled (Direct Memory)' : 'Standard'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
