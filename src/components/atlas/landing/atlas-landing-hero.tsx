'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATS = [
  { value: '14,089', label: 'Cross-Section Slices' },
  { value: '2,919', label: 'Anatomy Pinpoints' },
  { value: '49', label: 'Full-Body Modules' },
  { value: '< 30ms', label: 'Slice Streaming' },
];

export function AtlasLandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Ambient Emerald & Cyan Glow */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-[440px] w-[440px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-20 h-[380px] w-[380px] rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 text-center animate-in fade-in duration-700">
        {/* Academic Edition Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Cross-Sectional Anatomy & Self-Quiz Academy</span>
        </div>

        {/* Headline */}
        <h1 className="font-headline text-5xl leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Master Human Anatomy
          <br />
          <span className="italic text-emerald-500 dark:text-emerald-400">in Cross-Section</span> & 3D.
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Explore 14,089 pristine diagnostic CT & MRI slices, 2,919 pinpointed structures,
          and dual <em>Terminologia Anatomica</em> nomenclature. Built for medical students,
          radiology residents, and healthcare educators.
        </p>

        {/* Primary CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/atlas">
            <Button size="lg" className="h-12 rounded-xl px-8 text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
              <Compass className="h-4 w-4" />
              <span>Launch Interactive Atlas</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="h-12 rounded-xl px-6 text-sm font-semibold gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
              <BookOpen className="h-4 w-4" />
              <span>Student Practice & Quiz</span>
            </Button>
          </Link>
          <Link href="#catalog">
            <Button variant="ghost" size="lg" className="h-12 rounded-xl px-6 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Layers className="h-4 w-4 mr-1.5" />
              <span>Browse Catalog</span>
            </Button>
          </Link>
        </div>

        {/* Interactive Anatomy Preview Card */}
        <div className="mt-14 mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground">Brain CT · Axial Neurovascular Series</span>
              <span className="text-muted-foreground hidden sm:inline">Slice 42 / 88</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                Terminologia Anatomica
              </span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-16/9 flex items-center justify-center border border-border/30">
            {/* Ambient anatomical grid lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
            
            {/* Visual simulation of axial slice with pinned structures */}
            <div className="relative text-center px-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Compass className="w-8 h-8 text-emerald-400 animate-spin-slow" />
              </div>
              <p className="text-sm font-semibold text-emerald-300">
                Arteria basilaris <span className="text-white/60 font-normal">· Basilar artery</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Circle of Willis & Posterior Cerebral Circulation
              </p>
            </div>

            {/* Simulated interactive pins */}
            <div className="absolute top-1/4 left-1/3 flex items-center gap-1.5 px-2 py-1 rounded bg-black/80 border border-emerald-500/50 text-[10px] text-emerald-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Pons</span>
            </div>
            <div className="absolute bottom-1/4 right-1/3 flex items-center gap-1.5 px-2 py-1 rounded bg-black/80 border border-teal-500/50 text-[10px] text-teal-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>Sinus cavernosus</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Peer-reviewed clinical cross-sections
            </span>
            <Link href="/atlas" className="text-emerald-500 hover:underline font-medium">
              Open Full Interactive Viewer &rarr;
            </Link>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-14 flex items-center justify-center gap-0">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {i > 0 && <div className="mx-4 sm:mx-8 h-10 w-px bg-border/60" />}
              <div className="text-center">
                <p className="font-mono text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
