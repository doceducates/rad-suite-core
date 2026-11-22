import { describe, it, expect } from 'vitest';
import { SettingsTabbedContainer } from '@/components/settings/settings-tabbed-container';

describe('Settings Page Tabbed Container & Role Gates', () => {
  it('should export SettingsTabbedContainer component', () => {
    expect(typeof SettingsTabbedContainer).toBe('function');
  });
});
