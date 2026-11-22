import { describe, it, expect } from 'vitest';
import {
  buildVtkColorLut,
  getColormapCssGradient,
  VTK_COLORMAPS,
} from '../vtk-colormaps.service';
import { calculateCobbAngleDeg } from '@/components/workstation/zen-cobb-angle-overlay';

describe('OHIF / vtk.js Colormap & Cobb Angle Test Suite', () => {
  it('generates a 256-sample RGBA lookup table (1024 bytes)', () => {
    const lut = buildVtkColorLut('grayscale', 256);
    expect(lut.length).toBe(1024);
    // At index 0 (black): R=0, G=0, B=0, A=255
    expect(lut[0]).toBe(0);
    expect(lut[1]).toBe(0);
    expect(lut[2]).toBe(0);
    expect(lut[3]).toBe(255);

    // At index 255 (white): R=255, G=255, B=255, A=255
    const lastOffset = 255 * 4;
    expect(lut[lastOffset]).toBe(255);
    expect(lut[lastOffset + 1]).toBe(255);
    expect(lut[lastOffset + 2]).toBe(255);
    expect(lut[lastOffset + 3]).toBe(255);
  });

  it('correctly maps inverted grayscale LUT values', () => {
    const lut = buildVtkColorLut('inverted', 256);
    // Inverted starts at white (255) and ends at black (0)
    expect(lut[0]).toBe(255);
    expect(lut[1]).toBe(255);
    expect(lut[2]).toBe(255);

    const lastOffset = 255 * 4;
    expect(lut[lastOffset]).toBe(0);
    expect(lut[lastOffset + 1]).toBe(0);
    expect(lut[lastOffset + 2]).toBe(0);
  });

  it('generates valid Hot Iron and PET 20-step color transitions', () => {
    const hotIron = buildVtkColorLut('hot_iron', 256);
    expect(hotIron.length).toBe(1024);
    // Midpoint should have high red and moderate green
    const midOffset = 128 * 4;
    expect(hotIron[midOffset]).toBeGreaterThan(150); // Red channel active

    const pet = buildVtkColorLut('pet_20step', 256);
    expect(pet.length).toBe(1024);
  });

  it('generates a valid CSS linear-gradient string for dropdown swatches', () => {
    const gradient = getColormapCssGradient('viridis');
    expect(gradient).toContain('linear-gradient(to right');
    expect(gradient).toContain('rgb(');
  });

  it('calculates 4-point / 2-line Cobb angle accurately', () => {
    // Parallel lines: endplate 1 horizontal, endplate 2 horizontal -> Cobb angle = 0
    const l1p1 = { x: 0, y: 10 };
    const l1p2 = { x: 100, y: 10 };
    const l2p1 = { x: 0, y: 50 };
    const l2p2 = { x: 100, y: 50 };

    const parallelAngle = calculateCobbAngleDeg(l1p1, l1p2, l2p1, l2p2);
    expect(parallelAngle).toBe(0.0);

    // Perpendicular lines -> Cobb angle = 90
    const l3p1 = { x: 50, y: 0 };
    const l3p2 = { x: 50, y: 100 };
    const rightAngle = calculateCobbAngleDeg(l1p1, l1p2, l3p1, l3p2);
    expect(rightAngle).toBe(90.0);

    // 45 degree tilt
    const l4p1 = { x: 0, y: 0 };
    const l4p2 = { x: 100, y: 100 };
    const tiltAngle = calculateCobbAngleDeg(l1p1, l1p2, l4p1, l4p2);
    expect(tiltAngle).toBe(45.0);
  });
});
