import { SliceGeometry } from './dicom-geometry.service';

/**
 * 3D Anatomical Point & Crosshair Coordinate Calculations
 * Compliant with DICOM Part 3 Section C.7.6.2 (Image Plane Module)
 */

const cross = (a: number[], b: number[]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const dot = (a: number[], b: number[]): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export interface Point3DProjection {
  pctX: number;
  pctY: number;
  distMm: number;
  inBounds: boolean;
}

export interface SeriesGeometryInfo {
  sliceCount: number;
  orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  firstIpp?: [number, number, number];
  lastIpp?: [number, number, number];
  iop?: number[];
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
}

/**
 * Projects a 2D percentage coordinate (0..100) on a slice into 3D Patient Space (LPS mm).
 */
export function projectPixelTo3DPoint(
  pctX: number,
  pctY: number,
  geom: SliceGeometry
): [number, number, number] | null {
  if (
    geom.imagePositionPatient &&
    geom.imageOrientationPatient &&
    geom.imageOrientationPatient.length >= 6
  ) {
    const s0 = geom.imagePositionPatient;
    const u = [geom.imageOrientationPatient[0], geom.imageOrientationPatient[1], geom.imageOrientationPatient[2]];
    const v = [geom.imageOrientationPatient[3], geom.imageOrientationPatient[4], geom.imageOrientationPatient[5]];
    const sp = geom.pixelSpacing || [0.65, 0.65];
    const w = (geom.columns || 512) * sp[1];
    const h = (geom.rows || 512) * sp[0];

    const dx = (Math.max(0, Math.min(100, pctX)) / 100) * w;
    const dy = (Math.max(0, Math.min(100, pctY)) / 100) * h;

    return [
      s0[0] + u[0] * dx + v[0] * dy,
      s0[1] + u[1] * dx + v[1] * dy,
      s0[2] + u[2] * dx + v[2] * dy,
    ];
  }

  // Fallback for synthetic/uncalibrated series
  const orient = geom.orientation || 'AXIAL';
  const sl = geom.sliceIndex;
  const tot = Math.max(1, geom.totalSlices);
  const prog = sl / tot;

  if (orient === 'AXIAL') {
    return [(pctX - 50) * 4, (pctY - 50) * 4, (0.5 - prog) * 300];
  } else if (orient === 'SAGITTAL') {
    return [(prog - 0.5) * 150, (pctX - 50) * 4, (50 - pctY) * 4];
  } else {
    return [(pctX - 50) * 4, (prog - 0.5) * 150, (50 - pctY) * 4];
  }
}

/**
 * Projects a 3D Patient point (LPS mm) onto a slice geometry to get in-plane (pctX, pctY).
 */
export function project3DPointToPixel(
  point3D: [number, number, number],
  geom: SliceGeometry
): Point3DProjection | null {
  if (
    geom.imagePositionPatient &&
    geom.imageOrientationPatient &&
    geom.imageOrientationPatient.length >= 6
  ) {
    const s0 = geom.imagePositionPatient;
    const u = [geom.imageOrientationPatient[0], geom.imageOrientationPatient[1], geom.imageOrientationPatient[2]];
    const v = [geom.imageOrientationPatient[3], geom.imageOrientationPatient[4], geom.imageOrientationPatient[5]];
    const n = cross(u, v);
    const sp = geom.pixelSpacing || [0.65, 0.65];
    const w = (geom.columns || 512) * sp[1];
    const h = (geom.rows || 512) * sp[0];

    const diff = [point3D[0] - s0[0], point3D[1] - s0[1], point3D[2] - s0[2]];
    const distMm = dot(diff, n);
    const xMm = dot(diff, u);
    const yMm = dot(diff, v);

    const pctX = (xMm / w) * 100;
    const pctY = (yMm / h) * 100;
    const inBounds = pctX >= 0 && pctX <= 100 && pctY >= 0 && pctY <= 100;

    return { pctX, pctY, distMm, inBounds };
  }

  // Fallback for synthetic/uncalibrated series
  const orient = geom.orientation || 'AXIAL';
  const sl = geom.sliceIndex;
  const tot = Math.max(1, geom.totalSlices);
  const prog = sl / tot;

  if (orient === 'AXIAL') {
    const sliceZ = (0.5 - prog) * 300;
    return {
      pctX: point3D[0] / 4 + 50,
      pctY: point3D[1] / 4 + 50,
      distMm: Math.abs(point3D[2] - sliceZ),
      inBounds: true,
    };
  } else if (orient === 'SAGITTAL') {
    const sliceX = (prog - 0.5) * 150;
    return {
      pctX: point3D[1] / 4 + 50,
      pctY: 50 - point3D[2] / 4,
      distMm: Math.abs(point3D[0] - sliceX),
      inBounds: true,
    };
  } else if (orient === 'CORONAL') {
    const sliceY = (prog - 0.5) * 150;
    return {
      pctX: point3D[0] / 4 + 50,
      pctY: 50 - point3D[2] / 4,
      distMm: Math.abs(point3D[1] - sliceY),
      inBounds: true,
    };
  }
  return null;
}

/**
 * Finds the nearest slice index in a series for a given 3D anatomical point.
 */
export function findNearestSliceIndexFor3DPoint(
  point3D: [number, number, number],
  series: SeriesGeometryInfo
): number {
  const { sliceCount, firstIpp, lastIpp, iop } = series;
  if (sliceCount <= 1) return 0;

  if (firstIpp && lastIpp && iop && iop.length >= 6) {
    const u = [iop[0], iop[1], iop[2]];
    const v = [iop[3], iop[4], iop[5]];
    const n = cross(u, v);
    const nLen = Math.sqrt(dot(n, n));
    if (nLen > 1e-6) {
      const nUnit: [number, number, number] = [n[0] / nLen, n[1] / nLen, n[2] / nLen];
      const seriesSpan = dot([lastIpp[0] - firstIpp[0], lastIpp[1] - firstIpp[1], lastIpp[2] - firstIpp[2]], nUnit);
      if (Math.abs(seriesSpan) > 1e-6) {
        const pSpan = dot([point3D[0] - firstIpp[0], point3D[1] - firstIpp[1], point3D[2] - firstIpp[2]], nUnit);
        const t = pSpan / seriesSpan;
        return Math.max(0, Math.min(sliceCount - 1, Math.round(t * (sliceCount - 1))));
      }
    }
  }

  // Fallback using orientation progress
  const orient = series.orientation || 'AXIAL';
  if (orient === 'AXIAL') {
    // Z axis goes superior (+) to inferior (-)
    const norm = Math.max(0, Math.min(1, 0.5 - point3D[2] / 300));
    return Math.max(0, Math.min(sliceCount - 1, Math.round(norm * (sliceCount - 1))));
  } else if (orient === 'SAGITTAL') {
    // X axis goes right (-) to left (+)
    const norm = Math.max(0, Math.min(1, point3D[0] / 150 + 0.5));
    return Math.max(0, Math.min(sliceCount - 1, Math.round(norm * (sliceCount - 1))));
  } else if (orient === 'CORONAL') {
    // Y axis goes anterior (-) to posterior (+)
    const norm = Math.max(0, Math.min(1, point3D[1] / 150 + 0.5));
    return Math.max(0, Math.min(sliceCount - 1, Math.round(norm * (sliceCount - 1))));
  }
  return 0;
}
