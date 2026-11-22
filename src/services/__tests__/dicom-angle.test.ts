import { describe, it, expect } from 'vitest';

function calculateAngleDeg(
  p1: { x: number; y: number },
  v: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - v.x, y: p1.y - v.y };
  const v2 = { x: p2.x - v.x, y: p2.y - v.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Number(((Math.acos(cos) * 180) / Math.PI).toFixed(1));
}

describe('DICOM Angle & Cobb Angle Calculation Suite', () => {
  it('correctly calculates a 90 degree right angle', () => {
    const p1 = { x: 0, y: 100 };
    const vertex = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };

    const angle = calculateAngleDeg(p1, vertex, p2);
    expect(angle).toBe(90.0);
  });

  it('correctly calculates a 45 degree oblique angle', () => {
    const p1 = { x: 100, y: 0 };
    const vertex = { x: 0, y: 0 };
    const p2 = { x: 100, y: 100 };

    const angle = calculateAngleDeg(p1, vertex, p2);
    expect(angle).toBe(45.0);
  });

  it('correctly calculates clinical spinal Cobb curvature angles', () => {
    // Endplate 1 ray: (10, 50) -> vertex at (100, 100)
    // Endplate 2 ray: (180, 75)
    const p1 = { x: 10, y: 50 };
    const vertex = { x: 100, y: 100 };
    const p2 = { x: 180, y: 75 };

    const angle = calculateAngleDeg(p1, vertex, p2);
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(180);
    // Vector 1: (-90, -50), Vector 2: (80, -25)
    // Dot: -90*80 + -50*-25 = -7200 + 1250 = -5950
    // Mag1: sqrt(8100 + 2500) = sqrt(10600) = 102.956
    // Mag2: sqrt(6400 + 625) = sqrt(7025) = 83.815
    // cos = -5950 / (102.956 * 83.815) = -5950 / 8629.28 = -0.6895
    // acos(-0.6895) = 133.6°
    expect(angle).toBe(133.6);
  });

  it('returns 0 when points are degenerate (zero-length vector)', () => {
    const p1 = { x: 50, y: 50 };
    const vertex = { x: 50, y: 50 };
    const p2 = { x: 100, y: 100 };

    const angle = calculateAngleDeg(p1, vertex, p2);
    expect(angle).toBe(0);
  });

  it('correctly calculates a 180 degree straight line', () => {
    const p1 = { x: -100, y: 0 };
    const vertex = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };

    const angle = calculateAngleDeg(p1, vertex, p2);
    expect(angle).toBe(180.0);
  });
});
