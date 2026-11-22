import { describe, it, expect } from 'vitest';

export function computeDropdownDirection(
  triggerRect: { top: number; bottom: number },
  windowHeight: number,
  menuHeight: number = 240,
  requestedDirection: 'auto' | 'up' | 'down' = 'auto'
): 'up' | 'down' {
  if (requestedDirection !== 'auto') return requestedDirection;
  const spaceBelow = windowHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
    return 'up';
  }
  return 'down';
}

export function computeDropdownAlign(
  triggerRect: { left: number; right: number },
  windowWidth: number,
  menuWidth: number = 224,
  requestedAlign: 'auto' | 'left' | 'right' | 'center' = 'left'
): 'left' | 'right' | 'center' {
  if (requestedAlign !== 'auto' && requestedAlign !== 'left') return requestedAlign;
  if (triggerRect.left + menuWidth > windowWidth - 16 && triggerRect.right >= menuWidth) {
    return 'right';
  }
  return requestedAlign === 'auto' ? 'left' : requestedAlign;
}

describe('Dropdown Viewport Collision Logic', () => {
  it('should auto-flip to "up" when near the bottom of the viewport', () => {
    // Trigger is near bottom (top: 720, bottom: 750 in an 800px window)
    const dir = computeDropdownDirection({ top: 720, bottom: 750 }, 800, 240, 'auto');
    expect(dir).toBe('up');
  });

  it('should keep "down" when sufficient space exists below', () => {
    // Trigger is at top (top: 100, bottom: 130 in an 800px window)
    const dir = computeDropdownDirection({ top: 100, bottom: 130 }, 800, 240, 'auto');
    expect(dir).toBe('down');
  });

  it('should auto-align to "right" if opening left would clip outside the screen edge', () => {
    // Screen width 375px (mobile), trigger at left: 200, menu width: 224
    const align = computeDropdownAlign({ left: 200, right: 300 }, 375, 224, 'auto');
    expect(align).toBe('right');
  });
});
