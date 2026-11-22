'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  ShieldCheck,
  Cpu,
  HardDrive,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/services/notification.service';
import type { ReleaseInfo } from '@/services/release.service';

interface DownloadViewProps {
  release: ReleaseInfo;
}

export function DownloadView({ release }: DownloadViewProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showChangelog, setShowChangelog] = useState(true);

  const handleCopyHash = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(release.sha256);
      setCopiedHash(true);
      notify.success('SHA-256 checksum copied to clipboard');
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-10">
      {/* Back to Homepage Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-surface-container"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview &amp; Features</span>
        </Link>
        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
          Official Build v{release.version} Alpha
        </span>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Desktop Release v{release.version} Alpha</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface">
          Diagnostic Radiology Workstation
        </h1>
        <p className="text-secondary text-sm sm:text-base leading-relaxed">
          High-performance, zero-latency desktop workstation with embedded offline engine, Gigabit LAN PACS harvester, and strict Punjab HMIS draft protection.
        </p>

        {/* Primary Download Button & Quick Specs */}
        <div className="pt-4 flex flex-col items-center justify-center gap-3">
          <a
            href="/api/download/desktop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm sm:text-base shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-5 h-5 animate-bounce" />
            <span>Download for Windows (64-bit)</span>
            <span className="text-xs font-mono opacity-80 pl-1">({release.fileSizeFormatted})</span>
          </a>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-secondary font-mono">
            <span>Windows 10 / 11 (x64)</span>
            <span>•</span>
            <span>Standalone Setup (.exe)</span>
            <span>•</span>
            <span>CurrentUser (No UAC required)</span>
          </div>
        </div>
      </div>

      {/* Checksum & Security Verification Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-container border border-outline-variant/60 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Authenticity & Integrity Verification (SHA-256)</span>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            Installer: {release.installerFileName}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface border border-outline-variant/40 font-mono text-xs">
          <span className="truncate text-secondary select-all">{release.sha256}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyHash}
            className="h-7 text-xs gap-1 shrink-0 text-primary hover:text-primary"
          >
            {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHash ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      </div>

      {/* 3-Step Setup Guide */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-on-surface text-center">3-Step Quick Installation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-sm text-on-surface">Download Installer</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Click the download button above to retrieve <code className="text-primary font-mono text-[11px]">{release.installerFileName}</code> directly to your PC.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-sm text-on-surface">Run Setup</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Double-click the installer. It configures the workstation in your local user profile without needing Windows administrator privileges.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-sm text-on-surface">Launch & Report</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Open &quot;Rad Suite&quot; from the Start menu. Sign in or redeem alpha code <code className="text-primary font-mono text-[11px]">LGH-ALPHA-2026</code> to begin.
            </p>
          </div>
        </div>
      </div>

      {/* System Requirements & What's Bundled */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <Cpu className="w-4 h-4 text-primary" />
            <span>Recommended System Requirements</span>
          </div>
          <ul className="text-xs text-secondary space-y-2 font-mono">
            <li>• OS: Windows 10 (64-bit) Version 19041+ or Windows 11</li>
            <li>• Processor: Intel Core i5 / AMD Ryzen 5 or higher</li>
            <li>• Memory: 8 GB RAM (16 GB for 3D multi-series CT/MRI)</li>
            <li>• Storage: 500 MB free SSD storage for installation</li>
            <li>• Graphics: DirectX 11+ compatible GPU with WebGL 2.0</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container border border-outline-variant/60 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <HardDrive className="w-4 h-4 text-emerald-500" />
            <span>Zero-Dependency Bundled Architecture</span>
          </div>
          <ul className="text-xs text-secondary space-y-2">
            <li>• <strong className="text-on-surface">Embedded Node.js Runtime:</strong> Fully isolated inside app bundle; no external Node installation required.</li>
            <li>• <strong className="text-on-surface">Local SQLite Vault:</strong> Durable offline storage with zero cloud dependencies.</li>
            <li>• <strong className="text-on-surface">Tauri v2 Native Host:</strong> Hardware-accelerated GPU viewport with minimal memory overhead.</li>
          </ul>
        </div>
      </div>

      {/* Changelog & Release Notes */}
      <div className="rounded-2xl bg-surface-container border border-outline-variant/60 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowChangelog(!showChangelog)}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm text-on-surface hover:bg-surface-container-high/50 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-extrabold">What&apos;s New in v{release.version}</span>
            <Badge variant="outline" className="text-[10px] font-mono text-secondary">
              Updated {release.publishedAtFormatted || release.releaseDate}
            </Badge>
            <Badge variant="success" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              Latest Build
            </Badge>
          </div>
          {showChangelog ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
        </button>

        {showChangelog && (
          <div className="p-5 pt-0 border-t border-outline-variant/40 space-y-3">
            <p className="text-xs text-secondary font-medium">
              Official changes and improvements packaged in build <code className="text-primary font-mono">{release.version}</code>:
            </p>
            <ul className="space-y-2 text-xs text-on-surface">
              {release.releaseNotes.map((note, idx) => {
                const cleaned = note.replace(/^[-*•]\s*/, '').trim();
                if (!cleaned) return null;
                return (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-secondary">{cleaned}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Web Workstation Fallback Link */}
      <div className="p-6 rounded-2xl bg-surface-container-highest/40 border border-outline-variant/60 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-secondary">
          <Laptop className="w-4 h-4" />
          <span>Prefer using the workstation in your web browser?</span>
        </div>
        <p className="text-xs text-secondary">
          You can also run the web workstation directly in Google Chrome or Microsoft Edge.
        </p>
        <div className="pt-1">
          <Link href="/worklist">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <span>Open Web Workstation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
