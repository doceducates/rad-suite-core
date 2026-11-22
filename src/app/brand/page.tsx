'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Download, ShieldCheck, Copy, Check, Sparkles, Layers, Eye } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';

const LOGO_CONCEPTS = [
  {
    id: 'concept-a',
    title: 'Concept A: 3D Clinical App Icon',
    subtitle: 'App Icon & Software Packaging',
    description: 'Sleek 3D rendered squircle container featuring layered glowing CT/MRI scan rings and a stylized medical "R" aperture in sage mint and clinical emerald on obsidian black.',
    imageSrc: '/brand/radsuite-concept-a-app-icon.jpg',
    tag: 'Primary Recommendation',
  },
  {
    id: 'concept-b',
    title: 'Concept B: Minimalist Vector Emblem',
    subtitle: 'Clean Geometric Identity',
    description: 'Minimalist flat vector emblem blending a circular cross-sectional imaging slice with an AI voice dictation soundwave pulse in radiant forest sage gradient.',
    imageSrc: '/brand/radsuite-concept-b-vector-emblem.jpg',
    tag: 'Minimalist / Modern',
  },
  {
    id: 'concept-c',
    title: 'Concept C: Futuristic Diagnostic Shield',
    subtitle: 'Enterprise Healthtech Emblem',
    description: 'Precision diagnostic radiology optical lens integrated with a clinical shield structure, frosted glassmorphism layers, metallic rim highlights, and central medical cross.',
    imageSrc: '/brand/radsuite-concept-c-diagnostic-lens.jpg',
    tag: 'Enterprise / Hospital',
  },
];

const VECTOR_ASSETS = [
  {
    title: 'Rad Suite Icon Mark (SVG)',
    desc: 'Scalable vector mark for favicons, headers, and app manifests.',
    file: '/brand/radsuite-icon.svg',
  },
  {
    title: 'Horizontal Logo — Dark Background (SVG)',
    desc: 'Full brand lockup with typography for dark themes and splash screens.',
    file: '/brand/radsuite-logo.svg',
  },
  {
    title: 'Horizontal Logo — Light Background (SVG)',
    desc: 'Full brand lockup optimized for light reports and printable documents.',
    file: '/brand/radsuite-logo-light.svg',
  },
  {
    title: 'Compact Favicon (32x32 SVG)',
    desc: 'Lightweight icon optimized for browser tabs and desktop shortcuts.',
    file: '/brand/favicon.svg',
  },
];

export default function BrandLogosPage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(path);
    notify.success('File path copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Button>
            </Link>
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <RadSuiteLogo variant="full" size="sm" href="/" />
          </div>

          <div className="flex items-center gap-3">
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
              Privacy
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/40 bg-surface-container-lowest/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-mono mb-3">
            <Sparkles className="w-3 h-3 mr-1" />
            Brand Identity &amp; Logo Suite
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground">
            Rad Suite Brand Assets &amp; Logo Concepts
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
            High-resolution visual identities crafted for Rad Suite — communicating precision helical DICOM imaging, AI-assisted radiology dictation, and medical reliability.
          </p>
        </div>
      </section>

      {/* Main Showcase */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 space-y-16">
        {/* 1. AI High-Resolution Concepts */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold font-headline text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              High-Resolution Concept Designs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Photorealistic 3D app icons and emblems generated specifically for software packaging and desktop shortcuts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {LOGO_CONCEPTS.map((concept) => (
              <div
                key={concept.id}
                className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs hover:border-primary/40 transition-all flex flex-col"
              >
                {/* Image Preview Container */}
                <div className="relative aspect-square w-full bg-slate-950 flex items-center justify-center p-6 border-b border-border/50">
                  <Image
                    src={concept.imageSrc}
                    alt={concept.title}
                    width={480}
                    height={480}
                    className="w-full h-full object-contain rounded-xl hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-primary border border-primary/30">
                      {concept.tag}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-foreground">{concept.title}</h3>
                    <div className="text-[11px] font-mono text-primary font-semibold">{concept.subtitle}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {concept.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={concept.imageSrc}
                      download
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download High-Res
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPath(concept.imageSrc)}
                      className="h-9 px-3 rounded-xl text-xs"
                      title="Copy public URL"
                    >
                      {copied === concept.imageSrc ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Scalable Vector SVGs */}
        <div className="space-y-6 pt-4 border-t border-border/60">
          <div>
            <h2 className="text-xl font-bold font-headline text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-500" />
              Scalable Production Vector SVGs
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Zero-pixelation, responsive vector assets embedded directly into Rad Suite UI, headers, and favicons.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VECTOR_ASSETS.map((asset) => (
              <div
                key={asset.file}
                className="p-5 rounded-2xl border border-border/60 bg-card/60 flex items-center justify-between gap-4 hover:border-primary/30 transition-all"
              >
                <div className="space-y-1 max-w-sm">
                  <div className="font-bold text-sm text-foreground">{asset.title}</div>
                  <div className="text-xs text-muted-foreground">{asset.desc}</div>
                  <div className="text-[11px] font-mono text-primary pt-1">{asset.file}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={asset.file}
                    download
                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Color Tokens & Palette */}
        <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-4">
          <div className="font-bold text-sm text-foreground">Brand Color Palette</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-border/50 bg-slate-900 text-white space-y-1">
              <div className="w-full h-8 rounded-lg bg-[#4a7c59]" />
              <div className="text-xs font-bold pt-1">Forest Sage</div>
              <div className="text-[10px] font-mono text-slate-400">#4a7c59 &bull; Light Primary</div>
            </div>
            <div className="p-3 rounded-xl border border-border/50 bg-slate-900 text-white space-y-1">
              <div className="w-full h-8 rounded-lg bg-[#8ecf9e]" />
              <div className="text-xs font-bold pt-1">Sage Mint</div>
              <div className="text-[10px] font-mono text-slate-400">#8ecf9e &bull; Dark Primary</div>
            </div>
            <div className="p-3 rounded-xl border border-border/50 bg-slate-900 text-white space-y-1">
              <div className="w-full h-8 rounded-lg bg-[#101419]" />
              <div className="text-xs font-bold pt-1">PACS Obsidian</div>
              <div className="text-[10px] font-mono text-slate-400">#101419 &bull; Dark Surface</div>
            </div>
            <div className="p-3 rounded-xl border border-border/50 bg-slate-900 text-white space-y-1">
              <div className="w-full h-8 rounded-lg bg-[#faf6f0]" />
              <div className="text-xs font-bold pt-1 text-slate-900">Terra Sand</div>
              <div className="text-[10px] font-mono text-slate-400">#faf6f0 &bull; Light Surface</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-container-low py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <RadSuiteLogo variant="compact" size="sm" href="/" showBadge={false} />
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <a href="mailto:official@sehatai.org" className="hover:text-foreground">official@sehatai.org</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
