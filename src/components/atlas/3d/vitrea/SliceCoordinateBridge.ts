import type { ClippingAxis } from '../state/atlasStore';

export interface AnatomicalBounds {
  minMm: number;
  maxMm: number;
  axis: ClippingAxis;
}

export const DEFAULT_ANATOMICAL_BOUNDS: Record<ClippingAxis, AnatomicalBounds> = {
  axial: { minMm: -900, maxMm: 850, axis: 'axial' }, // Superior-Inferior (Head to Feet)
  sagittal: { minMm: -250, maxMm: 250, axis: 'sagittal' }, // Right-Left (Lateral)
  coronal: { minMm: -200, maxMm: 200, axis: 'coronal' }, // Anterior-Posterior
};

export class SliceCoordinateBridge {
  /**
   * Converts a DICOM slice index to anatomical 3D millimeter offset
   */
  static sliceIndexToMillimeter(
    sliceIndex: number,
    totalSlices: number,
    axis: ClippingAxis = 'axial',
    customBounds?: AnatomicalBounds
  ): number {
    if (totalSlices <= 1) return 0;
    const bounds = customBounds ?? DEFAULT_ANATOMICAL_BOUNDS[axis];
    const normalized = Math.max(0, Math.min(1, sliceIndex / (totalSlices - 1)));

    // Axial DICOM: Slice 0 is typically superior (head), last slice is inferior (feet)
    if (axis === 'axial') {
      return bounds.maxMm - normalized * (bounds.maxMm - bounds.minMm);
    }
    // Sagittal & Coronal standard mapping
    return bounds.minMm + normalized * (bounds.maxMm - bounds.minMm);
  }

  /**
   * Converts a 3D anatomical millimeter position to the closest DICOM slice index
   */
  static millimeterToSliceIndex(
    offsetMm: number,
    totalSlices: number,
    axis: ClippingAxis = 'axial',
    customBounds?: AnatomicalBounds
  ): number {
    if (totalSlices <= 1) return 0;
    const bounds = customBounds ?? DEFAULT_ANATOMICAL_BOUNDS[axis];
    let normalized = 0;

    if (axis === 'axial') {
      normalized = (bounds.maxMm - offsetMm) / (bounds.maxMm - bounds.minMm);
    } else {
      normalized = (offsetMm - bounds.minMm) / (bounds.maxMm - bounds.minMm);
    }

    const clamped = Math.max(0, Math.min(1, normalized));
    return Math.round(clamped * (totalSlices - 1));
  }
}
