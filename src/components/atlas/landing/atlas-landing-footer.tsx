'use client';

import React from 'react';
import Link from 'next/link';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { ShieldCheck, HeartHandshake, ExternalLink } from 'lucide-react';

export function AtlasLandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/10 py-12 md:py-16 text-muted-foreground text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <AtlasLogo variant="full" size="md" href="/" />
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
              DocEducates Anatomy Academy.
              A next-generation, high-performance cross-sectional anatomy and 3D learning platform
              built to empower medical students, surgical trainees, and radiology residents worldwide.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Terminologia Anatomica compliant · 14,089 radiologic slices</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
              Anatomy Academy
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/atlas" className="hover:text-foreground transition-colors">
                  Interactive Atlas Viewer
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Student Dashboard & Quiz
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Pedagogical Features
                </Link>
              </li>
              <li>
                <Link href="#catalog" className="hover:text-foreground transition-colors">
                  49 Anatomic Modules
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
              DocEducates Ecosystem
            </p>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://doceducates.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span>DocEducates Academy</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Student Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://radiology.sehatai.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <span>Rad Suite Workstation</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>
            &copy; {new Date().getFullYear()} DocEducates Academy. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>For Educational & Pedagogical Use</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              Engineered with <HeartHandshake className="w-3 h-3 text-rose-500 inline" /> for medical learners
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
