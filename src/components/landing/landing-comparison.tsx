'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';

export function LandingComparison() {
  const [ref, isVisible] = useScrollReveal();

  const comparisons = [
    {
      feature: 'Large Volume Scrubbing',
      legacy: '15-30s lag per 500-slice volume; freezes on window adjustments',
      radSuite: 'Sub-second GPU scrubbing at locked 60 FPS with instant window presets',
    },
    {
      feature: 'HMIS & Worklist Entry',
      legacy: 'Manual copy-pasting of MRN, accession, patient age, and indication',
      radSuite: '100% automated batch harvesting into your active reporting queue',
    },
    {
      feature: 'Report Draft Durability',
      legacy: 'Session timeout or browser crash loses all unfinished work',
      radSuite: 'Durable local SQLite/AES-256 vault guarantees 0% draft loss',
    },
    {
      feature: 'Clinical AI Synthesis',
      legacy: 'Manual copy-pasting into external non-compliant web chatbots',
      radSuite: 'Native in-workstation copilot generating structured findings in 1-click',
    },
    {
      feature: 'Voice Dictation',
      legacy: 'Requires expensive proprietary microphones and slow servers',
      radSuite: 'Real-time browser & desktop voice lab with regional accent adaptation',
    },
  ];

  return (
    <section id="comparison" className="py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            The Diagnostic Upgrade
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground mt-4">
            Built for speed. Defended by safety.
          </h2>
          <p className="text-muted-foreground text-base mt-2">
            See why diagnostic departments are transitioning from sluggish legacy hospital software to Rad Suite.
          </p>
        </div>

        <div
          ref={ref}
          className={cn(
            'rounded-3xl border border-border bg-card overflow-hidden shadow-xl transition-all duration-1000 ease-out',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 bg-surface-container px-6 py-4 border-b border-border text-xs font-bold uppercase tracking-wider">
            <div className="md:col-span-4 text-muted-foreground">Workflow Metric</div>
            <div className="md:col-span-4 text-rose-500 flex items-center gap-1.5 mt-2 md:mt-0">
              <X className="w-4 h-4" />
              <span>Legacy PACS & Portals</span>
            </div>
            <div className="md:col-span-4 text-primary flex items-center gap-1.5 mt-2 md:mt-0">
              <Check className="w-4 h-4" />
              <span>Rad Suite Workstation</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {comparisons.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 px-6 py-5 text-sm gap-3 items-center hover:bg-surface-container/40 transition-colors"
              >
                <div className="md:col-span-4 font-bold text-foreground font-sans">
                  {item.feature}
                </div>
                <div className="md:col-span-4 text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{item.legacy}</span>
                </div>
                <div className="md:col-span-4 text-xs text-foreground font-medium flex items-start gap-2 leading-relaxed bg-primary/5 p-2 rounded-xl border border-primary/20">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item.radSuite}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
