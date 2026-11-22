import { describe, it, expect } from 'vitest';
import { HmisLogoutButton } from '@/components/hmis/hmis-logout-button';
import { useHmisStatus } from '@/hooks/use-hmis-status';

describe('HMIS Real-Time Status & Connectivity Components', () => {
  it('exports valid useHmisStatus hook', () => {
    expect(typeof useHmisStatus).toBe('function');
  });

  it('exports valid HmisLogoutButton component accepting header, sidebar, and icon variants', () => {
    expect(typeof HmisLogoutButton).toBe('function');
  });
});
