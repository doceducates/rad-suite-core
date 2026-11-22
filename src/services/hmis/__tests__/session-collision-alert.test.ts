import { describe, it, expect } from 'vitest';

describe('HMIS Single-Device Collision Detection Logic', () => {
  const isCollisionError = (msg: string): boolean => {
    return /already logged in|another device|session|concurrent/i.test(msg);
  };

  it('should identify Punjab HMIS collision error strings', () => {
    expect(
      isCollisionError('This account is already logged in from another device')
    ).toBe(true);
    expect(
      isCollisionError('HMIS_SESSION_COLLISION: User session active on another workstation')
    ).toBe(true);
    expect(
      isCollisionError('Concurrent login blocked by portal')
    ).toBe(true);
  });

  it('should not flag unrelated errors as collision', () => {
    expect(isCollisionError('Network timeout reaching portal')).toBe(false);
    expect(isCollisionError('Invalid patient MRN or accession number')).toBe(false);
    expect(isCollisionError('Incorrect password provided')).toBe(false);
  });
});
