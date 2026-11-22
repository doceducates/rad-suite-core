'use client';

import { Layers, Activity, Mic, ShieldCheck, Monitor, Smartphone } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Layers,
    iconBg: 'bg-primary/10 text-primary',
    title: 'Sub-Second Helical DICOM Engine',
    desc: 'WebGL2 GPU-accelerated rendering with multi-monitor Picture-in-Picture, 60 FPS locked viewport, and instant Hounsfield windowing for CT & MRI series.',
    span: 'lg:col-span-2',
    stats: [
      { label: '60 FPS', value: 'Locked' },
      { label: '< 15 MB', value: 'RAM' },
      { label: '4 Window', value: 'Presets' },
    ],
  },
  {
    icon: Activity,
    iconBg: 'bg-emerald-500/10 text-emerald-500',
    title: 'Punjab HMIS Portal Automation',
    desc: 'Automated patient worklist harvest, 1-click Livewire draft sync, and zero-submit safety locks to prevent accidental final submissions.',
  },
  {
    icon: Mic,
    iconBg: 'bg-violet-500/10 text-violet-500',
    title: 'Voice Lab & Smart Dictation',
    desc: 'Radiology-tuned speech parser with negative-finding macros, structured report insertion, and regional accent support.',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-primary/10 text-primary',
    title: 'Durable Zero-Loss Vault',
    desc: 'Crash-proof AES-256 encrypted local cache ensures every syllable is retained across power drops and unexpected shutdowns.',
  },
  {
    icon: Monitor,
    iconBg: 'bg-amber-500/10 text-amber-500',
    title: 'Native Desktop App',
    desc: 'Lightweight Tauri desktop client with full GPU pipeline and offline-first architecture — no browser tab required.',
  },
  {
    icon: Smartphone,
    iconBg: 'bg-primary/10 text-primary',
    title: 'Mobile Companion',
    desc: 'Review urgent trauma scans and on-call worklist from your phone with secure biometric authentication.',
    badge: 'Coming Soon',
  },
] as const;

export function LandingFeaturesBento() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block text-xs font-mono uppercase tracking-widest text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
            Core Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground mt-4">
            Everything a modern radiology department needs.
          </h2>
          <p className="text-muted-foreground text-base mt-3 max-w-xl mx-auto">
            From helical CT rendering to voice-driven reporting — a unified diagnostic workstation built for speed, safety, and clinical precision.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          ref={ref}
          className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, index) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={cn(
                  'rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all duration-700 hover:shadow-lg hover:border-primary/30 group',
                  'span' in f && f.span,
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8',
                )}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    f.iconBg,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-bold text-foreground mt-4 font-sans flex items-center gap-2">
                  {f.title}
                  {'badge' in f && f.badge && (
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                      {f.badge}
                    </span>
                  )}
                </h3>

                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {f.desc}
                </p>

                {'stats' in f && f.stats && (
                  <div className="mt-5 pt-4 border-t border-border flex items-center gap-6">
                    {f.stats.map((s) => (
                      <div key={s.label} className="text-center">
                        <span className="block text-sm font-bold text-foreground font-mono">
                          {s.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
