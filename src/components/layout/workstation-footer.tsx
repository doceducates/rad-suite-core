'use client';

// Layer 4: Universal Persistent Workstation Footer (<150 lines)
import React from 'react';
import { HelpCircle, Info, ShieldCheck, Activity, GraduationCap } from 'lucide-react';

export function WorkstationFooter({ isAtlas: isAtlasProp }: { isAtlas?: boolean } = {}) {
  const isAtlas = Boolean(
    isAtlasProp ||
    (typeof window !== 'undefined' &&
      (window.location.hostname.includes('atlas') || window.location.pathname.startsWith('/atlas')))
  );

  const handleOpenGuide = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-workstation-guide'));
    }
  };

  const handleOpenAbout = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-founder-welcome'));
    }
  };

  return (
    <footer className="h-7 border-t border-border/40 bg-surface/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 z-20">
      {/* Left: Workstation Identity & Security Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 font-semibold text-foreground/80 tracking-tight text-[10px] sm:text-[11px]">
          <span className="text-primary font-bold">{isAtlas ? 'DocEducates Atlas' : 'Rad Suite'}</span>
          <span className="text-muted-foreground font-normal">{isAtlas ? 'v2.4' : 'v2.4 Alpha'}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-500/90 font-medium">
          {isAtlas ? <GraduationCap className="w-3 h-3 text-emerald-500" /> : <ShieldCheck className="w-3 h-3 text-emerald-500" />}
          <span>{isAtlas ? 'Academic Edition' : 'HIPAA Safe'}</span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground/80">
          <Activity className="w-3 h-3 text-primary/70" />
          <span>{isAtlas ? 'Terminologia Anatomica' : 'Local Engine Active'}</span>
        </div>
      </div>

      {/* Center: Essential Keyboard Shortcuts (Desktop only) */}
      <div className="hidden lg:flex items-center gap-3 text-[10px] text-muted-foreground/75">
        <span>
          <kbd className="rounded bg-muted/60 px-1 py-0.2 font-mono text-[9px] border border-border/40">Alt+←</kbd> Back
        </span>
        <span>
          <kbd className="rounded bg-muted/60 px-1 py-0.2 font-mono text-[9px] border border-border/40">Alt+→</kbd> Forward
        </span>
        <span>
          <kbd className="rounded bg-muted/60 px-1 py-0.2 font-mono text-[9px] border border-border/40">Shift+?</kbd> Shortcuts
        </span>
      </div>

      {/* Right: Help Guide, About & Modal Triggers */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenGuide}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:text-primary hover:bg-surface-container transition-colors cursor-pointer text-[10px] font-medium"
          title="Functions & Shortcuts Guide (Shift + ?)"
        >
          <HelpCircle className="w-3 h-3 text-primary" />
          <span>Guide</span>
        </button>

        <div className="h-3 w-px bg-border/40" />

        <button
          type="button"
          onClick={handleOpenAbout}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:text-primary hover:bg-surface-container transition-colors cursor-pointer text-[10px]"
          title={isAtlas ? 'About DocEducates Atlas' : 'About Rad Suite'}
        >
          <Info className="w-3 h-3 opacity-70" />
          <span className="hidden sm:inline">About</span>
        </button>
      </div>
    </footer>
  );
}
