import { describe, it, expect } from 'vitest';

export function shouldOpenClinicalContextMenu(
  isReadOnly: boolean,
  hasEditor: boolean,
  pointerType?: string,
  isCoarsePointer: boolean = false
): boolean {
  if (isReadOnly || !hasEditor) return false;
  // Touch long-press should NEVER open the desktop context menu; allow native mobile selection
  if (pointerType === 'touch' || isCoarsePointer) {
    return false;
  }
  return true;
}

describe('Clinical Context Menu Touch Handling', () => {
  it('should ignore touch long-press contextmenu events to preserve native text selection', () => {
    expect(shouldOpenClinicalContextMenu(false, true, 'touch', false)).toBe(false);
    expect(shouldOpenClinicalContextMenu(false, true, undefined, true)).toBe(false);
  });

  it('should permit desktop mouse right-click contextmenu events', () => {
    expect(shouldOpenClinicalContextMenu(false, true, 'mouse', false)).toBe(true);
    expect(shouldOpenClinicalContextMenu(false, true, undefined, false)).toBe(true);
  });

  it('should reject when readOnly or no editor', () => {
    expect(shouldOpenClinicalContextMenu(true, true, 'mouse', false)).toBe(false);
    expect(shouldOpenClinicalContextMenu(false, false, 'mouse', false)).toBe(false);
  });
});
