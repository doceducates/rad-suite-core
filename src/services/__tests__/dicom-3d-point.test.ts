import { describe, it, expect } from 'vitest';
import {
  projectPixelTo3DPoint,
  project3DPointToPixel,
  findNearestSliceIndexFor3DPoint,
  SeriesGeometryInfo,
} from '../dicom-3d-point.service';
import { SliceGeometry } from '../dicom-geometry.service';

describe('DICOM 3D Crosshair Coordinate Math', () => {
  // Real patient geometry from ASGHARI_BB
  const sagittalGeom: SliceGeometry = {
    seriesNumber: '3',
    seriesDescription: 'SG T2',
    orientation: 'SAGITTAL',
    sliceIndex: 8,
    totalSlices: 17,
    imagePositionPatient: [36.09999847, -112.8897171, 188.4880249],
    imageOrientationPatient: [0, 1, 0, -0.07006019, 0, -0.99754274],
    pixelSpacing: [0.625, 0.625],
    rows: 624,
    columns: 480,
  };

  const axialSeriesInfo: SeriesGeometryInfo = {
    sliceCount: 19,
    orientation: 'AXIAL',
    firstIpp: [-81.51394653, -34.99504089, 3.98603559],
    lastIpp: [-90.69731903, -21.07808304, -126.76954651],
    iop: [0.99754274, 0, -0.07006017, 0.00436122, 0.99806058, 0.06209693],
  };

  const sagittalSeriesInfo: SeriesGeometryInfo = {
    sliceCount: 17,
    orientation: 'SAGITTAL',
    firstIpp: [0.98717958, -112.8897171, 190.94587708],
    lastIpp: [71.21419525, -112.8897171, 186.01365662],
    iop: [0, 1, 0, -0.07006019, 0, -0.99754274],
  };

  it('performs exact 2D -> 3D -> 2D round-trip projection', () => {
    const origPctX = 45.5;
    const origPctY = 62.0;

    const pt3D = projectPixelTo3DPoint(origPctX, origPctY, sagittalGeom);
    expect(pt3D).not.toBeNull();
    // Accounting for IOP tilt [-0.07006, 0, -0.9975] along Y: 36.1 - 0.07006 * 241.8 = 19.16
    expect(pt3D![0]).toBeCloseTo(19.16, 1);

    const projected = project3DPointToPixel(pt3D!, sagittalGeom);
    expect(projected).not.toBeNull();
    expect(projected!.pctX).toBeCloseTo(origPctX, 2);
    expect(projected!.pctY).toBeCloseTo(origPctY, 2);
    expect(projected!.distMm).toBeCloseTo(0, 3);
    expect(projected!.inBounds).toBe(true);
  });

  it('maps 3D point on Sagittal spine to correct Axial slice index', () => {
    // Clicking on mid-lumbar spine (around 65% down the sagittal view)
    const pt3D = projectPixelTo3DPoint(50, 65, sagittalGeom);
    expect(pt3D).not.toBeNull();

    const axialSlice = findNearestSliceIndexFor3DPoint(pt3D!, axialSeriesInfo);
    // Should be in mid-to-lower lumbar spine (slice 8 to 14 out of 19)
    expect(axialSlice).toBeGreaterThanOrEqual(8);
    expect(axialSlice).toBeLessThanOrEqual(14);
  });

  it('maps 3D point on Axial spine to correct Sagittal slice index', () => {
    const axialGeom: SliceGeometry = {
      seriesNumber: '6',
      seriesDescription: 'AX T2',
      orientation: 'AXIAL',
      sliceIndex: 10,
      totalSlices: 19,
      imagePositionPatient: [-85.53260803, -35.16906357, -53.23256683],
      imageOrientationPatient: [0.99754274, 0, -0.07006019, 0.0047075, 0.99774003, 0.06702717],
      pixelSpacing: [0.4464, 0.4464],
      rows: 448,
      columns: 448,
    };

    // Vertebral canal / spine midline is at ~61% across the axial image (X ~ 36mm)
    const pt3D = projectPixelTo3DPoint(61, 50, axialGeom);
    expect(pt3D).not.toBeNull();

    const sagSlice = findNearestSliceIndexFor3DPoint(pt3D!, sagittalSeriesInfo);
    // At L4 (Z = -53mm), the 4-degree oblique tilt puts the point on Sagittal slice 12 (dist 0.6mm)
    expect(sagSlice).toBe(12);
  });

  it('handles fallback navigation gracefully for synthetic cases', () => {
    const syntheticSeries: SeriesGeometryInfo = {
      sliceCount: 20,
      orientation: 'AXIAL',
    };
    const pt3D: [number, number, number] = [0, 0, 0];
    const slice = findNearestSliceIndexFor3DPoint(pt3D, syntheticSeries);
    expect(slice).toBe(10);
  });
});
