import { describe, it, expect } from 'vitest';
import {
  COMPANION_TABS,
  COMPANION_TAB_METADATA,
  isValidCompanionTab,
  getCompanionTabLabel,
  getNextCompanionTab,
  resolveCompanionTabForSection,
  CompanionTab,
} from '../companion-tab.service';

describe('Companion Tab Service (Layer 2 Domain Logic)', () => {
  it('should define exactly the 6 required unified companion tabs', () => {
    expect(COMPANION_TABS).toEqual(['report', 'images', 'ddx', 'chat', 'guidance', 'atlas']);
  });

  describe('isValidCompanionTab', () => {
    it('returns true for all registered companion tabs', () => {
      expect(isValidCompanionTab('report')).toBe(true);
      expect(isValidCompanionTab('images')).toBe(true);
      expect(isValidCompanionTab('ddx')).toBe(true);
      expect(isValidCompanionTab('chat')).toBe(true);
      expect(isValidCompanionTab('guidance')).toBe(true);
      expect(isValidCompanionTab('atlas')).toBe(true);
    });

    it('returns false for unrecognized tab names or non-string values', () => {
      expect(isValidCompanionTab('unknown')).toBe(false);
      expect(isValidCompanionTab(null)).toBe(false);
      expect(isValidCompanionTab(undefined)).toBe(false);
      expect(isValidCompanionTab(123)).toBe(false);
    });
  });

  describe('getCompanionTabLabel', () => {
    it('returns human-readable labels for each tab', () => {
      expect(getCompanionTabLabel('report')).toBe('Report');
      expect(getCompanionTabLabel('images')).toBe('Images');
      expect(getCompanionTabLabel('ddx')).toBe('DDx');
      expect(getCompanionTabLabel('chat')).toBe('Chat');
      expect(getCompanionTabLabel('guidance')).toBe('Pearls');
      expect(getCompanionTabLabel('atlas')).toBe('Atlas');
    });
  });

  describe('getNextCompanionTab', () => {
    it('cycles sequentially through all 6 companion tabs', () => {
      let current: CompanionTab = 'report';
      current = getNextCompanionTab(current);
      expect(current).toBe('images');

      current = getNextCompanionTab(current);
      expect(current).toBe('ddx');

      current = getNextCompanionTab(current);
      expect(current).toBe('chat');

      current = getNextCompanionTab(current);
      expect(current).toBe('guidance');

      current = getNextCompanionTab(current);
      expect(current).toBe('atlas');

      current = getNextCompanionTab(current);
      expect(current).toBe('report'); // wraps around
    });
  });

  describe('resolveCompanionTabForSection', () => {
    it('maps clinical history to chat tab for contextual discussion', () => {
      expect(resolveCompanionTabForSection('history')).toBe('chat');
    });

    it('maps findings to images tab for series examination', () => {
      expect(resolveCompanionTabForSection('findings')).toBe('images');
    });

    it('maps impression to ddx tab for differential diagnosis validation', () => {
      expect(resolveCompanionTabForSection('impression')).toBe('ddx');
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
