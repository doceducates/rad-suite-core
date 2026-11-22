'use client';

import React from 'react';
import Link from 'next/link';
import {
  Brain,
  Heart,
  Activity,
  Bone,
  ArrowRight,
  Layers,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const REGIONS = [
  {
    id: 'head_neck',
    title: 'Head & Neck',
    icon: Brain,
    description:
      'Brain MRI & CT, skull base, cranial nerves I–XII, temporal bone, orbits, oral cavity, and suprahyoid neck spaces.',
    modulesCount: 14,
    slicesCount: '4,200+',
    featured: ['Brain MRI (Axial/Cor/Sag)', 'Cranial Nerves', 'Temporal Bone CT'],
    gradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
    accentColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'thorax',
    title: 'Thorax & Cardiovascular',
    icon: Heart,
    description:
      'Coronary CT angiography, 4-chamber cardiac MRI, mediastinal lymph node stations, and tracheobronchial tree.',
    modulesCount: 8,
    slicesCount: '2,600+',
    featured: ['Chest CT Multi-Window', 'Cardiac CT 4-Chamber', 'Mediastinum MRI'],
    gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    accentColor: 'text-rose-500',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'abdomen_pelvis',
    title: 'Abdomen & Pelvis',
    icon: Activity,
    description:
      'Couinaud hepatic segments, mesenteric vascular branching, retroperitoneum, multiparametric prostate MRI, and female pelvis.',
    modulesCount: 12,
    slicesCount: '3,800+',
    featured: ['Abdomen CT Multi-Phase', 'Couinaud Liver Segments', 'Prostate mpMRI'],
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    accentColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'spine_msk',
    title: 'Spine & Musculoskeletal',
    icon: Bone,
    description:
      'Cervical, thoracic, lumbar spine CT/MRI, brachial plexus, shoulder, knee cruciate ligaments, wrist, and ankle.',
    modulesCount: 15,
    slicesCount: '3,400+',
    featured: ['Lumbar Spine MRI', 'Knee Joint Multi-Planar', 'Shoulder Rotator Cuff'],
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    accentColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
  },
];

export function AtlasRegionalCatalog() {
  return (
    <section id="catalog" className="py-20 md:py-28 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Full Anatomical Coverage</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-headline font-bold text-foreground">
              49 Comprehensive Anatomic Modules
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Covering the entire human body across all primary radiologic modalities (Computed Tomography, Magnetic Resonance, and 3D Angiography).
            </p>
          </div>

          <Link href="/atlas">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
              <Compass className="w-4 h-4" />
              <span>Open All 49 Modules</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {REGIONS.map((reg) => {
            const Icon = reg.icon;
            return (
              <div
                key={reg.id}
                className="relative rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl p-6 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className={`w-5 h-5 ${reg.accentColor}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-headline font-semibold text-foreground">
                          {reg.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          {reg.modulesCount} modules · {reg.slicesCount} slices
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {reg.description}
                  </p>

                  <div className="space-y-1.5 mb-6">
                    <p className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
                      Key Highlights:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {reg.featured.map((item) => (
                        <span
                          key={item}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground border border-border/50"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Interactive Pins & Cross-Sections
                  </span>
                  <Link
                    href={`/atlas`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Explore Region</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
