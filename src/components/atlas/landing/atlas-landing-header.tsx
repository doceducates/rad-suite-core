'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Sparkles, Menu, X, Compass } from 'lucide-react';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AtlasLandingHeaderProps {
  user?: { id: string; name: string; role: string } | null;
}

const ATLAS_NAV_LINKS = [
  { href: '#features', label: 'Atlas Features', icon: Sparkles },
  { href: '#catalog', label: '49 Modules', icon: Layers },
  { href: '#quiz', label: 'Self-Quiz & Recall', icon: BookOpen },
  { href: '/atlas', label: 'Interactive Viewer', icon: Compass },
];

export function AtlasLandingHeader({ user }: AtlasLandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/85 backdrop-blur-xl border-b border-border/50 shadow-xs'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <AtlasLogo variant="full" size="md" href="/" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {ATLAS_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <link.icon className="w-3.5 h-3.5 text-emerald-500/70" />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/atlas" className="inline-flex">
                <Button size="sm" className="text-xs font-semibold rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Compass className="w-3.5 h-3.5" />
                  Launch Free Atlas
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3">
          {ATLAS_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm font-medium py-2 text-muted-foreground hover:text-foreground"
            >
              <link.icon className="w-4 h-4 text-emerald-500" />
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full text-xs">
                  Sign In to Student Vault
                </Button>
              </Link>
            )}
            <Link href="/atlas" onClick={() => setMobileOpen(false)}>
              <Button className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Launch Atlas Viewer
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
