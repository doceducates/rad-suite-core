import { describe, it, expect, vi } from 'vitest';
import { findNearestSliceIndexFor3DPoint, project3DPointToPixel, projectPixelTo3DPoint, SeriesGeometryInfo } from '../dicom-3d-point.service';

describe('3D Point Sync Logic', () => {
  describe('Coronal Fallback Logic', () => {
    const coronalGeom: SeriesGeometryInfo = {
      sliceCount: 101,
      orientation: 'CORONAL',
    };

    it('findNearestSliceIndexFor3DPoint calculates Coronal fallback correctly', () => {
      // Y axis goes from anterior to posterior (negative to positive).
      // Synthetic projection maps sliceIndex to Y coordinate:
      // norm = point3D[1] / 150 + 0.5
      
      // If point3D[1] is 0 (middle of Y axis), norm = 0.5. sliceIndex = 0.5 * 100 = 50.
      expect(findNearestSliceIndexFor3DPoint([0, 0, 0], coronalGeom)).toBe(50);
      
      // If point3D[1] is -75 (anterior limit), norm = 0. sliceIndex = 0.
      expect(findNearestSliceIndexFor3DPoint([0, -75, 0], coronalGeom)).toBe(0);
      
      // If point3D[1] is +75 (posterior limit), norm = 1. sliceIndex = 100.
      expect(findNearestSliceIndexFor3DPoint([0, 75, 0], coronalGeom)).toBe(100);
      
      // If out of bounds, should clamp.
      expect(findNearestSliceIndexFor3DPoint([0, 150, 0], coronalGeom)).toBe(100);
      expect(findNearestSliceIndexFor3DPoint([0, -150, 0], coronalGeom)).toBe(0);
    });

    it('project3DPointToPixel maps 3D point to Coronal slice coordinates', () => {
      const sliceGeom = {
        orientation: 'CORONAL' as const,
        sliceIndex: 50,
        totalSlices: 101,
      };
      
      // For sliceIndex=50 out of 101, prog = 50/101 ~ 0.495
      const prog = 50 / 101;
      const sliceY = (prog - 0.5) * 150;
      
      const point: [number, number, number] = [0, sliceY, 0];
      const proj = project3DPointToPixel(point, sliceGeom);
      
      expect(proj).toBeDefined();
      expect(proj!.inBounds).toBe(true);
      // pctX: point[0]/4 + 50 -> 0/4 + 50 = 50
      // pctY: 50 - point[2]/4 -> 50 - 0 = 50
      expect(proj!.pctX).toBe(50);
      expect(proj!.pctY).toBe(50);
      expect(proj!.distMm).toBe(0);
    });
    
    it('projectPixelTo3DPoint maps pixel to Coronal 3D Patient space', () => {
      const sliceGeom = {
        orientation: 'CORONAL' as const,
        sliceIndex: 50,
        totalSlices: 101,
      };
      
      const pt3D = projectPixelTo3DPoint(50, 50, sliceGeom);
      const prog = 50 / 101;
      const expectedY = (prog - 0.5) * 150;
      
      expect(pt3D).toBeDefined();
      expect(pt3D![0]).toBe(0); // (50-50)*4
      expect(pt3D![1]).toBeCloseTo(expectedY, 4);
      expect(pt3D![2]).toBe(0); // (50-50)*4
    });
  });

  describe('Realistic Coordinate Conversion with IPP and IOP', () => {
    it('uses IPP and IOP to locate correct slice', () => {
      const series: SeriesGeometryInfo = {
        sliceCount: 10,
        firstIpp: [0, 0, 0],
        lastIpp: [0, 0, 90], // Z distance of 90 across 10 slices -> 10mm per slice basically
        iop: [1, 0, 0, 0, 1, 0], // Axial
      };
      
      // Point at Z = 45 should map to slice 5 (middle)
      const pt: [number, number, number] = [0, 0, 45];
      const slice = findNearestSliceIndexFor3DPoint(pt, series);
      expect(slice).toBe(5);
    });
  });
});
