'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Stethoscope, Menu, X, Download } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { LinkPendingIndicator } from '@/components/ui/link-pending-indicator';
import { cn } from '@/lib/utils';

interface LandingHeaderProps {
  user?: { id: string; name: string; role: string } | null;
}

const NAV_LINKS = [
  { href: '/#workstation', label: 'Workstation' },
  { href: '/#features', label: 'Features' },
  { href: '/#alpha-access', label: 'Alpha Access' },
  { href: '/download', label: 'Download App' },
];

export function LandingHeader({ user }: LandingHeaderProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const prefetchRoute = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

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
        <RadSuiteLogo variant="full" size="md" href="/" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/download"
            prefetch={false}
            onMouseEnter={() => prefetchRoute('/download')}
            className="hidden sm:inline-flex"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold rounded-lg border-primary/40 text-primary hover:bg-primary/10 active:scale-95 transition-transform"
            >
              <LinkPendingIndicator>
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </LinkPendingIndicator>
            </Button>
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              prefetch={false}
              onMouseEnter={() => prefetchRoute('/dashboard')}
              onFocus={() => prefetchRoute('/dashboard')}
            >
              <Button size="sm" className="gap-1.5 text-xs font-semibold rounded-lg active:scale-95 transition-transform">
                <LinkPendingIndicator>
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </LinkPendingIndicator>
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                prefetch={false}
                onMouseEnter={() => prefetchRoute('/login')}
                className="hidden sm:inline-flex"
              >
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground active:scale-95 transition-transform">
                  <LinkPendingIndicator>
                    <span>Sign In</span>
                  </LinkPendingIndicator>
                </Button>
              </Link>
              <Link href="/#alpha-access" className="hidden sm:inline-flex">
                <Button size="sm" className="text-xs font-semibold rounded-lg gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Request Access
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

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-4 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/download" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-primary/40 text-primary gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Download App</span>
              </Button>
            </Link>
            {!user && (
              <div className="flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/#alpha-access" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full text-xs">
                    Request Access
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
