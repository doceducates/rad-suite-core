'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Mail, Globe, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LegalSection {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  badgeText?: string;
  sections: LegalSection[];
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  subtitle,
  effectiveDate,
  badgeText = 'Legal & Compliance',
  sections,
  children,
}: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.offsetTop - 90;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </Link>
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <RadSuiteLogo variant="full" size="sm" href="/" />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground hidden md:inline-block">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground hidden md:inline-block">
              Privacy
            </Link>
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" variant="outline" className="text-xs font-semibold rounded-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Title Banner */}
      <section className="border-b border-border/40 bg-surface-container-lowest/50 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5 mb-3">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-mono">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {badgeText}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Effective: {effectiveDate}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-28 p-5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Table of Contents
              </div>
              <nav className="space-y-1">
                {sections.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={(e) => scrollToSection(e, sec.id)}
                      className={cn(
                        'block text-xs py-1.5 px-2.5 rounded-lg transition-all leading-normal',
                        isActive
                          ? 'font-semibold text-primary bg-primary/10 border-l-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {sec.title}
                    </a>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-border/50 text-[11px] text-muted-foreground space-y-2">
                <div className="font-semibold text-foreground">Need legal or HIPAA clarification?</div>
                <a
                  href="mailto:official@sehatai.org"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="w-3 h-3" />
                  official@sehatai.org
                </a>
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <article className="lg:col-span-8 xl:col-span-9 prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-10">
            {children}
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-container-low py-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <RadSuiteLogo variant="compact" size="sm" href="/" showBadge={false} />
            <span>&copy; {new Date().getFullYear()} SehatAI. Built for Diagnostic Radiology.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <a href="mailto:official@sehatai.org" className="hover:text-foreground transition-colors flex items-center gap-1">
              Contact <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
