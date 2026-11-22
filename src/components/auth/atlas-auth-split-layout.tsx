'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, Sparkles, BookOpen, Brain, ShieldCheck } from 'lucide-react';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AtlasAuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AtlasAuthSplitLayout({ children, title, subtitle }: AtlasAuthSplitLayoutProps) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col lg:flex-row bg-background text-on-surface">
      {/* Left Zone: Educational Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-surface-container-lowest border-r border-outline-variant/60 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient Emerald & Teal Glow */}
        <div className="absolute top-1/4 left-1/4 w-[380px] h-[380px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Header */}
        <div className="space-y-4">
          <AtlasLogo variant="full" size="lg" href="/" />

          <div className="pt-8 space-y-2 max-w-md">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold uppercase tracking-wider">
              DocEducates Academy
            </span>
            <h2 className="text-2xl xl:text-3xl font-extrabold text-on-surface font-headline leading-tight">
              Master Human Anatomy in Cross-Section &amp; 3D
            </h2>
            <p className="text-xs xl:text-sm text-secondary leading-relaxed font-sans">
              Explore 14,089 real diagnostic slices, 2,919 pinpointed structures, and active self-quizzing
              built for medical students, trainees, and radiology residents.
            </p>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="space-y-3 max-w-md py-6">
          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">14,089 Radiologic Slices</div>
              <div className="text-[11px] text-secondary">High-resolution axial, coronal, and sagittal MPR series</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">Dual Terminologia Anatomica</div>
              <div className="text-[11px] text-secondary">Instant Latin &amp; English bilingual nomenclature toggle</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container/60 backdrop-blur-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-on-surface">Interactive Self-Quiz &amp; Flashcards</div>
              <div className="text-[11px] text-secondary">Masked pin recall challenges with streak tracking</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Compliance Footer */}
        <div className="pt-4 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-secondary font-mono">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Open Medical Education</span>
          </div>
          <span>DocEducates Ecosystem</span>
        </div>
      </div>

      {/* Right Zone: Authentication Form View */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        {/* Top Floating Controls */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-4">
          <div className="lg:hidden">
            <AtlasLogo variant="full" size="sm" href="/" />
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
          <div>DocEducates Atlas &copy; {new Date().getFullYear()} DocEducates Academy</div>
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
            <span>&bull;</span>
            <a href="mailto:official@doceducates.com" className="hover:text-foreground hover:underline">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}
