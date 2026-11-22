'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  Stethoscope,
  X,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FounderWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FounderWelcomeModal({ isOpen, onClose }: FounderWelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && dontShowAgain) {
      localStorage.setItem('radsuite_welcome_letter_seen', 'true');
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-welcome-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-surface-container-high/95 via-surface-container/95 to-surface-container-lowest/95 dark:from-slate-900/95 dark:via-[#091122]/95 dark:to-[#040812]/95 border border-primary/30 shadow-[0_20px_60px_rgba(14,165,233,0.18)] p-4 sm:p-6 text-on-surface animate-in zoom-in-95 duration-300">
        {/* Modern Art: Ambient Radial Mesh */}
        <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 bg-gradient-to-br from-primary/25 to-teal-400/15 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 bg-gradient-to-tr from-purple-500/15 to-sky-500/20 blur-3xl rounded-full" />

        {/* Subtle DICOM Grid Watermark */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.035] dark:opacity-[0.05] stroke-primary"
        >
          <defs>
            <pattern id="grid-pattern-compact" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.75" />
              <circle cx="20" cy="20" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-compact)" />
        </svg>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container-highest/60 transition-colors cursor-pointer z-10"
          aria-label="Close welcome address"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Pill */}
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Clinical Dispatch &bull; Lead Architect</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            Ref: LGH-RAD-2026
          </span>
        </div>

        {/* Monograph Title */}
        <div className="space-y-0.5 mb-2.5 shrink-0">
          <h1
            id="founder-welcome-title"
            className="font-headline italic text-lg sm:text-xl md:text-2xl font-normal tracking-tight text-on-surface leading-tight"
          >
            Rebuilt for Radiologists, from First Principles.
          </h1>
          <p className="text-[11px] sm:text-xs text-secondary font-body">
            A personal welcome address from the founding clinician.
          </p>
        </div>

        {/* The Letter Body (Scrollable while keeping signature sticky at bottom) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-2.5 text-xs sm:text-[12.5px] text-secondary leading-relaxed bg-surface/50 dark:bg-black/30 p-3.5 sm:p-4 rounded-xl border border-outline-variant/40 backdrop-blur-sm">
          <p className="font-headline italic text-sm sm:text-base text-primary">
            Dear Esteemed Colleague,
          </p>
          <p>
            On behalf of our clinical development team, <strong className="text-on-surface font-semibold">welcome to Rad Suite</strong>. Thank you for choosing this workstation as your diagnostic reporting companion. Your trust and diagnostic time are deeply valued.
          </p>
          <p>
            As a practicing resident radiologist, I engineered this platform to permanently banish the frustrations that disrupt our daily workflows: catastrophic hospital portal crashes, lost draft findings, and slow legacy viewers.
          </p>
          <p>
            Every subsystem is built for uncompromising reliability: a <strong className="text-on-surface font-semibold">tamper-proof local draft vault</strong>, sub-second GPU multi-planar reslicing, and direct Gigabit LAN integration with our hospital PACS.
          </p>

          {/* Editorial Quote Callout */}
          <div className="my-2 pl-3 py-1 border-l-2 border-primary/60 italic font-headline text-xs sm:text-sm text-on-surface/90">
            &ldquo;May this workstation bring calm, velocity, and diagnostic certainty to every patient scan you interpret.&rdquo;
          </div>

          {/* 3 Pillar Micro-Pills */}
          <div className="pt-1 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 text-on-surface">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Zero Latency</span>
            </div>
            <div className="flex items-center gap-1 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 text-on-surface">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Crash Vault</span>
            </div>
            <div className="flex items-center gap-1 p-1.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 text-on-surface">
              <CheckCircle2 className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">Hospital LAN</span>
            </div>
          </div>
        </div>

        {/* Sticky Clinical Sign-off & Seal (Pinned above action buttons, always visible) */}
        <div className="shrink-0 mt-2.5 p-3 rounded-xl bg-surface-container/80 dark:bg-black/50 border border-primary/25 flex items-center justify-between gap-3 shadow-sm backdrop-blur-md">
          <div className="min-w-0">
            <div className="font-headline italic text-sm sm:text-base font-bold text-on-surface leading-snug truncate">
              Rad Suite Core
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-secondary font-mono leading-tight truncate">
              Open Diagnostic Radiology Workstation &bull; Vitrea Evolution
            </div>
            <div className="text-[9.5px] text-primary font-mono tracking-wider font-medium truncate">
              Clinical Engineering &bull; Open Source
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0 shadow-xs">
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.75]" />
          </div>
        </div>

        {/* Footer Actions & Preference Checkbox */}
        <div className="mt-2.5 pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <label className="flex items-center gap-1.5 text-[11px] text-secondary hover:text-on-surface transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="accent-primary rounded cursor-pointer"
            />
            <span>Don&apos;t show on startup</span>
          </label>

          <Button
            size="sm"
            onClick={handleDismiss}
            className="w-full sm:w-auto h-8 px-5 rounded-lg font-bold text-xs gap-2 bg-primary text-on-primary shadow-md shadow-primary/20 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Enter Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
