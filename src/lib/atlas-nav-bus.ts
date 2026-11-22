// Layer 2: Atlas Navigation & Header Event Bus (<100 lines)
import type { AtlasThemeId } from './atlas-icon-map';

export interface AtlasNavState {
  activeModuleTitle: string | null;
  activeModuleCode: string | null;
  isSelectorOpen: boolean;
  currentTheme: AtlasThemeId;
}

let currentState: AtlasNavState = {
  activeModuleTitle: null,
  activeModuleCode: null,
  isSelectorOpen: true,
  currentTheme: 'clay',
};

export function broadcastAtlasNavState(update: Partial<AtlasNavState>) {
  currentState = { ...currentState, ...update };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('radsuite:atlas-nav-state', { detail: currentState })
    );
  }
}

export function getAtlasNavState(): AtlasNavState {
  return currentState;
}

export function emitAtlasSearch(query: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('radsuite:atlas-search', { detail: { query } })
    );
  }
}

export function emitAtlasContinue() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('radsuite:atlas-continue'));
  }
}

export function emitAtlasThemeChange(theme: AtlasThemeId) {
  try {
    localStorage.setItem('radsuite.atlas_theme', theme);
    localStorage.setItem('voxen.atlas_theme', theme);
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('radsuite:atlas-theme-change', { detail: { theme } })
    );
  }
}
