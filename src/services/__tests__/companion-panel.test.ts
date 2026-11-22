import { describe, it, expect } from 'vitest';
import {
  COMPANION_TABS,
  COMPANION_TAB_METADATA,
  isValidCompanionTab,
  normalizeCompanionTab,
  getCompanionTabLabel,
  getNextCompanionTab,
  resolveCompanionTabForSection,
  CompanionTab,
} from '../companion-tab.service';

describe('Companion Tab Service (Layer 2 Domain Logic)', () => {
  it('should define exactly the 7 unified companion tabs', () => {
    expect(COMPANION_TABS).toEqual([
      'images',
      'insights_ddx',
      'chat',
      'radiopaedia',
      'findings',
      'report',
      'atlas',
    ]);
  });

  describe('isValidCompanionTab', () => {
    it('returns true for all registered companion tabs', () => {
      expect(isValidCompanionTab('images')).toBe(true);
      expect(isValidCompanionTab('insights_ddx')).toBe(true);
      expect(isValidCompanionTab('chat')).toBe(true);
      expect(isValidCompanionTab('radiopaedia')).toBe(true);
      expect(isValidCompanionTab('findings')).toBe(true);
      expect(isValidCompanionTab('report')).toBe(true);
      expect(isValidCompanionTab('atlas')).toBe(true);
    });

    it('returns false for unrecognized tab names or non-string values', () => {
      expect(isValidCompanionTab('unknown')).toBe(false);
      expect(isValidCompanionTab(null)).toBe(false);
      expect(isValidCompanionTab(undefined)).toBe(false);
      expect(isValidCompanionTab(123)).toBe(false);
    });
  });

  describe('normalizeCompanionTab', () => {
    it('normalizes legacy ddx, insights, and guidance to insights_ddx', () => {
      expect(normalizeCompanionTab('ddx')).toBe('insights_ddx');
      expect(normalizeCompanionTab('insights')).toBe('insights_ddx');
      expect(normalizeCompanionTab('guidance')).toBe('insights_ddx');
    });

    it('preserves valid companion tabs and defaults invalid inputs to images', () => {
      expect(normalizeCompanionTab('chat')).toBe('chat');
      expect(normalizeCompanionTab('unknown_random')).toBe('images');
      expect(normalizeCompanionTab(null)).toBe('images');
    });
  });

  describe('getCompanionTabLabel', () => {
    it('returns human-readable labels for each tab', () => {
      expect(getCompanionTabLabel('images')).toBe('Images');
      expect(getCompanionTabLabel('insights_ddx')).toBe('Insights');
      expect(getCompanionTabLabel('chat')).toBe('Copilot');
      expect(getCompanionTabLabel('radiopaedia')).toBe('Radiopaedia');
      expect(getCompanionTabLabel('findings')).toBe('Findings');
      expect(getCompanionTabLabel('report')).toBe('Report');
      expect(getCompanionTabLabel('atlas')).toBe('Atlas');
    });
  });

  describe('getNextCompanionTab', () => {
    it('cycles sequentially through all 7 companion tabs', () => {
      let current: CompanionTab = 'images';
      current = getNextCompanionTab(current);
      expect(current).toBe('insights_ddx');

      current = getNextCompanionTab(current);
      expect(current).toBe('chat');

      current = getNextCompanionTab(current);
      expect(current).toBe('radiopaedia');

      current = getNextCompanionTab(current);
      expect(current).toBe('findings');

      current = getNextCompanionTab(current);
      expect(current).toBe('report');

      current = getNextCompanionTab(current);
      expect(current).toBe('atlas');

      current = getNextCompanionTab(current);
      expect(current).toBe('images'); // wraps around
    });
  });

  describe('resolveCompanionTabForSection', () => {
    it('maps clinical history to chat tab for contextual discussion', () => {
      expect(resolveCompanionTabForSection('history')).toBe('chat');
    });

    it('maps findings to images tab for series examination', () => {
      expect(resolveCompanionTabForSection('findings')).toBe('images');
    });

    it('maps impression to insights_ddx tab for differential diagnosis validation', () => {
      expect(resolveCompanionTabForSection('impression')).toBe('insights_ddx');
    });
  });

  describe('COMPANION_TAB_METADATA', () => {
    it('has complete metadata for each tab with icon and description', () => {
      for (const tab of COMPANION_TABS) {
        const meta = COMPANION_TAB_METADATA[tab];
        expect(meta).toBeDefined();
        expect(meta.id).toBe(tab);
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.iconName.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
      }
    });
  });
});
