'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DesktopUpdateBanner } from './DesktopUpdateBanner';
import { DesktopUpdateModal } from './DesktopUpdateModal';
import { DiagnosticSplashScreen } from '@/components/startup/DiagnosticSplashScreen';
import { FirstRunSetupWizard } from '@/components/startup/FirstRunSetupWizard';
import { FounderWelcomeModal } from '@/components/startup/FounderWelcomeModal';

const AUTH_PATHS = ['/login', '/register', '/pending-access'];

/**
 * Detects whether the current execution context is the native Tauri desktop app.
 * In standard web browsers (Chrome, Safari, Edge, Mobile), this returns false.
 */
function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_POST_MESSAGE__ ||
    window.location.pathname.startsWith('/desktop') ||
    window.location.search.includes('nonce=')
  );
}

export function DesktopClientHost() {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showFounderWelcome, setShowFounderWelcome] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const handleOpenWelcome = () => setShowFounderWelcome(true);
    const handleOpenWizard = () => setShowWizard(true);

    window.addEventListener('open-founder-welcome', handleOpenWelcome);
    window.addEventListener('open-setup-wizard', handleOpenWizard);

    // STRICT ISOLATION: Diagnostic splash and automated startup wizards run ONLY inside the Desktop app
    if (!isDesktopApp()) {
      return () => {
        window.removeEventListener('open-founder-welcome', handleOpenWelcome);
        window.removeEventListener('open-setup-wizard', handleOpenWizard);
      };
    }

    // Show splash on desktop once per browser session
    const hasSeenSplashThisSession = sessionStorage.getItem('radsuite_splash_shown');
    if (!hasSeenSplashThisSession) {
      setShowSplash(true);
      sessionStorage.setItem('radsuite_splash_shown', 'true');
    }

    // 1. Welcome letter: only on first launch if un-seen (desktop only)
    const hasSeenWelcome = localStorage.getItem('radsuite_welcome_letter_seen');
    if (!hasSeenWelcome) {
      const welcomeTimer = setTimeout(() => {
        setShowFounderWelcome(true);
      }, 1000);
      return () => {
        clearTimeout(welcomeTimer);
        window.removeEventListener('open-founder-welcome', handleOpenWelcome);
        window.removeEventListener('open-setup-wizard', handleOpenWizard);
      };
    }

    return () => {
      window.removeEventListener('open-founder-welcome', handleOpenWelcome);
      window.removeEventListener('open-setup-wizard', handleOpenWizard);
    };
  }, []);

  // 2. Trigger setup wizard strictly after authentication on dashboard/worklist routes (Desktop only)
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !isDesktopApp()) return;

    const isAuthRoute = AUTH_PATHS.some((p) => pathname === p || pathname?.startsWith(p + '/'));
    if (isAuthRoute) return;

    const hasCompletedOnboarding = localStorage.getItem('radsuite_onboarding_completed_v1');
    const hasSeenWelcome = localStorage.getItem('radsuite_welcome_letter_seen');

    // Only prompt setup if user has dismissed welcome letter and has not finished/skipped onboarding
    if (hasSeenWelcome && !hasCompletedOnboarding && !showFounderWelcome) {
      const timer = setTimeout(() => {
        setShowWizard(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [mounted, pathname, showFounderWelcome]);

  if (!mounted) return null;

  // On web, if neither modal was explicitly opened via custom event, render nothing
  if (!isDesktopApp() && !showFounderWelcome && !showWizard) {
    return null;
  }

  return (
    <>
      {showSplash && <DiagnosticSplashScreen onComplete={() => setShowSplash(false)} />}
      <FounderWelcomeModal
        isOpen={showFounderWelcome}
        onClose={() => setShowFounderWelcome(false)}
      />
      <FirstRunSetupWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />
      <DesktopUpdateBanner />
      <DesktopUpdateModal />
    </>
  );
}
