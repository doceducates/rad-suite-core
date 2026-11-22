'use client';

import React, { useState, useEffect } from 'react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { Activity, Cpu, HardDrive, ShieldCheck, Sparkles } from 'lucide-react';

interface DiagnosticSplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export function DiagnosticSplashScreen({
  onComplete,
  minDurationMs = 1600,
}: DiagnosticSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Step 1: GPU Engine check (300ms)
    const t1 = setTimeout(() => setActiveStep(1), 350);
    // Step 2: Storage & Cache (700ms)
    const t2 = setTimeout(() => setActiveStep(2), 750);
    // Step 3: PACS & Updates channel (1150ms)
    const t3 = setTimeout(() => setActiveStep(3), 1150);

    // Fade out start
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, minDurationMs);

    // Remove from DOM
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDurationMs + 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [minDurationMs, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070d19] text-white transition-opacity duration-400 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,0.12),transparent_60%)] pointer-events-none" />

      {/* Center Brand Identity */}
      <div className="relative flex flex-col items-center gap-4 text-center z-10 px-6">
        <div className="relative">
          <div className="absolute -inset-4 bg-sky-500/20 rounded-full blur-xl animate-pulse" />
          <RadSuiteLogo variant="icon" size="xl" showBadge={false} />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Rad Suite
            <span className="text-[10px] uppercase tracking-widest font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">
              Alpha v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Diagnostic Radiology Workstation • Vitrea Evolution
          </p>
        </div>

        {/* Live Hardware Telemetry Strip */}
        <div className="mt-8 flex flex-col gap-2.5 w-72 text-left bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Cpu className={`w-3.5 h-3.5 shrink-0 ${activeStep >= 1 ? 'text-sky-400' : 'text-slate-600'}`} />
            <span className="truncate">Direct3D 11 / WebGL2 Engine</span>
            {activeStep >= 1 ? (
              <span className="ml-auto text-[10px] text-emerald-400 font-mono">60 FPS</span>
            ) : (
              <span className="ml-auto w-2 h-2 rounded-full bg-slate-700 animate-ping" />
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <HardDrive className={`w-3.5 h-3.5 shrink-0 ${activeStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span className="truncate">Local SQLite Vault</span>
            {activeStep >= 2 ? (
              <span className="ml-auto text-[10px] text-emerald-400 font-mono">Ready</span>
            ) : (
              <span className="ml-auto text-[10px] text-slate-500 font-mono">...</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Activity className={`w-3.5 h-3.5 shrink-0 ${activeStep >= 3 ? 'text-sky-400' : 'text-slate-600'}`} />
            <span className="truncate">LGH PACS Auto-Detector</span>
            {activeStep >= 3 ? (
              <span className="ml-auto text-[10px] text-sky-400 font-mono">Listening</span>
            ) : (
              <span className="ml-auto text-[10px] text-slate-500 font-mono">...</span>
            )}
          </div>
        </div>

        {/* Bottom Loading Indicator */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Starting diagnostic environment...</span>
        </div>
      </div>
    </div>
  );
}
