/**
 * Vitrea-grade MPR Tri-Planar Reslicing Engine (<300 lines).
 * Reconstructs Axial, Coronal, and Sagittal orthogonal planes with true
 * physical millimeter-ratio square pixel resampling, matching Vitrea standards.
 */

import type { DicomVolumeData } from './dicom-volume-builder.service';

export interface OrthogonalSliceImage {
  width: number;
  height: number;
  rgbaData: Uint8ClampedArray;
}

export interface MprPlaneDimensions {
  axialW: number;
  axialH: number;
  coronalW: number;
  coronalH: number;
  sagittalW: number;
  sagittalH: number;
}

export function computeMprPlaneDimensions(volume: DicomVolumeData): MprPlaneDimensions {
  const { width, height, depth } = volume;
  const dx = volume.spacing?.[0] || 1.0;
  const dy = volume.spacing?.[1] || 1.0;
  const dz = volume.spacing?.[2] || 1.0;

  let ref = Math.min(dx, dy, dz);
  if (ref <= 0) ref = 1.0;
  const longest = Math.max(depth * dz, height * dy, width * dx);
  if (longest / ref > 1024) {
    ref = longest / 1024;
  }

  return {
    axialW: Math.max(1, Math.round((width * dx) / ref)),
    axialH: Math.max(1, Math.round((height * dy) / ref)),
    coronalW: Math.max(1, Math.round((width * dx) / ref)),
    coronalH: Math.max(1, Math.round((depth * dz) / ref)),
    sagittalW: Math.max(1, Math.round((height * dy) / ref)),
    sagittalH: Math.max(1, Math.round((depth * dz) / ref)),
  };
}

/**
 * Extracts an Axial (X-Y) slice at specified Z index.
 */
export function extractAxialSlice(volume: DicomVolumeData, zIndex: number): OrthogonalSliceImage {
  const { width, height, depth, data } = volume;
  const z = Math.max(0, Math.min(depth - 1, Math.round(zIndex)));
  const sliceSize = width * height;
  const rgbaData = new Uint8ClampedArray(sliceSize * 4);
  const zOffset = z * sliceSize;

  for (let i = 0; i < sliceSize; i++) {
    const val = data[zOffset + i];
    const idx = i * 4;
    rgbaData[idx] = val;
    rgbaData[idx + 1] = val;
    rgbaData[idx + 2] = val;
    rgbaData[idx + 3] = 255;
  }

  return { width, height, rgbaData };
}

/**
 * Extracts a Coronal (X-Z) slice at specified Y index with true millimeter aspect ratio.
 */
export function extractCoronalSlice(volume: DicomVolumeData, yIndex: number): OrthogonalSliceImage {
  const { width, height, depth, data } = volume;
  const y = Math.max(0, Math.min(height - 1, Math.round(yIndex)));
  const dims = computeMprPlaneDimensions(volume);
  const outW = dims.coronalW;
  const outH = dims.coronalH;
  const rgbaData = new Uint8ClampedArray(outW * outH * 4);
  const wh = width * height;

  for (let dstY = 0; dstY < outH; dstY++) {
    // Invert Z display so head (high Z) is at the top
    const srcZ = depth > 1 ? (depth - 1) - (dstY * (depth - 1)) / Math.max(1, outH - 1) : 0;
    const z0 = Math.floor(srcZ);
    const z1 = Math.min(depth - 1, z0 + 1);
    const fz = srcZ - z0;
    const rowOffset = dstY * outW * 4;

    for (let dstX = 0; dstX < outW; dstX++) {
      const srcX = (dstX * (width - 1)) / Math.max(1, outW - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(width - 1, x0 + 1);
      const fx = srcX - x0;

      const v00 = data[z0 * wh + y * width + x0];
      const v01 = data[z0 * wh + y * width + x1];
      const v10 = data[z1 * wh + y * width + x0];
      const v11 = data[z1 * wh + y * width + x1];

      const val0 = v00 * (1 - fx) + v01 * fx;
      const val1 = v10 * (1 - fx) + v11 * fx;
      const val = Math.round(val0 * (1 - fz) + val1 * fz);

      const idx = rowOffset + dstX * 4;
      rgbaData[idx] = val;
      rgbaData[idx + 1] = val;
      rgbaData[idx + 2] = val;
      rgbaData[idx + 3] = 255;
    }
  }

  return { width: outW, height: outH, rgbaData };
}

/**
 * Extracts a Sagittal (Y-Z) slice at specified X index with true millimeter aspect ratio.
 */
export function extractSagittalSlice(volume: DicomVolumeData, xIndex: number): OrthogonalSliceImage {
  const { width, height, depth, data } = volume;
  const x = Math.max(0, Math.min(width - 1, Math.round(xIndex)));
  const dims = computeMprPlaneDimensions(volume);
  const outW = dims.sagittalW;
  const outH = dims.sagittalH;
  const rgbaData = new Uint8ClampedArray(outW * outH * 4);
  const wh = width * height;

  for (let dstY = 0; dstY < outH; dstY++) {
    // Invert Z display so head (high Z) is at the top
    const srcZ = depth > 1 ? (depth - 1) - (dstY * (depth - 1)) / Math.max(1, outH - 1) : 0;
    const z0 = Math.floor(srcZ);
    const z1 = Math.min(depth - 1, z0 + 1);
    const fz = srcZ - z0;
    const rowOffset = dstY * outW * 4;

    for (let dstX = 0; dstX < outW; dstX++) {
      const srcY = (dstX * (height - 1)) / Math.max(1, outW - 1);
      const y0 = Math.floor(srcY);
      const y1 = Math.min(height - 1, y0 + 1);
      const fy = srcY - y0;

      const v00 = data[z0 * wh + y0 * width + x];
      const v01 = data[z0 * wh + y1 * width + x];
      const v10 = data[z1 * wh + y0 * width + x];
      const v11 = data[z1 * wh + y1 * width + x];

      const val0 = v00 * (1 - fy) + v01 * fy;
      const val1 = v10 * (1 - fy) + v11 * fy;
      const val = Math.round(val0 * (1 - fz) + val1 * fz);

      const idx = rowOffset + dstX * 4;
      rgbaData[idx] = val;
      rgbaData[idx + 1] = val;
      rgbaData[idx + 2] = val;
      rgbaData[idx + 3] = 255;
    }
  }

  return { width: outW, height: outH, rgbaData };
}
