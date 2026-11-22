// Layer 2 (Domain/Services): Centralized Reporting Style & Impression Preferences
// Invariant: Target < 250 lines, max 350 lines.

import { useState, useEffect, useCallback } from 'react';

export type FindingsStyle = 'with_headings' | 'without_headings';
export type ImpressionStyle = 'local_high_yield' | 'international_structured';

export interface ReportingPreferences {
  findingsStyle: FindingsStyle;
  impressionStyle: ImpressionStyle;
}

const STORAGE_KEY = 'radsuite_reporting_preferences_v1';
const PREFS_CHANGE_EVENT = 'radsuite:reporting_preferences_changed';

export const DEFAULT_REPORTING_PREFERENCES: ReportingPreferences = {
  findingsStyle: 'without_headings', // Default to LGH official standard (pure bullets, zero subheadings)
  impressionStyle: 'local_high_yield', // Default to 1-2 concise synthesized bullets
};

/**
 * Reads the active reporting preferences from storage (SSR-safe)
 */
export function getReportingPreferences(): ReportingPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_REPORTING_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REPORTING_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      findingsStyle:
        parsed.findingsStyle === 'with_headings' ? 'with_headings' : 'without_headings',
      impressionStyle:
        parsed.impressionStyle === 'international_structured'
          ? 'international_structured'
          : 'local_high_yield',
    };
  } catch {
    return DEFAULT_REPORTING_PREFERENCES;
  }
}

/**
 * Updates reporting preferences and broadcasts change event across all open views
 */
export function setReportingPreferences(
  updates: Partial<ReportingPreferences>
): ReportingPreferences {
  const current = getReportingPreferences();
  const next: ReportingPreferences = {
    ...current,
    ...updates,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(PREFS_CHANGE_EVENT, { detail: next }));
    } catch (e) {
      console.warn('Failed to save reporting preferences', e);
    }
  }
  return next;
}

/**
 * React Hook for reactive reporting style preferences with real-time sync across components
 */
export function useReportingPreferences() {
  const [preferences, setPreferences] = useState<ReportingPreferences>(getReportingPreferences);

  useEffect(() => {
    setPreferences(getReportingPreferences());

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ReportingPreferences>;
      if (custom.detail) {
        setPreferences(custom.detail);
      } else {
        setPreferences(getReportingPreferences());
      }
    };

    window.addEventListener(PREFS_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(PREFS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateFindingsStyle = useCallback((style: FindingsStyle) => {
    const updated = setReportingPreferences({ findingsStyle: style });
    setPreferences(updated);
  }, []);

  const updateImpressionStyle = useCallback((flavor: ImpressionStyle) => {
    const updated = setReportingPreferences({ impressionStyle: flavor });
    setPreferences(updated);
  }, []);

  return {
    preferences,
    findingsStyle: preferences.findingsStyle,
    impressionStyle: preferences.impressionStyle,
    setFindingsStyle: updateFindingsStyle,
    setImpressionStyle: updateImpressionStyle,
  };
}
