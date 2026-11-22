'use client';

// Layer 4: Workstation Main Navbar (<130 lines)
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { RadSuiteLogo } from '@/components/brand/radsuite-logo';
import { AtlasLogo } from '@/components/brand/atlas-logo';
import { DesktopHistoryControls } from '@/components/common/DesktopHistoryControls';
import { AtlasNavbarControls } from './atlas-navbar-controls';
import { HeaderUserCluster } from './header-user-cluster';
import { PacsSearchModal } from '@/components/workstation/pacs-search-modal';

interface NavbarProps {
  userName?: string;
  userRole?: string;
  userEmail?: string;
  userStatus?: string;
  onOpenMobileNav?: () => void;
  isAtlas?: boolean;
}

export function Navbar({
  userName = 'Lead Radiologist',
  userRole = 'Consultant Radiologist',
  userEmail,
  userStatus,
  onOpenMobileNav,
  isAtlas: isAtlasProp,
}: NavbarProps) {
  const pathname = usePathname();
  const [isPacsSearchOpen, setIsPacsSearchOpen] = useState(false);

  const isStudentOrAtlas = Boolean(
    isAtlasProp ||
    userRole?.toLowerCase().includes('student') ||
    (typeof window !== 'undefined' && window.location.hostname.includes('atlas'))
  );

  const isAtlas = pathname === '/atlas' || pathname?.startsWith('/atlas');

  // Global ⌘K / Ctrl+K listener for instant PACS & case search (Clinical Only)
  useEffect(() => {
    if (isStudentOrAtlas) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPacsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudentOrAtlas]);

  return (
    <header className="h-14 border-b border-outline-variant/60 bg-surface/85 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 transition-colors select-none shrink-0 gap-2">
      {/* Left: Mobile Nav, Logo & Viewport History Navigation */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile-only brand logo mark when sidebar is hidden */}
        <div className="md:hidden">
          {isStudentOrAtlas ? (
            <AtlasLogo variant="compact" size="sm" href="/dashboard" />
          ) : (
            <RadSuiteLogo variant="compact" size="sm" href="/dashboard" />
          )}
        </div>

        {/* Desktop History & Viewport Navigation Controls */}
        <DesktopHistoryControls className="hidden md:inline-flex" />
      </div>

      {/* Center: Dynamic Contextual Slot (Atlas Controls or Unified Case Search) */}
      <div className="flex-1 flex items-center justify-center px-1 sm:px-3 min-w-0">
        {isAtlas ? (
          <AtlasNavbarControls />
        ) : isStudentOrAtlas ? (
          <div className="w-full max-w-md mx-2 flex items-center justify-center">
            <Link
              href="/atlas"
              className="w-full flex items-center bg-surface-container rounded-lg border border-outline-variant/50 px-3 py-1.5 text-on-surface-variant hover:border-primary hover:bg-surface-container-lowest transition-all cursor-pointer shadow-2xs group"
              title="Search Anatomical Structures & Modules"
            >
              <Search className="w-3.5 h-3.5 text-primary mr-2 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="w-full font-body text-[12px] text-secondary/80 text-left truncate">
                Search anatomy atlas structures...
              </span>
              <kbd className="font-mono text-[9px] bg-surface-container-high px-1.5 py-0.5 rounded text-secondary border border-outline-variant/50 font-semibold ml-1.5 shrink-0">
                Atlas
              </kbd>
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-md mx-2 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsPacsSearchOpen(true)}
              className="w-full flex items-center bg-surface-container rounded-lg border border-outline-variant/50 px-3 py-1.5 text-on-surface-variant hover:border-primary hover:bg-surface-container-lowest transition-all cursor-pointer shadow-2xs group"
              title="Search Diagnostic Cases & PACS Archive (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-primary mr-2 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="w-full font-body text-[12px] text-secondary/80 text-left truncate">
                Search cases by patient, MRN, accession...
              </span>
              <kbd className="font-mono text-[9px] bg-surface-container-high px-1.5 py-0.5 rounded text-secondary border border-outline-variant/50 font-semibold ml-1.5 shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>
        )}
      </div>

      {/* Right: Unified Header User Cluster (Profile Avatar Dropdown) */}
      <HeaderUserCluster
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        userStatus={userStatus}
        showPlugins={!isStudentOrAtlas}
        isAtlas={isStudentOrAtlas}
      />

      {!isStudentOrAtlas && (
        <PacsSearchModal isOpen={isPacsSearchOpen} onOpenChange={setIsPacsSearchOpen} />
      )}
    </header>
  );
}
