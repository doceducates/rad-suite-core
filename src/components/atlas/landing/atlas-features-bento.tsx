'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  Eye,
  Languages,
  HelpCircle,
  Zap,
  Box,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Compass,
    title: 'Multi-Planar Reconstruction (MPR)',
    description:
      'Seamlessly traverse Axial, Coronal, and Sagittal orthogonal planes with linked scout-lines for instantaneous spatial localization.',
    badge: 'Diagnostic Standard',
    color: 'emerald',
  },
  {
    icon: Eye,
    title: 'Pedagogical Focus & Solo Isolation',
    description:
      'Select any anatomic structure to solo-highlight it with an automatic 15% ambient dimming over surrounding tissues to master complex relationships.',
    badge: 'Cognitive Clarity',
    color: 'teal',
  },
  {
    icon: Languages,
    title: 'Dual Terminologia Anatomica',
    description:
      'Instantaneous one-click toggle between standard international Latin nomenclature and clinical English, matching global board exam requirements.',
    badge: 'Bilingual Engine',
    color: 'sky',
  },
  {
    icon: HelpCircle,
    title: 'Interactive Self-Quiz & Active Recall',
    description:
      'Turn any cross-section into an interactive flashcard. Mask pinpoints into [ ? ] badges and test diagnostic recall with immediate grading.',
    badge: 'Board Preparation',
    color: 'amber',
  },
  {
    icon: Zap,
    title: 'Sub-30ms Zero-Latency Slicing',
    description:
      'Powered by our pre-warmed streaming cache and zero-reflow SVG projection. Scrub through 200+ slice volumes with zero frame drops.',
    badge: '60 FPS Scrub',
    color: 'violet',
  },
  {
    icon: Box,
    title: 'WebGL 3D Anatomical Spatial Systems',
    description:
      'Correlate 2D cross-sectional slices with interactive 3D skeletal, vascular, and organ meshes to bridge planar imaging with full anatomy.',
    badge: 'Spatial Volume',
    color: 'emerald',
  },
];

export function AtlasFeaturesBento() {
  return (
    <section id="features" className="py-20 md:py-28 bg-muted/20 border-y border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>Built for High-Yield Medical Mastery</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold text-foreground">
            Engineered for Precision Medical Learning
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Every feature is designed from first principles to help students, surgical trainees, and radiology
            residents internalize 3D spatial anatomy from real radiologic imaging.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className="group relative overflow-hidden border-border/60 bg-card/70 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {feat.badge}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-headline font-semibold text-foreground">
                    {feat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/atlas"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Experience all features live in the interactive viewer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
