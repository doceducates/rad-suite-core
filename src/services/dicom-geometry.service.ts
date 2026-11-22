/**
 * DICOM 3D Slice Plane & Scout / Localizer Cross-Reference Geometry Service
 * Compliant with DICOM Part 3 Section C.7.6.2 (Image Plane Module)
 */

export interface SliceGeometry {
  seriesDescription?: string;
  seriesNumber?: string | number;
  orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceIndex: number;
  totalSlices: number;
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: number[];
  pixelSpacing?: [number, number];
  rows?: number;
  columns?: number;
}

export interface ProjectedScoutLine {
  id: string;
  sourceSeriesNumber: string | number;
  sourceSeriesDescription: string;
  sourceSliceIndex: number;
  sourceTotalSlices: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

const crossProduct = (a: number[], b: number[]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];

const dotProduct = (a: number[], b: number[]): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function computeScoutIntersection(
  source: SliceGeometry,
  target: SliceGeometry
): ProjectedScoutLine | null {
  // Do not compute scout line between coplanar slices
  if (areCoplanar(source, target)) {
    return null;
  }

  const label = `${source.orientation || 'LOC'} (SL ${source.sliceIndex + 1}/${source.totalSlices})`;
  const id = `scout-${source.seriesNumber}-${source.sliceIndex}`;

  // If real 3D DICOM geometry tags are present, compute exact mathematical plane intersection
  if (
    source.imagePositionPatient &&
    source.imageOrientationPatient &&
    source.imageOrientationPatient.length >= 6 &&
    target.imagePositionPatient &&
    target.imageOrientationPatient &&
    target.imageOrientationPatient.length >= 6 &&
    target.rows && target.columns &&
    target.pixelSpacing
  ) {
    const uT = [target.imageOrientationPatient[0], target.imageOrientationPatient[1], target.imageOrientationPatient[2]];
    const vT = [target.imageOrientationPatient[3], target.imageOrientationPatient[4], target.imageOrientationPatient[5]];
    const nT = crossProduct(uT, vT);

    const uS = [source.imageOrientationPatient[0], source.imageOrientationPatient[1], source.imageOrientationPatient[2]];
    const vS = [source.imageOrientationPatient[3], source.imageOrientationPatient[4], source.imageOrientationPatient[5]];
    const spS = source.pixelSpacing || [0.65, 0.65];
    const wS = (source.columns || 512) * spS[1];
    const hS = (source.rows || 512) * spS[0];

    const s0 = source.imagePositionPatient;
    const c1 = [s0[0], s0[1], s0[2]];
    const c2 = [c1[0] + uS[0] * wS, c1[1] + uS[1] * wS, c1[2] + uS[2] * wS];
    const c3 = [c2[0] + vS[0] * hS, c2[1] + vS[1] * hS, c2[2] + vS[2] * hS];
    const c4 = [c1[0] + vS[0] * hS, c1[1] + vS[1] * hS, c1[2] + vS[2] * hS];

    const edges = [[c1, c2], [c2, c3], [c3, c4], [c4, c1]];
    const t0 = target.imagePositionPatient;
    const intersections: number[][] = [];

    for (const [p1, p2] of edges) {
      const d = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
      const denom = dotProduct(nT, d);
      if (Math.abs(denom) > 1e-6) {
        const num = dotProduct(nT, [t0[0] - p1[0], t0[1] - p1[1], t0[2] - p1[2]]);
        const t = num / denom;
        if (t >= 0 && t <= 1) {
          intersections.push([p1[0] + t * d[0], p1[1] + t * d[1], p1[2] + t * d[2]]);
        }
      }
    }

    if (intersections.length >= 2) {
      const spT = target.pixelSpacing;
      const pts = intersections.map((q) => {
        const diff = [q[0] - t0[0], q[1] - t0[1], q[2] - t0[2]];
        const xPx = dotProduct(diff, uT) / spT[1];
        const yPx = dotProduct(diff, vT) / spT[0];
        return {
          x: (xPx / (target.columns || 512)) * 100,
          y: (yPx / (target.rows || 512)) * 100,
        };
      });

      return {
        id,
        sourceSeriesNumber: source.seriesNumber || 1,
        sourceSeriesDescription: source.seriesDescription || 'Orthogonal Slice',
        sourceSliceIndex: source.sliceIndex,
        sourceTotalSlices: source.totalSlices,
        x1: Math.max(0, Math.min(100, pts[0].x)),
        y1: Math.max(0, Math.min(100, pts[0].y)),
        x2: Math.max(0, Math.min(100, pts[1].x)),
        y2: Math.max(0, Math.min(100, pts[1].y)),
        label,
      };
    }
  }

  // Robust fallback for synthetic studies or missing 3D header fields
  const p = source.totalSlices > 1 ? source.sliceIndex / (source.totalSlices - 1) : 0.5;
  if ((target.orientation === 'SAGITTAL' || target.orientation === 'CORONAL') && source.orientation === 'AXIAL') {
    const y = 25 + p * 55;
    return {
      id,
      sourceSeriesNumber: source.seriesNumber || 1,
      sourceSeriesDescription: source.seriesDescription || 'Axial Slice',
      sourceSliceIndex: source.sliceIndex,
      sourceTotalSlices: source.totalSlices,
      x1: 15, y1: y, x2: 85, y2: y,
      label,
    };
  }

  if (target.orientation === 'AXIAL' && (source.orientation === 'SAGITTAL' || source.orientation === 'CORONAL')) {
    const x = 20 + p * 60;
    return {
      id,
      sourceSeriesNumber: source.seriesNumber || 1,
      sourceSeriesDescription: source.seriesDescription || 'Sagittal Slice',
      sourceSliceIndex: source.sliceIndex,
      sourceTotalSlices: source.totalSlices,
      x1: x, y1: 15, x2: x, y2: 85,
      label,
    };
  }

  return null;
}

/**
 * Determines whether two slice geometries are coplanar (same general orientation plane).
 * Prioritizes 3D slice normal dot product (dihedral angle < 18 deg) over textual tags.
 */
export function areCoplanar(
  a?: { orientation?: string; imageOrientationPatient?: number[] } | null,
  b?: { orientation?: string; imageOrientationPatient?: number[] } | null
): boolean {
  if (!a || !b) return false;
  if (
    a.imageOrientationPatient &&
    b.imageOrientationPatient &&
    a.imageOrientationPatient.length >= 6 &&
    b.imageOrientationPatient.length >= 6
  ) {
    const na = crossProduct(a.imageOrientationPatient.slice(0, 3), a.imageOrientationPatient.slice(3, 6));
    const nb = crossProduct(b.imageOrientationPatient.slice(0, 3), b.imageOrientationPatient.slice(3, 6));
    return Math.abs(dotProduct(na, nb)) >= 0.95;
  }
  if (a.orientation && b.orientation) {
    return a.orientation.toUpperCase() === b.orientation.toUpperCase();
  }
  return false;
}

/**
 * Computes anatomical orientation from DICOM Image Orientation Patient (0020,0037).
 * Compares the normal vector components |Nx| (Sagittal), |Ny| (Coronal), |Nz| (Axial).
 */
export function getOrientationFromIop(
  iop?: number[]
): 'AXIAL' | 'SAGITTAL' | 'CORONAL' | undefined {
  if (!iop || iop.length < 6) return undefined;
  const n = crossProduct(iop.slice(0, 3), iop.slice(3, 6));
  const ax = Math.abs(n[0]);
  const ay = Math.abs(n[1]);
  const az = Math.abs(n[2]);
  if (ax > ay && ax > az) return 'SAGITTAL';
  if (ay > ax && ay > az) return 'CORONAL';
  return 'AXIAL';
}

/**
 * Fallback orientation detector from series description string.
 * Supports clinical acronyms like SG, AX, CO, COR, SAG, etc.
 */
export function detectOrientationFromDescription(
  desc?: string
): 'AXIAL' | 'SAGITTAL' | 'CORONAL' {
  if (!desc) return 'AXIAL';
  const c = desc.trim().toUpperCase();
  if (/(^|[\s_/-])(SAG|SG|SAGITTAL)($|[\s_/-0-9])/.test(c) || c.includes('LOC SG')) return 'SAGITTAL';
  if (/(^|[\s_/-])(COR|CO|CORONAL)($|[\s_/-0-9])/.test(c) || c.includes('LOC CO')) return 'CORONAL';
  return 'AXIAL';
}

/**
 * Calculates the synchronized slice index for a coplanar target series based on the source slice.
 */
export function computeCoplanarSliceIndex(
  sourceSliceIndex: number,
  sourceTotalSlices: number,
  targetTotalSlices: number
): number {
  if (sourceTotalSlices <= 1 || targetTotalSlices <= 1) return 0;
  const ratio = Math.max(0, Math.min(1, sourceSliceIndex / (sourceTotalSlices - 1)));
  return Math.max(0, Math.min(targetTotalSlices - 1, Math.round(ratio * (targetTotalSlices - 1))));
}

export interface ViewportOrientationMarkers {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export function getDirectionLetter(vector: [number, number, number]): string {
  const [x, y, z] = vector;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);

