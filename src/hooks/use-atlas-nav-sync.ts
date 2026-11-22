'use client';

// Layer 4: Atlas Navigation & Workstation Topbar Synchronization Hook (<70 lines)
import { useEffect } from 'react';
import { broadcastAtlasNavState } from '@/lib/atlas-nav-bus';
import type { AtlasThemeId } from '@/lib/atlas-icon-map';
import type { AnatomyModuleSummary, AnatomyModuleDetails } from '@/types';

interface UseAtlasNavSyncOptions {
  modules: AnatomyModuleSummary[];
  activeCode: string;
  setActiveCode: (code: string) => void;
  moduleDetails: AnatomyModuleDetails | null;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
  atlasTheme: AtlasThemeId;
  setAtlasTheme: (theme: AtlasThemeId) => void;
}

export function useAtlasNavSync({
  modules,
  activeCode,
  setActiveCode,
  moduleDetails,
  isSelectorOpen,
  setIsSelectorOpen,
  atlasTheme,
  setAtlasTheme,
}: UseAtlasNavSyncOptions) {
  // Load persisted theme & last module
  useEffect(() => {
    try {
      const saved = localStorage.getItem('radsuite.atlas_theme') as AtlasThemeId | null;
      if (saved && ['clay', 'wax', 'kintsugi'].includes(saved)) {
        setAtlasTheme(saved);
      }
      const lastMod = localStorage.getItem('radsuite.atlas_last_module');
      if (lastMod && modules.some((m) => m.code === lastMod)) {
        setActiveCode(lastMod);
      }
    } catch {}
  }, [modules, setActiveCode, setAtlasTheme]);

  useEffect(() => {
    if (activeCode) {
      try {
        localStorage.setItem('radsuite.atlas_last_module', activeCode);
      } catch {}
    }
  }, [activeCode]);

  // Synchronize state with top workstation navbar
  useEffect(() => {
    broadcastAtlasNavState({
      activeModuleTitle: moduleDetails?.title || null,
      activeModuleCode: activeCode,
      isSelectorOpen,
      currentTheme: atlasTheme,
    });
  }, [moduleDetails, activeCode, isSelectorOpen, atlasTheme]);

  // Listen for Continue, History Back, and Theme events
  useEffect(() => {
    const handleContinue = () => {
      if (moduleDetails) setIsSelectorOpen(false);
    };
    const handleHistoryBack = (e: Event) => {
      if (!isSelectorOpen) {
        e.preventDefault();
        setIsSelectorOpen(true);
      }
    };
    const handleThemeEvent = (e: Event) => {
      const custom = e as CustomEvent<{ theme: AtlasThemeId }>;
      if (custom.detail?.theme) setAtlasTheme(custom.detail.theme);
    };

    window.addEventListener('radsuite:atlas-continue', handleContinue);
    window.addEventListener('radsuite:history-back', handleHistoryBack);
    window.addEventListener('radsuite:atlas-theme-change', handleThemeEvent);
    return () => {
      window.removeEventListener('radsuite:atlas-continue', handleContinue);
      window.removeEventListener('radsuite:history-back', handleHistoryBack);
      window.removeEventListener('radsuite:atlas-theme-change', handleThemeEvent);
    };
  }, [moduleDetails, isSelectorOpen, setIsSelectorOpen, setAtlasTheme]);
}
