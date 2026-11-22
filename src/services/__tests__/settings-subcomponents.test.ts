import { describe, it, expect } from 'vitest';
import { AdminPacsSettings } from '@/components/settings/admin-pacs-settings';
import { AdminClinicNodeSettings } from '@/components/settings/admin-clinic-node-settings';
import { WorkstationDisplaySettings } from '@/components/settings/workstation-display-settings';
import { SystemStorageSettings } from '@/components/settings/system-storage-settings';

describe('Settings Modular Subcomponents', () => {
  it('should export all settings subcomponents', () => {
    expect(typeof AdminPacsSettings).toBe('function');
    expect(typeof AdminClinicNodeSettings).toBe('function');
    expect(typeof WorkstationDisplaySettings).toBe('function');
    expect(typeof SystemStorageSettings).toBe('function');
  });
});
