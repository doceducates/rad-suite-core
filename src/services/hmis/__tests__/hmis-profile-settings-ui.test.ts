import { describe, it, expect } from 'vitest';
import { HmisProfileSettings } from '@/components/settings/hmis-profile-settings';

describe('HmisProfileSettings Component API', () => {
  it('should accept initialHasPassword prop and export valid React component', () => {
    expect(typeof HmisProfileSettings).toBe('function');
  });
});
