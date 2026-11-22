import * as THREE from 'three';
import type { ParsedDicomFile } from './dicom-loader.service';

export interface DicomVolumeData {
  width: number;
  height: number;
  depth: number;
  data: Uint8Array;
  raw16Data?: Int16Array | Uint16Array;
  texture: THREE.Data3DTexture;
  aspect: [number, number, number];
  spacing: [number, number, number];
  minVal: number;
  maxVal: number;
}

export interface VolumeBuildOptions {
  width: number;
  height: number;
  depth: number;
  slices: (ParsedDicomFile | null)[];
  pixelSpacing?: [number, number];
  sliceThickness?: number;
}

/**
 * Builds a hardware-accelerated 3D Volume Texture from DICOM series slice buffers.
 * Normalizes physical patient aspect ratio and equips texture with linear trilinear filtering.
 */
export function buildDicomVolumeData({
  width,
  height,
  depth,
  slices,
  pixelSpacing = [1.0, 1.0],
  sliceThickness = 1.0,
}: VolumeBuildOptions): DicomVolumeData {
  const voxelCount = width * height * depth;
  const data = new Uint8Array(voxelCount);

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let z = 0; z < depth; z++) {
    const s = slices[z];
    if (s?.pixelData) {
      const len = Math.min(width * height, s.pixelData.length);
      for (let i = 0; i < len; i++) {
        const v = s.pixelData[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
  }

  if (minVal === Infinity) minVal = 0;
  if (maxVal === -Infinity || maxVal === minVal) maxVal = minVal + 1;
  const range = maxVal - minVal;

  for (let z = 0; z < depth; z++) {
    const s = slices[z];
    const zOffset = z * width * height;
    if (s?.pixelData) {
      const len = Math.min(width * height, s.pixelData.length);
      for (let i = 0; i < len; i++) {
        const normalized = Math.round(((s.pixelData[i] - minVal) / range) * 255);
        data[zOffset + i] = Math.max(0, Math.min(255, normalized));
      }
    }
  }

  const texture = new THREE.Data3DTexture(data, width, height, depth);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  const physX = width * (pixelSpacing[0] || 1.0);
  const physY = height * (pixelSpacing[1] || 1.0);
  const physZ = depth * (sliceThickness || 1.0);
  const maxDim = Math.max(physX, physY, physZ) || 1.0;

  const aspect: [number, number, number] = [
    Number((physX / maxDim).toFixed(3)),
    Number((physY / maxDim).toFixed(3)),
    Number((physZ / maxDim).toFixed(3)),
  ];

  const spacing: [number, number, number] = [
    pixelSpacing[0] || 1.0,
    pixelSpacing[1] || 1.0,
    sliceThickness || 1.0,
  ];

  return {
    width,
    height,
    depth,
    data,
    texture,
    aspect,
    spacing,
    minVal,
    maxVal,
  };
}
