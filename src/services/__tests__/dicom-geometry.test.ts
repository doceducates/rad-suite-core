import { describe, it, expect } from 'vitest';
import {
  computeScoutIntersection,
  areCoplanar,
  computeCoplanarSliceIndex,
  getOrientationFromIop,
  detectOrientationFromDescription,
  SliceGeometry,
} from '../dicom-geometry.service';

describe('DICOM 3D Slice Plane & Scout Line Geometry', () => {
  it('computes exact 3D plane intersection between Axial slice and Sagittal spine view', () => {
    // Exact metadata from ASGHARI_BB (IMG-0003-00008 Sagittal T2 & IMG-0006-00010 Axial T2)
    const targetSagittal: SliceGeometry = {
      seriesNumber: '3',
      seriesDescription: 'SG T2',
      orientation: 'SAGITTAL',
      sliceIndex: 7,
      totalSlices: 17,
      imagePositionPatient: [31.71149635, -112.8897171, 188.7880249],
      imageOrientationPatient: [0, 1, 0, -0.07006019, 0, -0.99754274],
      pixelSpacing: [0.625, 0.625],
      rows: 624,
      columns: 480,
    };

    const sourceAxial: SliceGeometry = {
      seriesNumber: '6',
      seriesDescription: 'AX T2',
      orientation: 'AXIAL',
      sliceIndex: 9,
      totalSlices: 19,
      imagePositionPatient: [-85.53260803, -35.16906357, -53.23256683],
      imageOrientationPatient: [0.99754274, 0, -0.07006019, 0.0047075, 0.99774003, 0.06702717],
      pixelSpacing: [0.625, 0.625],
      rows: 448,
      columns: 448,
    };

    const scout = computeScoutIntersection(sourceAxial, targetSagittal);
    expect(scout).not.toBeNull();
    expect(scout?.label).toContain('AXIAL');
    expect(scout?.sourceSliceIndex).toBe(9);

    // Verify intersection coordinates cross the spine view (between 20% and 95% horizontally)
    expect(scout!.x1).toBeGreaterThanOrEqual(15);
    expect(scout!.x2).toBeGreaterThanOrEqual(70);

    // Verify vertical coordinate is around 60% (L4-L5 intervertebral disc level)
    expect(scout!.y1).toBeGreaterThan(50);
    expect(scout!.y1).toBeLessThan(75);
    expect(scout!.y2).toBeGreaterThan(50);
    expect(scout!.y2).toBeLessThan(75);

    // Verify tilted angle across disc space (y1 != y2 due to oblique IOP)
    expect(scout!.y1).not.toBe(scout!.y2);
  });

  it('ignores intersection between two parallel slices of the same orientation', () => {
    const s1: SliceGeometry = {
      seriesNumber: '3',
      orientation: 'SAGITTAL',
      sliceIndex: 2,
      totalSlices: 17,
    };
    const s2: SliceGeometry = {
      seriesNumber: '4',
      orientation: 'SAGITTAL',
      sliceIndex: 5,
      totalSlices: 17,
    };

    const scout = computeScoutIntersection(s1, s2);
    expect(scout).toBeNull();
  });

  it('provides reliable fallback line for synthetic studies without 3D vector headers', () => {
    const sourceAxial: SliceGeometry = {
      seriesNumber: '1',
      orientation: 'AXIAL',
      sliceIndex: 16,
      totalSlices: 32,
    };
    const targetSagittal: SliceGeometry = {
      seriesNumber: '2',
      orientation: 'SAGITTAL',
      sliceIndex: 8,
      totalSlices: 16,
    };

    const scout = computeScoutIntersection(sourceAxial, targetSagittal);
    expect(scout).not.toBeNull();
    expect(scout?.y1).toBeGreaterThanOrEqual(25);
    expect(scout?.y2).toBeLessThanOrEqual(85);
  });

  describe('areCoplanar & Coplanar Synchronization', () => {
    it('correctly identifies matching orientations as coplanar and orthogonal orientations as non-coplanar', () => {
      expect(areCoplanar({ orientation: 'AXIAL' }, { orientation: 'AXIAL' })).toBe(true);
      expect(areCoplanar({ orientation: 'SAGITTAL' }, { orientation: 'SAGITTAL' })).toBe(true);
      expect(areCoplanar({ orientation: 'CORONAL' }, { orientation: 'CORONAL' })).toBe(true);

      // Orthogonal orientations must NOT be coplanar
      expect(areCoplanar({ orientation: 'AXIAL' }, { orientation: 'SAGITTAL' })).toBe(false);
      expect(areCoplanar({ orientation: 'AXIAL' }, { orientation: 'CORONAL' })).toBe(false);
      expect(areCoplanar({ orientation: 'SAGITTAL' }, { orientation: 'CORONAL' })).toBe(false);
    });

    it('evaluates coplanarity using 3D IOP normal vectors when tags differ in case or format', () => {
      // Axial IOP: X = [1, 0, 0], Y = [0, 1, 0] -> N = [0, 0, 1]
      const axialIop = [1, 0, 0, 0, 1, 0];
      // Slightly tilted axial (e.g. 5 degree gantry tilt) -> normal dot product > 0.95
      const tiltedAxialIop = [0.996, 0, 0.087, 0, 1, 0];
      // Sagittal IOP: X = [0, 1, 0], Y = [0, 0, -1] -> N = [-1, 0, 0]
      const sagittalIop = [0, 1, 0, 0, 0, -1];

      expect(areCoplanar({ imageOrientationPatient: axialIop }, { imageOrientationPatient: tiltedAxialIop })).toBe(true);
      expect(areCoplanar({ imageOrientationPatient: axialIop }, { imageOrientationPatient: sagittalIop })).toBe(false);
    });

    it('accurately computes proportional synchronized slice indices for coplanar series', () => {
      // 20 slices -> 40 slices
      expect(computeCoplanarSliceIndex(0, 20, 40)).toBe(0);
      expect(computeCoplanarSliceIndex(19, 20, 40)).toBe(39);
      expect(computeCoplanarSliceIndex(9.5, 20, 40)).toBe(20);

      // Edge cases
      expect(computeCoplanarSliceIndex(0, 1, 10)).toBe(0);
      expect(computeCoplanarSliceIndex(5, 10, 1)).toBe(0);
    });
    it('accurately determines orientation from 3D IOP vectors', () => {
      // Axial: normal along Z
      expect(getOrientationFromIop([1, 0, 0, 0, 1, 0])).toBe('AXIAL');
      // Sagittal: normal along X
      expect(getOrientationFromIop([0, 1, 0, 0, 0, -1])).toBe('SAGITTAL');
      // Coronal: normal along Y
      expect(getOrientationFromIop([1, 0, 0, 0, 0, -1])).toBe('CORONAL');
    });

    it('accurately parses series description abbreviations', () => {
      expect(detectOrientationFromDescription('SG T2')).toBe('SAGITTAL');
      expect(detectOrientationFromDescription('Loc SG')).toBe('SAGITTAL');
      expect(detectOrientationFromDescription('SG T2 STIR')).toBe('SAGITTAL');
      expect(detectOrientationFromDescription('CO T2')).toBe('CORONAL');
      expect(detectOrientationFromDescription('COR T1 C+')).toBe('CORONAL');
      expect(detectOrientationFromDescription('AX T2')).toBe('AXIAL');
      expect(detectOrientationFromDescription('AX FLAIR')).toBe('AXIAL');
    });
  });
});
