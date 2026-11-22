'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Activity, Layers, ArrowRight, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';
import { LandingRealDicomViewer } from './landing-real-dicom-viewer';

export function LandingDicomShowcase() {
  const [activeTab, setActiveTab] = useState<'ai' | 'hmis' | 'viva'>('ai');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [impressionText, setImpressionText] = useState(
    '1. Well-circumscribed right cerebellopontine angle mass centered at the internal auditory canal (approx 18 x 14 mm), consistent with Vestibular Schwannoma (Koos Grade II/III).\n2. Characteristic widening of the right porus acusticus.\n3. Minimal mass effect on the right middle cerebellar peduncle; fourth ventricle is patent without obstructive hydrocephalus.\n4. Contralateral vestibulocochlear nerve complex is unremarkable.'
  );

  const handleTriggerAi = () => {
    setAiGenerating(true);
    setImpressionText('');
    const fullText =
      '1. Well-circumscribed right cerebellopontine angle mass centered at the internal auditory canal (approx 18 x 14 mm), consistent with Vestibular Schwannoma (Koos Grade II/III).\n2. Characteristic widening of the right porus acusticus with "ice-cream cone" contour.\n3. Mild contact with the adjacent brainstem; fourth ventricle is preserved with normal supratentorial ventricular caliber.\n4. Normal appearance of the left internal acoustic canal and bilateral inner ear structures.';

    let curr = '';
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        curr += fullText[i];
        setImpressionText(curr);
        i++;
      } else {
        clearInterval(interval);
        setAiGenerating(false);
      }
    }, 12);
  };

  return (
    <section id="workstation" className="py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            Live Diagnostic Workstation
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground mt-4">
            Test the real DICOM engine right here.
          </h2>
          <p className="text-muted-foreground text-base mt-2">
            Interactive multi-slice MRI dataset (Head MR — Vestibular Schwannoma). Drag to adjust Window/Level, zoom, pan, measure with caliper, or play Cine.
          </p>
        </div>

        {/* Workstation Console Frame */}
        <div className="rounded-3xl border border-zinc-800 bg-[#070a0f] shadow-2xl overflow-hidden">
          {/* Top System Title Bar */}
          <div className="bg-[#0d121b] px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-200">
                <span className="font-bold text-white">Rad Suite Diagnostic Studio</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">MR Head • Routine Stealth</span>
                <span className="text-zinc-600">•</span>
                <span className="text-primary font-semibold">Vestibular Schwannoma Series</span>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>90 DICOM Instances Loaded</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Durable Vault Active</span>
              </div>
            </div>
          </div>

          {/* Workstation Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-w-0">
            {/* Left 7 cols: Real Interactive DICOM Viewer */}
            <div className="lg:col-span-7 p-3 sm:p-5 border-b lg:border-b-0 lg:border-r border-zinc-800 min-w-0 bg-[#04060a]">
              <LandingRealDicomViewer />
            </div>

            {/* Right 5 cols: Clinical Co-Pilot Drawer */}
            <div className="lg:col-span-5 bg-[#0a0e16] p-4 sm:p-6 flex flex-col justify-between space-y-5 min-w-0">
              <div className="space-y-4 min-w-0">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#101622] border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      activeTab === 'ai' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Copilot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('hmis')}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      activeTab === 'hmis' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>HMIS Bridge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('viva')}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                      activeTab === 'viva' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Viva Insights</span>
                  </button>
                </div>

                {/* Tab 1: AI Copilot */}
                {activeTab === 'ai' && (
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">Diagnostic Impression:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerAi}
                        disabled={aiGenerating}
                        className="h-7 text-[11px] gap-1.5 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                      >
                        <Sparkles className={cn('w-3 h-3', aiGenerating && 'animate-spin')} />
                        <span>{aiGenerating ? 'Drafting Findings...' : 'Re-Draft with AI'}</span>
                      </Button>
                    </div>
                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#06080d] text-xs text-zinc-200 font-sans leading-relaxed whitespace-pre-line min-h-[170px] shadow-xs break-words">
                      {impressionText}
                    </div>
                  </div>
                )}

                {/* Tab 2: HMIS Bridge */}
                {activeTab === 'hmis' && (
                  <div className="space-y-3 min-w-0">
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Livewire Form Injection Ready</span>
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400">Portal ID: 19</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Strict Zero-Submit safety active. The report is preserved in Rad Suite durable vault before background TinyMCE synchronization.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-zinc-800 bg-[#06080d] space-y-2 text-xs">
                      <div className="flex justify-between text-zinc-400 font-mono text-[11px]">
                        <span>Punjab HMIS Harvest</span>
                        <span className="text-emerald-400 font-bold">142 Cases Harvested</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Viva Insights */}
                {activeTab === 'viva' && (
                  <div className="space-y-3 min-w-0">
                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#06080d] space-y-2 text-xs">
                      <div className="font-bold text-zinc-200">High-Yield Exam Pearl (CPA Mass):</div>
                      <p className="text-zinc-400 leading-relaxed">
                        Look for the &quot;ice-cream cone&quot; sign: the cone is the intracanalicular component widening the internal auditory canal, and the scoop is the cisternal cerebellopontine angle component.
                      </p>
                      <div className="pt-1 flex items-center gap-2 text-[11px] text-primary font-mono font-medium">
                        <span>FCPS / FRCR Viva Matrix</span>
                        <span>•</span>
                        <span>Koos Classification</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Zero Report Loss Vault</span>
                </span>
                <a href="#alpha-access" className="text-primary font-semibold hover:underline flex items-center gap-1">
                  <span>Request Alpha Access</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
