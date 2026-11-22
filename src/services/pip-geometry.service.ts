// Layer 2 (Domain/Services): Pure business logic for floating PiP window geometry, multi-axis resizing & smart drag

export type PipResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface PipRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PipConstraints {
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  margin: number;
  snapDistance: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const DEFAULT_PIP_CONSTRAINTS: PipConstraints = {
  minW: 280,
  minH: 200,
  maxW: 960,
  maxH: 720,
  margin: 16,
  snapDistance: 20,
};

export function getDefaultPipRect(
  viewport: ViewportSize,
  defaultW = 440,
  defaultH = 330,
  margin = 24
): PipRect {
  const w = Math.min(defaultW, Math.max(280, viewport.width - margin * 2));
  const h = Math.min(defaultH, Math.max(200, viewport.height - margin * 2));
  const x = Math.max(margin, viewport.width - w - margin);
  const y = Math.max(margin, viewport.height - h - margin);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function calculatePipResize(
  start: PipRect,
  handle: PipResizeHandle,
  dx: number,
  dy: number,
  viewport: ViewportSize,
  constraints: PipConstraints = DEFAULT_PIP_CONSTRAINTS
): PipRect {
  let { x, y, w, h } = start;
  const { minW, minH, maxW, maxH, margin } = constraints;

  const effectiveMaxW = Math.min(maxW, Math.max(minW, viewport.width - margin * 2));
  const effectiveMaxH = Math.min(maxH, Math.max(minH, viewport.height - margin * 2));

  // Horizontal axis resizing
  if (handle.includes('w')) {
    const r = start.x + start.w;
    const minAllowedX = Math.max(margin, r - effectiveMaxW);
    const maxAllowedX = r - minW;
    x = Math.max(minAllowedX, Math.min(maxAllowedX, start.x + dx));
    w = r - x;
  } else if (handle.includes('e')) {
    const rawW = start.w + dx;
    const maxAllowedW = Math.min(effectiveMaxW, viewport.width - start.x - margin);
    w = Math.max(minW, Math.min(maxAllowedW, rawW));
  }

  // Vertical axis resizing
  if (handle.includes('n')) {
    const b = start.y + start.h;
    const minAllowedY = Math.max(margin, b - effectiveMaxH);
    const maxAllowedY = b - minH;
    y = Math.max(minAllowedY, Math.min(maxAllowedY, start.y + dy));
    h = b - y;
  } else if (handle.includes('s')) {
    const rawH = start.h + dy;
    const maxAllowedH = Math.min(effectiveMaxH, viewport.height - start.y - margin);
    h = Math.max(minH, Math.min(maxAllowedH, rawH));
  }

  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function calculatePipDrag(
  start: PipRect,
  dx: number,
  dy: number,
  viewport: ViewportSize,
  constraints: PipConstraints = DEFAULT_PIP_CONSTRAINTS
): PipRect {
  const { margin, snapDistance } = constraints;
  let targetX = start.x + dx;
  let targetY = start.y + dy;

  const minX = margin;
  const maxX = Math.max(margin, viewport.width - start.w - margin);
  const minY = margin;
  const maxY = Math.max(margin, viewport.height - start.h - margin);

  // Magnetic edge snapping
  if (Math.abs(targetX - minX) <= snapDistance) {
    targetX = minX;
  } else if (Math.abs(targetX - maxX) <= snapDistance) {
    targetX = maxX;
  }

  if (Math.abs(targetY - minY) <= snapDistance) {
    targetY = minY;
  } else if (Math.abs(targetY - maxY) <= snapDistance) {
    targetY = maxY;
  }

  const clampedX = Math.max(minX, Math.min(maxX, targetX));
  const clampedY = Math.max(minY, Math.min(maxY, targetY));

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
    w: start.w,
    h: start.h,
  };
}
