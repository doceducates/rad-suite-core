'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Zap, Activity, Cpu, Monitor } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col lg:flex-row bg-background text-on-surface">
      {/* Left Zone: Diagnostic Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-surface-container-lowest border-r border-outline-variant/60 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-[380px] h-[380px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Header */}
        <div className="space-y-4">
          <RadSuiteLogo variant="full" size="lg" href="/" />

          <div className="pt-8 space-y-2 max-w-md">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">
              Private Alpha Workstation
            </span>
            <h2 className="text-2xl xl:text-3xl font-extrabold text-on-surface font-headline leading-tight">
              High-Velocity Diagnostic Radiology & HMIS Sync
            </h2>
            <p className="text-xs xl:text-sm text-secondary leading-relaxed font-sans">
              Sub-second multi-slice DICOM viewing, automatic HMIS list generation, and AI-powered impression drafting in a single unified interface.
            </p>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="space-y-3 max-w-md py-6">
          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">GPU-Accelerated DICOM Viewport</div>
              <div className="text-[11px] text-secondary">60 FPS multi-slice scrolling with HU window presets</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">Punjab HMIS Livewire Bridge</div>
              <div className="text-[11px] text-secondary">Automated investigation matching and 1-click draft saves</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">Clinical Voice Lab & Copilot</div>
              <div className="text-[11px] text-secondary">Radiology-tuned structured dictation and impression drafts</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Footer */}
        <div className="pt-4 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>256-Bit Vault Encryption</span>
          </div>
          <span>SehatAI Network</span>
        </div>
      </div>

      {/* Right Zone: Authentication Form View */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Top Floating Controls */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-4">
          <div className="lg:hidden">
            <RadSuiteLogo variant="full" size="sm" href="/" />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface font-headline">
              {title}
            </h1>
            <p className="text-xs text-secondary">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Bottom Microcopy */}
        <div className="text-center pt-6 text-[11px] text-secondary space-y-1">
          <div>Rad Suite Diagnostic Workstation &copy; {new Date().getFullYear()} SehatAI</div>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
            <span>&bull;</span>
            <a href="mailto:official@sehatai.org" className="hover:text-foreground hover:underline">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}
