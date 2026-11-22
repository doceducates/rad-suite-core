'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '< 500ms', label: 'Volume Render' },
  { value: '0% Draft Loss', label: 'Crash-Proof Vault' },
  { value: '60 FPS', label: 'GPU Accelerated' },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
      {/* Ambient gradient blurs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-16 h-[360px] w-[360px] rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-6 text-center animate-in fade-in duration-700">
        {/* Creator & Welcome Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Modern Clinical Radiology Diagnostic Workstation</span>
        </div>

        {/* Headline */}
        <h1 className="font-headline text-5xl leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Radiology Reporting,
          <br />
          <span className="italic text-primary">Rebuilt</span> from First Principles.
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Sub-second DICOM rendering, AI-powered dictation, and seamless hospital
          portal automation — in one unified workstation.
        </p>

        {/* CTA Row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="#alpha-access">
            <Button size="lg" className="h-12 rounded-xl px-8 text-sm font-bold gap-2">
              <span>Request Early Access</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/download">
            <Button variant="outline" size="lg" className="h-12 rounded-xl px-6 text-sm font-semibold gap-2 border-primary/40 text-primary hover:bg-primary/10">
              <Download className="h-4 w-4" />
              <span>Download Desktop App</span>
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg" className="h-12 rounded-xl px-6 text-sm font-medium text-muted-foreground">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Social Proof Strip */}
        <div className="mt-16 flex items-center justify-center gap-0">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {i > 0 && <div className="mx-6 h-10 w-px bg-border sm:mx-8" />}
              <div className="text-center">
                <p className="font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