  if (absX >= absY && absX >= absZ) {
    return x > 0 ? 'L' : 'R';
  } else if (absY >= absX && absY >= absZ) {
    return y > 0 ? 'P' : 'A';
  } else {
    return z > 0 ? 'S' : 'I';
  }
}

/**
 * Computes anatomical orientation labels (A/P, S/I, R/L) for all 4 viewport edges.
 * Follows standard DICOM patient coordinate conventions (LPS) with robust text fallback.
 */
export function getOrientationMarkers(
  orientation?: string,
  iop?: number[]
): ViewportOrientationMarkers {
  if (iop && iop.length >= 6) {
    const rx = iop[0], ry = iop[1], rz = iop[2];
    const cx = iop[3], cy = iop[4], cz = iop[5];
    return {
      right: getDirectionLetter([rx, ry, rz]),
      left: getDirectionLetter([-rx, -ry, -rz]),
      bottom: getDirectionLetter([cx, cy, cz]),
      top: getDirectionLetter([-cx, -cy, -cz]),
    };
  }

  const norm = (orientation || '').toUpperCase().trim();
  if (norm.includes('SAG')) {
    return { top: 'S', bottom: 'I', left: 'A', right: 'P' };
  }
  if (norm.includes('COR')) {
    return { top: 'S', bottom: 'I', left: 'R', right: 'L' };
  }
  return { top: 'A', bottom: 'P', left: 'R', right: 'L' };
}
