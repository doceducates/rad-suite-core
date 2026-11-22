/**
 * Vitrea / Voxen Chording & Interaction Matrix Engine (<300 lines).
 * Resolves mouse button combinations, modifier keys, and touch gestures
 * according to Vitrea interaction standards (RightClickConfiguration.xml).
 */

export type VitreaInteractionChord =
  | 'tool'
  | 'scroll'
  | 'wl'
  | 'pan'
  | 'zoom'
  | 'rotate'
  | 'crosshair'
  | 'none';

export interface ChordParams {
  buttons: number; // e.buttons bitmask: 1=left, 2=right, 4=middle
  alt?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  is3d?: boolean;
  activeTool?: string;
}

export interface TouchState {
  touchCount: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  initialDistance: number;
  longPressTimer?: any;
  mode: 'scrub' | 'wl' | 'tool' | 'pan' | 'zoom';
}

/**
 * Resolves standard Vitrea mouse interaction chord:
 * - Left Drag (buttons === 1): Active measurement or selection tool
 * - Right Drag (buttons === 2): Cine / Slice Scroll
 * - Left + Right Drag (buttons === 3): Window / Level (WW / WL)
 * - Middle Drag (buttons === 4) or Space + Left: Pan
 * - Shift + Right Drag: Autoscroll / 3D auto-rotate
 * - Left + Alt: 3D Crosshairs / Arcball
 */
export function resolveChord({
  buttons,
  alt = false,
  shift = false,
  ctrl = false,
  meta = false,
  is3d = false,
  activeTool = 'pan',
}: ChordParams): VitreaInteractionChord {
  // 1. Crosshairs override (Alt key or dedicated crosshair tool)
  if (alt || activeTool === 'crosshair') {
    return 'crosshair';
  }

  // 2. Left + Right button pressed together = Window / Level
  if ((buttons & 1) !== 0 && (buttons & 2) !== 0) {
    return 'wl';
  }

  // 3. Middle button = Pan
  if ((buttons & 4) !== 0) {
    return 'pan';
  }

  // 4. Right button drag alone = Slice scroll / Cine (2D) or Rotate (3D)
  if ((buttons & 2) !== 0) {
    if (is3d) return shift ? 'pan' : 'rotate';
    return shift ? 'zoom' : 'scroll';
  }

  // 5. Left button alone (buttons === 1)
  if ((buttons & 1) !== 0) {
    if (ctrl || meta) return 'zoom';
    if (shift) return 'pan';

    switch (activeTool) {
      case 'pan': return 'pan';
      case 'zoom': return 'zoom';
      case 'wl': return 'wl';
      case 'scroll': return 'scroll';
      default: return 'tool';
    }
  }

  return 'none';
}

/**
 * Calculates pinch distance between two touch points.
 */
export function getTouchDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates midpoint between two touch points.
 */
export function getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}
