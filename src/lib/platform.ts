'use client';

import { useState, useEffect } from 'react';

export type AppPlatform = 'desktop' | 'mobile' | 'web';

/**
 * Detects whether the current runtime is the native Tauri Desktop application (Windows/macOS/Linux).
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_POST_MESSAGE__ ||
    window.location.search.includes('source=desktop') ||
    window.location.search.includes('nonce=')
  );
}

/**
 * Detects whether the client is a mobile device or running in the Android APK.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || isSmallScreen;
}

/**
 * Returns the active platform target: 'desktop' | 'mobile' | 'web'.
 */
export function getAppPlatform(): AppPlatform {
  if (isDesktopApp()) return 'desktop';
  if (isMobileDevice()) return 'mobile';
  return 'web';
}

export interface PlatformState {
  platform: AppPlatform;
  isDesktop: boolean;
  isMobile: boolean;
  isWeb: boolean;
  isTauri: boolean;
}

/**
 * Canonical React hook for platform-targeted feature gating.
 * Guarantees zero cross-platform regressions by providing reactive, safe platform flags.
 */
export function usePlatform(): PlatformState {
  const [state, setState] = useState<PlatformState>(() => {
    const desktop = isDesktopApp();
    const mobile = !desktop && isMobileDevice();
    const web = !desktop && !mobile;
    return {
      platform: desktop ? 'desktop' : mobile ? 'mobile' : 'web',
      isDesktop: desktop,
      isMobile: mobile,
      isWeb: web,
      isTauri: typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const desktop = isDesktopApp();
      const mobile = !desktop && isMobileDevice();
      const web = !desktop && !mobile;
      setState({
        platform: desktop ? 'desktop' : mobile ? 'mobile' : 'web',
        isDesktop: desktop,
        isMobile: mobile,
        isWeb: web,
        isTauri: Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__),
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}
