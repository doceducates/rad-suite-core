'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowUpRight } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';

export function LandingFooter() {
  const [ref, visible] = useScrollReveal(0.1);

  return (
    <footer
      ref={ref}
      className={cn(
        'border-t border-border bg-surface-container-low transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <RadSuiteLogo variant="icon" size="md" />
            <div>
              <div className="text-sm font-bold text-foreground tracking-tight">
                Rad Suite <span className="text-[10px] font-mono text-muted-foreground font-normal ml-1">v1.0-alpha</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Diagnostic Radiology Workstation by SehatAI
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <a
              href="mailto:official@sehatai.org"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              official@sehatai.org
            </a>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/download" className="hover:text-foreground transition-colors font-medium text-primary">
              Download Desktop App
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Register
            </Link>
            <Link
              href="/#alpha-access"
              className="hover:text-foreground transition-colors flex items-center gap-0.5"
            >
              Request Access <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Creator Attribution & Welcome */}
        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              R
            </div>
            <div className="text-xs text-muted-foreground text-center md:text-left">
              Architected for <span className="font-semibold text-foreground">High-Performance Radiology Reporting</span>
              <span className="text-[11px] text-muted-foreground/80 block sm:inline sm:ml-1.5 font-mono">
                &bull; Open Diagnostic Workstation &bull; Vitrea Evolution
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} SehatAI</span>
            <span>&bull;</span>
            <span>Zero-Loss Vault &bull; 256-Bit Cryptography</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
