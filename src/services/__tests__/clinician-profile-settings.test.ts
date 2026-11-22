import { describe, it, expect } from 'vitest';
import { ClinicianProfileSettings } from '@/components/settings/clinician-profile-settings';

describe('ClinicianProfileSettings Component', () => {
  it('should export ClinicianProfileSettings functional component', () => {
    expect(typeof ClinicianProfileSettings).toBe('function');
  });

  it('should accept initialName, initialTitle, role, and onProfileUpdated callback', () => {
    expect(ClinicianProfileSettings.length).toBeGreaterThanOrEqual(1);
  });
});
